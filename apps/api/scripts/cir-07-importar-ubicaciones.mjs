#!/usr/bin/env node
// Importación controlada de coordenadas privadas; NO crea/modifica familias ni comunidades.
import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { config } from 'dotenv'
import pg from 'pg'
import { normalizeText } from './cir-02-audit-lib.mjs'
import { readLocationsCsv, locationPlan } from './cir-07-ubicaciones-lib.mjs'

const root = process.cwd()
const privateDir = resolve(root, 'private', 'cir-07')
const defaultFile = 'private/cir-07/ubicaciones-oficiales.csv'
const savedPlan = resolve(privateDir, 'plan.json')
function param(name, fallback) {
  const index = process.argv.indexOf(name)
  if (index < 0) return fallback
  if (!process.argv[index + 1] || process.argv[index + 1].startsWith('--')) throw new Error(`Falta el valor de ${name}.`)
  return process.argv[index + 1]
}
function safePath(path) {
  const resolved = resolve(root, path)
  const rel = relative(privateDir, resolved)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('El CSV debe permanecer en apps/api/private/cir-07/.')
  return resolved
}
function summaryCode(sha, plan) {
  const state = plan.tasks.map(({ fila,id,status }) => ({ fila,id,status }))
  return createHash('sha256').update(JSON.stringify({ sha, state })).digest('hex').slice(0, 16).toUpperCase()
}
async function state(db) {
  const { rows } = await db.query(`
    SELECT f.id, f.nombre_referencia AS "nombreReferencia", f.latitud, f.longitud,
           c.nombre AS comunidad, m.nombre AS municipio
    FROM familia f JOIN comunidad c ON c.id=f.comunidad_id
    JOIN municipio m ON m.id=c.municipio_id ORDER BY f.id FOR UPDATE OF f`)
  return rows
}
async function userId(db, email) {
  const { rows } = await db.query(`
    SELECT u.id, u.estado, r.nombre rol, p.codigo permiso
    FROM usuario u LEFT JOIN usuario_rol ur ON ur.usuario_id=u.id
    LEFT JOIN rol r ON r.id=ur.rol_id AND r.activo=true
    LEFT JOIN rol_permiso rp ON rp.rol_id=r.id
    LEFT JOIN permiso p ON p.id=rp.permiso_id
    WHERE lower(u.correo)=lower($1)`, [email])
  if (!rows.length || normalizeText(rows[0].estado) !== 'activo'
      || !rows.some((row) => row.permiso === 'FAMILIAS_WRITE' || normalizeText(row.rol) === 'direccion general'))
    throw new Error('El responsable debe ser un usuario activo autorizado para modificar familias.')
  return rows[0].id
}
async function main() {
  if (process.argv.includes('--help')) {
    console.log('Desde apps/api: node scripts/cir-07-importar-ubicaciones.mjs [--oficial private/cir-07/ubicaciones-oficiales.csv]\n' +
      'Para aplicar: --aplicar --respaldo-confirmado --aprobacion-confirmada --confirmar CODIGO --usuario-correo CORREO')
    return
  }
  const apply = process.argv.includes('--aplicar')
  const file = safePath(param('--oficial', defaultFile))
  const source = await readFile(file, 'utf8')
  const locations = readLocationsCsv(source)
  const sha = createHash('sha256').update(source).digest('hex')
  config({ path: resolve(root, '.env'), quiet: true })
  if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL en apps/api/.env.')
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
  let begun = false
  try {
    await db.connect()
    await db.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ')
    begun = true
    if (apply) await db.query(`SELECT pg_advisory_xact_lock(hashtextextended('CIR-07:UBICACIONES',0))`)
    const plan = locationPlan(locations, await state(db))
    const codigo = summaryCode(sha, plan)
    const { total, actualizar, existentes, revisar } = plan.summary
    console.log(`CIR-07: ${total} ubicaciones; actualizar: ${actualizar}; existentes: ${existentes}; revisar: ${revisar}.`)
    if (!apply) {
      await db.query('COMMIT'); begun = false
      await mkdir(privateDir, { recursive: true })
      await writeFile(savedPlan, JSON.stringify({ sha256: sha, codigo, resumen: plan.summary, ids: plan.tasks.map(({ fila,id,status }) => ({ fila,id,status })) }, null, 2) + '\n', { mode: 0o600 })
      console.log(`Simulación sin cambios. Código de confirmación: ${codigo}. Plan privado: ${savedPlan}`)
      return
    }
    if (!process.argv.includes('--respaldo-confirmado') || !process.argv.includes('--aprobacion-confirmada')) throw new Error('Se requieren respaldo verificado y autorización institucional real.')
    if (param('--confirmar') !== codigo) throw new Error('Código de simulación distinto; vuelve a revisar el plan.')
    const saved = JSON.parse(await readFile(savedPlan, 'utf8'))
    if (saved.codigo !== codigo || saved.sha256 !== sha) throw new Error('El plan o el CSV cambió desde la simulación.')
    if (revisar !== 0) throw new Error('Existen discrepancias; resolver antes de importar.')
    const responsible = await userId(db, param('--usuario-correo'))
    for (const item of plan.tasks.filter((task) => task.status === 'ACTUALIZAR')) {
      await db.query('UPDATE familia SET latitud=$1,longitud=$2 WHERE id=$3 AND latitud IS NULL AND longitud IS NULL', [item.latitud,item.longitud,item.id])
      await db.query(`INSERT INTO bitacora (usuario_id, entidad, registro_id, accion, fecha, datos_nuevos, descripcion)
        VALUES ($1,'familia',$2,'UPDATE',NOW(),$3,'Carga de ubicación validada CIR-07')`,
        [responsible, String(item.id), JSON.stringify({ changedFields: ['latitud','longitud'], codigoRevision: codigo })])
    }
    await db.query('COMMIT'); begun = false
    console.log(`CIR-07: transacción completada. Ubicaciones incorporadas: ${actualizar}; conservadas: ${existentes}.`)
  } finally {
    if (begun) await db.query('ROLLBACK').catch(() => {})
    await db.end().catch(() => {})
  }
}
main().catch((error) => { console.error(`CIR-07 cancelado: ${error.message}`); process.exitCode = 1 })
