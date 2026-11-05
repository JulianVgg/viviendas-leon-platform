#!/usr/bin/env node
// CIR-02 — Auditoría SIN escrituras en la base de datos.
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { config } from 'dotenv'
import pg from 'pg'
import { parseCsv, reconcileFamilies, toMarkdown } from './cir-02-audit-lib.mjs'

function argument(name) {
  const index = process.argv.indexOf(name)
  if (index < 0) return null
  const next = process.argv[index + 1]
  if (!next || next.startsWith('--')) throw new Error(`Falta un valor para ${name}.`)
  return next
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log('Uso: node scripts/cir-02-auditar-familias.mjs --oficial private/cir-02/participantes-oficiales.csv --salida private/cir-02/resultado.md')
    return
  }
  const official = argument('--oficial')
  const output = argument('--salida')
  if (!official || !output) throw new Error('Se requieren --oficial y --salida. Consulta --help.')
  const privateRoot = resolve(process.cwd(), 'private', 'cir-02')
  const outputPath = resolve(process.cwd(), output)
  if (!outputPath.startsWith(privateRoot + '/') && !outputPath.startsWith(privateRoot + '\\')) {
    throw new Error('Por privacidad, --salida debe estar dentro de apps/api/private/cir-02/.')
  }
  const reference = parseCsv(await readFile(resolve(process.cwd(), official), 'utf8'))
  config({ path: resolve(process.cwd(), '.env'), quiet: true })
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada en apps/api/.env.')

  const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
  let started = false
  try {
    await db.connect()
    await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
    started = true
    const { rows: families } = await db.query(`
      SELECT f.id, f.nombre_referencia AS "nombreReferencia", f.estado,
             c.nombre AS comunidad
      FROM familia f JOIN comunidad c ON c.id = f.comunidad_id
      ORDER BY f.id`)
    const { rows: members } = await db.query(`
      SELECT familia_id AS "familiaId", nombre_completo AS "nombreCompleto"
      FROM integrante_familia ORDER BY id`)
    const { rows: gardens } = await db.query(`
      SELECT familia_id AS "familiaId", estado FROM huerto ORDER BY id`)
    const { rows: communities } = await db.query('SELECT nombre FROM comunidad ORDER BY id')
    await db.query('COMMIT')
    started = false

    const memberMap = new Map(), gardenMap = new Map()
    for (const member of members) memberMap.set(member.familiaId, [...(memberMap.get(member.familiaId) ?? []), member])
    for (const garden of gardens) gardenMap.set(garden.familiaId, [...(gardenMap.get(garden.familiaId) ?? []), garden])
    const assembled = families.map((family) => ({ ...family,
      integrantes: memberMap.get(family.id) ?? [], huertos: gardenMap.get(family.id) ?? [],
    }))
    const result = reconcileFamilies(reference, assembled, communities.map((item) => item.nombre))
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, toMarkdown(result), { mode: 0o600, flag: 'w' })
    console.log(`CIR-02: ${result.summary.exactas} coincidencias exactas y ${result.summary.pendientes} por revisar (de 19).`)
    console.log(`Huertos activos: ${result.summary.huertosActivos}. Resultado privado: ${outputPath}`)
  } finally {
    if (started) await db.query('ROLLBACK').catch(() => {})
    await db.end().catch(() => {})
  }
}

main().catch((error) => {
  console.error(`No se pudo completar CIR-02: ${error.message}`)
  process.exitCode = 1
})
