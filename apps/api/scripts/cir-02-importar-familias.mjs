#!/usr/bin/env node
// CIR-02: importar el padrón privado solo tras simulación, revisión y respaldo.
// El script NO inserta huertos, programas, ciclos, coordenadas ni fechas supuestas.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname, relative, isAbsolute } from 'node:path'
import { config } from 'dotenv'
import pg from 'pg'
import { parseCsv, normalizeText } from './cir-02-audit-lib.mjs'
import { buildImportPlan, makeReview, validateReview } from './cir-02-import-lib.mjs'
import { createHash } from 'node:crypto'

const root = process.cwd()
const privateDir = resolve(root, 'private', 'cir-02')

function inPrivate(file) {
  if (!file) throw new Error('Falta ruta de un archivo privado.')
  const path = resolve(root, file)
  const rel = relative(privateDir, path)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error('Los archivos deben estar dentro de apps/api/private/cir-02/.')
  }
  return path
}

function arg(name, defaultValue = null) {
  const at = process.argv.indexOf(name)
  if (at < 0) return defaultValue
  const value = process.argv[at + 1]
  if (!value || value.startsWith('--')) throw new Error(`Falta valor para ${name}.`)
  return value
}

async function snapshot(db) {
  const { rows: municipalities } = await db.query('SELECT id, nombre, activo FROM municipio ORDER BY id')
  const { rows: communities } = await db.query('SELECT id, nombre, activo, municipio_id AS "municipioId" FROM comunidad ORDER BY id')
  const { rows: families } = await db.query(`
    SELECT f.id, f.nombre_referencia AS "nombreReferencia", f.estado,
           c.nombre AS comunidad, c.municipio_id AS "municipioId"
    FROM familia f JOIN comunidad c ON c.id = f.comunidad_id ORDER BY f.id`)
  const { rows: members } = await db.query(`
    SELECT familia_id AS "familiaId", nombre_completo AS "nombreCompleto"
    FROM integrante_familia ORDER BY id`)
  const byFamily = new Map()
  for (const member of members) byFamily.set(member.familiaId, [...(byFamily.get(member.familiaId) ?? []), member])
  return { municipalities, communities, families: families.map((f) => ({ ...f,
    integrantes: byFamily.get(f.id) ?? [], huertos: [],
  })) }
}

async function ensureUser(db, email) {
  const { rows } = await db.query(`
    SELECT u.id, u.estado, r.nombre AS rol, p.codigo AS permiso
    FROM usuario u
    LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
    LEFT JOIN rol r ON r.id = ur.rol_id AND r.activo = true
    LEFT JOIN rol_permiso rp ON rp.rol_id = r.id
    LEFT JOIN permiso p ON p.id = rp.permiso_id
    WHERE lower(u.correo) = lower($1)`, [email])
  if (!rows.length || normalizeText(rows[0].estado) !== 'activo' ||
      !rows.some((row) => row.permiso === 'FAMILIAS_WRITE' || normalizeText(row.rol) === 'direccion general')) {
    throw new Error('El usuario responsable debe estar activo y contar con FAMILIAS_WRITE o rol Dirección general.')
  }
  return rows[0].id
}

async function auditRecord(db, userId, entity, id, fields, code) {
  await db.query(`INSERT INTO bitacora
    (usuario_id, entidad, registro_id, accion, fecha, datos_nuevos, descripcion)
    VALUES ($1,$2,$3,'CREATE',NOW(),$4,$5)`, [userId, entity, String(id),
      JSON.stringify({ campos: fields, codigoRevision: code }), 'Carga institucional CIR-02; aprobación privada conservada fuera de Git.'])
}

async function applyImport(db, plan, review, userId) {
  const code = plan.codigoRevision
  let municipio
  const { rows: existingMunicipio } = await db.query(`SELECT id, nombre, activo FROM municipio ORDER BY id`)
  municipio = existingMunicipio.find((item) => normalizeText(item.nombre) === normalizeText(plan.municipio))
  if (!municipio) {
    const { rows } = await db.query('INSERT INTO municipio (nombre,activo) VALUES ($1,true) RETURNING id', [plan.municipio])
    municipio = { id: rows[0].id }
    await auditRecord(db, userId, 'municipio', municipio.id, ['nombre','activo'], code)
  }
  const idByCommunity = new Map()
  const { rows: existingCommunities } = await db.query('SELECT id, municipio_id, nombre FROM comunidad ORDER BY id')
  let communitiesCreated = 0
  for (const community of plan.comunidades) {
    let item = existingCommunities.find((c) => c.municipio_id === municipio.id && normalizeText(c.nombre) === normalizeText(community.nombre))
    if (!item) {
      const { rows } = await db.query(`INSERT INTO comunidad (municipio_id,nombre,activo)
        VALUES ($1,$2,true) RETURNING id`, [municipio.id, community.nombre])
      item = { id: rows[0].id }
      communitiesCreated++
      await auditRecord(db, userId, 'comunidad', item.id, ['municipioId','nombre','activo'], code)
    }
    idByCommunity.set(normalizeText(community.nombre), item.id)
  }
  const familyIds = []
  for (let i = 0; i < plan.filas.length; i++) {
    const row = plan.filas[i]
    const decision = review.decisiones[i]
    if (decision.decision !== 'CREAR') continue
    const communityId = idByCommunity.get(normalizeText(row.comunidad))
    if (!communityId) throw new Error('No se encontró la comunidad del padrón; operación cancelada.')
    const { rows: created } = await db.query(`
      INSERT INTO familia (comunidad_id, nombre_referencia, fecha_ingreso, estado, observaciones)
      VALUES ($1,$2,NULL,$3,$4) RETURNING id`, [communityId, row.nombre, decision.estadoFamilia,
      'Participante del padrón CIR-02. El nombre puede ser abreviado; expediente familiar pendiente de completar.'])
    const familyId = created[0].id
    const { rows: members } = await db.query(`
      INSERT INTO integrante_familia
        (familia_id,nombre_completo,fecha_nacimiento,sexo,parentesco,telefono,activo,observaciones)
      VALUES ($1,$2,NULL,NULL,NULL,NULL,true,$3) RETURNING id`, [familyId, row.nombre,
      'Nombre según padrón institucional; confirmar datos faltantes con Coordinación.'])
    familyIds.push(familyId)
    await auditRecord(db, userId, 'familia', familyId, ['comunidadId','nombreReferencia','estado','integrantes'], code)
    await auditRecord(db, userId, 'integrante_familia', members[0].id, ['familiaId','nombreCompleto','activo'], code)
  }
  return { familiasCreadas: familyIds.length, familiasPreexistentes: plan.resumen.existentes,
    comunidadesCreadas: communitiesCreated, municipioCreado: plan.resumen.municipioNuevo,
    familiasIds: familyIds, codigoRevision: code }
}

async function main() {
  if (process.argv.includes('--help')) {
    console.log(`Desde apps/api:\n` +
      `  node scripts/cir-02-importar-familias.mjs --oficial private/cir-02/participantes-oficiales.csv\n` +
      `  node scripts/cir-02-importar-familias.mjs --oficial private/cir-02/participantes-oficiales.csv --aplicar --respaldo-confirmado --confirmar CODIGO --usuario-correo correo@dominio`)
    return
  }
  const applying = process.argv.includes('--aplicar')
  const officialFile = inPrivate(arg('--oficial', 'private/cir-02/participantes-oficiales.csv'))
  const planFile = inPrivate(arg('--plan', 'private/cir-02/plan-importacion.json'))
  const reviewFile = inPrivate(arg('--revision', 'private/cir-02/revision-importacion.json'))
  const input = await readFile(officialFile, 'utf8')
  const reference = parseCsv(input)
  const sourceSha256 = createHash('sha256').update(input).digest('hex')
  config({ path: resolve(root, '.env'), quiet: true })
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada en apps/api/.env.')
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
  let started = false
  try {
    await db.connect()
    await db.query(applying ? 'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE' :
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
    started = true
    if (applying) {
      // Serializa este script entre dos ejecuciones, sin modificar el esquema.
      await db.query(`SELECT pg_advisory_xact_lock(hashtextextended('CIR-02:PADRON_OFICIAL',0))`)
    }
    const state = await snapshot(db)
    const plan = buildImportPlan(reference, state, sourceSha256)
    if (!applying) {
      await db.query('COMMIT')
      started = false
      await mkdir(dirname(planFile), { recursive: true })
      await writeFile(planFile, JSON.stringify(plan, null, 2) + '\n', { mode: 0o600 })
      // Nunca sobrescribir una revisión ya cumplimentada por una persona.
      try {
        await writeFile(reviewFile, JSON.stringify(makeReview(plan), null, 2) + '\n', { mode: 0o600, flag: 'wx' })
      } catch (err) {
        if (err.code !== 'EEXIST') throw err
        const previous = JSON.parse(await readFile(reviewFile, 'utf8'))
        if (previous.codigoRevision !== plan.codigoRevision) {
          throw new Error('La revisión privada pertenece a un plan anterior. Resguárdala y renómbrala antes de simular de nuevo.')
        }
      }
      console.log('Simulación CIR-02 completada. NO se realizaron escrituras.')
      console.log(`Código de revisión: ${plan.codigoRevision}`)
      console.log(`Crear: ${plan.resumen.crear}; existentes: ${plan.resumen.existentes}; revisar: ${plan.resumen.revisar}.`)
      console.log(`Municipio nuevo: ${plan.resumen.municipioNuevo ? 'sí' : 'no'}; comunidades nuevas: ${plan.resumen.comunidadesNuevas}.`)
      console.log(`Plan privado: ${planFile}\nRevisión privada: ${reviewFile}`)
      return
    }
    if (!process.argv.includes('--respaldo-confirmado')) {
      throw new Error('Antes de aplicar, verifica un respaldo de PostgreSQL y agrega --respaldo-confirmado.')
    }
    const expected = arg('--confirmar')
    const email = arg('--usuario-correo')
    if (!expected || !email || expected !== plan.codigoRevision) {
      throw new Error('Faltan --confirmar CODIGO y --usuario-correo; el código debe coincidir con la simulación.')
    }
    const previous = JSON.parse(await readFile(planFile, 'utf8'))
    if (previous.codigoRevision !== plan.codigoRevision || JSON.stringify(previous) !== JSON.stringify(plan)) {
      throw new Error('La base cambió desde la simulación; no se realizó ningún cambio. Genera y revisa un plan nuevo.')
    }
    const review = JSON.parse(await readFile(reviewFile, 'utf8'))
    validateReview(plan, review)
    const userId = await ensureUser(db, email)
    const result = await applyImport(db, plan, review, userId)
    await db.query('COMMIT')
    started = false
    const resultFile = inPrivate('private/cir-02/resultado-importacion.json')
    try {
      await writeFile(resultFile, JSON.stringify(result, null, 2) + '\n', { mode: 0o600 })
    } catch (error) {
      console.warn('CIR-02: transacción confirmada, pero no se pudo guardar el resumen local. No repitas la carga sin auditar primero.')
      console.warn(`Detalle técnico: ${error.message}`)
    }
    console.log('CIR-02: importación confirmada y transacción finalizada.')
    console.log(`Familias nuevas: ${result.familiasCreadas}; ya existentes: ${result.familiasPreexistentes}; comunidades creadas: ${result.comunidadesCreadas}.`)
    console.log(`Resultado privado: ${resultFile}`)
  } finally {
    if (started) await db.query('ROLLBACK').catch(() => {})
    await db.end().catch(() => {})
  }
}

main().catch((error) => {
  console.error(`CIR-02 cancelado: ${error.message}`)
  process.exitCode = 1
})
