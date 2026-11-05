#!/usr/bin/env node
// CIR-04: auditoría solo lectura. No imprime nombres de familias ni ejecuta escrituras SQL.
import { resolve, dirname, sep } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { config } from 'dotenv'
import pg from 'pg'

const usage = 'Desde apps/api: node scripts/cir-04-auditar-relaciones.mjs [--salida private/cir-04/resultado.json]'
function outputPath() {
  const index = process.argv.indexOf('--salida')
  if (index < 0) return null
  const name = process.argv[index + 1]
  if (!name || name.startsWith('--')) throw new Error('Debes indicar la ruta privada de salida.')
  const root = resolve('private', 'cir-04')
  const file = resolve(name)
  if (!file.startsWith(`${root}${sep}`) || !file.toLowerCase().endsWith('.json')) {
    throw new Error('La salida debe estar dentro de apps/api/private/cir-04/ y terminar en .json.')
  }
  return file
}

async function main() {
  if (process.argv.includes('--help')) { console.log(usage); return }
  const salida = outputPath()
  config({ path: resolve(process.cwd(), '.env'), quiet: true })
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada en apps/api/.env.')
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
  let inTransaction = false
  try {
    await db.connect()
    await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
    inTransaction = true
    // FKs impiden orfandad en un esquema sano. La consulta también comprueba datos anteriores a CIR-04.
    const queries = {
      familias: `SELECT COUNT(*)::int AS n FROM familia`,
      huertos: `SELECT COUNT(*)::int AS n FROM huerto`,
      ciclos: `SELECT COUNT(*)::int AS n FROM ciclo_cultivo`,
      ciclosActivos: `SELECT COUNT(*)::int AS n FROM ciclo_cultivo WHERE estado = 'ACTIVO'`,
      ciclosFinalizados: `SELECT COUNT(*)::int AS n FROM ciclo_cultivo WHERE estado = 'FINALIZADO'`,
      cosechas: `SELECT COUNT(*)::int AS n FROM registro_produccion`,
      evaluaciones: `SELECT COUNT(*)::int AS n FROM evaluacion_cultivo`,
      familiasSinHuerto: `SELECT COUNT(*)::int AS n FROM familia f WHERE NOT EXISTS (SELECT 1 FROM huerto h WHERE h.familia_id = f.id)`,
      ciclosHuerfanos: `SELECT COUNT(*)::int AS n FROM ciclo_cultivo c LEFT JOIN huerto h ON h.id = c.huerto_id LEFT JOIN cultivo v ON v.id = c.cultivo_id WHERE h.id IS NULL OR v.id IS NULL`,
      huertosHuerfanos: `SELECT COUNT(*)::int AS n FROM huerto h LEFT JOIN familia f ON f.id = h.familia_id WHERE f.id IS NULL`,
      produccionesHuerfanas: `SELECT COUNT(*)::int AS n FROM registro_produccion p LEFT JOIN ciclo_cultivo c ON c.id = p.ciclo_cultivo_id WHERE c.id IS NULL`,
      evaluacionesOtraFamilia: `SELECT COUNT(*)::int AS n FROM evaluacion_cultivo e JOIN visita v ON v.id = e.visita_id JOIN ciclo_cultivo c ON c.id = e.ciclo_cultivo_id JOIN huerto h ON h.id = c.huerto_id WHERE v.familia_id <> h.familia_id`,
      ciclosActivosHuertoInactivo: `SELECT COUNT(*)::int AS n FROM ciclo_cultivo c JOIN huerto h ON h.id = c.huerto_id WHERE c.estado = 'ACTIVO' AND h.estado <> 'ACTIVO'`,
      ciclosDuplicadosExactos: `SELECT COUNT(*)::int AS n FROM (SELECT huerto_id, cultivo_id, fecha_siembra, fecha_trasplante FROM ciclo_cultivo GROUP BY huerto_id, cultivo_id, fecha_siembra, fecha_trasplante HAVING COUNT(*) > 1) x`,
      ciclosFinalizadosSinFin: `SELECT COUNT(*)::int AS n FROM ciclo_cultivo WHERE estado = 'FINALIZADO' AND fecha_fin IS NULL`,
    }
    const counts = {}
    for (const [key, sql] of Object.entries(queries)) {
      const { rows } = await db.query(sql)
      counts[key] = rows[0].n
    }
    await db.query('COMMIT'); inTransaction = false
    const alerts = Object.fromEntries(Object.entries(counts).filter(([key, val]) =>
      ['ciclosHuerfanos', 'huertosHuerfanos', 'produccionesHuerfanas', 'evaluacionesOtraFamilia',
       'ciclosActivosHuertoInactivo', 'ciclosDuplicadosExactos', 'ciclosFinalizadosSinFin'].includes(key) && val > 0))
    const report = { version: 'CIR-04', soloLectura: true, resumen: counts, alertas: alerts,
      nota: 'Familias sin huerto no son un error automático; se requiere confirmación de campo.' }
    console.log('CIR-04 — Auditoría de relaciones (solo lectura)')
    for (const [key, value] of Object.entries(counts)) console.log(`  ${key}: ${value}`)
    if (Object.keys(alerts).length) console.log('Atención: existen inconsistencias a revisar. No se corrigió ningún registro.')
    if (salida) {
      await mkdir(dirname(salida), { recursive: true })
      await writeFile(salida, `${JSON.stringify(report, null, 2)}\n`, { flag: 'w', mode: 0o600 })
      console.log('Resultado guardado en carpeta privada.')
    }
  } finally {
    if (inTransaction) await db.query('ROLLBACK').catch(() => {})
    await db.end().catch(() => {})
  }
}
main().catch(error => { console.error(`CIR-04: ${error.message}`); process.exitCode = 1 })
