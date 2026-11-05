#!/usr/bin/env node
// CIR-03: simulación por defecto; modificaciones solo con confirmación y respaldo.
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { config } from 'dotenv'
import pg from 'pg'
import { claveCultivo, planCatalogo } from './cir-03-catalogo-lib.mjs'

function argument(name) {
  const index = process.argv.indexOf(name)
  if (index < 0) return null
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`Falta valor para ${name}.`)
  return value
}

const usage = `Desde apps/api:
` +
  `  node scripts/cir-03-importar-cultivos.mjs
` +
  `  node scripts/cir-03-importar-cultivos.mjs --aplicar --respaldo-confirmado --confirmar CODIGO --usuario-correo correo@dominio`

function codigoDe(plan, snapshot) {
  return createHash('sha256').update(JSON.stringify({ plan, snapshot })).digest('hex').slice(0, 16).toUpperCase()
}

async function usuarioAutorizado(db, correo) {
  const { rows } = await db.query(`
    SELECT u.id, u.estado, r.nombre AS rol, p.codigo AS permiso
    FROM usuario u
    LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
    LEFT JOIN rol r ON r.id = ur.rol_id AND r.activo = true
    LEFT JOIN rol_permiso rp ON rp.rol_id = r.id
    LEFT JOIN permiso p ON p.id = rp.permiso_id
    WHERE lower(u.correo) = lower($1)`, [correo])
  const activo = rows.length && claveCultivo(rows[0].estado) === 'activo'
  const autorizado = rows.some(x => x.permiso === 'CULTIVOS_WRITE' ||
    (claveCultivo(x.rol ?? '').includes('direccion') && claveCultivo(x.rol ?? '').includes('general')))
  if (!activo || !autorizado) throw new Error('Se requiere un usuario activo autorizado para administrar cultivos.')
  return rows[0].id
}

async function bitacora(db, usuarioId, accion, registroId, anterior, nuevo, codigo) {
  await db.query(`INSERT INTO bitacora
    (usuario_id, entidad, registro_id, accion, fecha, datos_anteriores, datos_nuevos, descripcion)
    VALUES ($1, 'cultivo', $2, $3, NOW(), $4, $5, $6)`, [
      usuarioId, String(registroId), accion,
      anterior ? JSON.stringify(anterior) : null,
      JSON.stringify(nuevo), `CIR-03: normalización de catálogo institucional, revisión ${codigo}.`,
    ])
}

async function main() {
  if (process.argv.includes('--help')) { console.log(usage); return }
  const aplicar = process.argv.includes('--aplicar')
  if (aplicar && !process.argv.includes('--respaldo-confirmado')) {
    throw new Error('Antes de aplicar, verifica un respaldo de PostgreSQL y usa --respaldo-confirmado.')
  }
  config({ path: resolve(process.cwd(), '.env'), quiet: true })
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no configurada en apps/api/.env.')
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
  let transaccion = false
  try {
    await db.connect()
    await db.query(aplicar ? 'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE' :
      'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
    transaccion = true
    if (aplicar) {
      await db.query(`SELECT pg_advisory_xact_lock(hashtextextended('CIR-03:CATALOGO_CULTIVOS', 0))`)
    }
    const { rows: snapshot } = await db.query(
      'SELECT id, nombre, activo FROM cultivo ORDER BY id' + (aplicar ? ' FOR UPDATE' : ''))
    const plan = planCatalogo(snapshot)
    const codigo = codigoDe(plan, snapshot)
    console.log(`CIR-03: ${plan.resumen.oficiales} variedades oficiales. ` +
      `Crear: ${plan.resumen.crear}; normalizar: ${plan.resumen.normalizar}; ` +
      `existentes: ${plan.resumen.existentes}; revisar: ${plan.resumen.revisar}.`)
    for (const fila of plan.filas) {
      console.log(`  ${fila.accion}: ${fila.nombre}` +
        (fila.anterior ? ` (actual: ${fila.anterior}, #${fila.id})` : ''))
    }
    if (!aplicar) {
      await db.query('COMMIT'); transaccion = false
      console.log(`Simulación sin cambios en PostgreSQL. Código de confirmación: ${codigo}`)
      if (plan.resumen.revisar) console.log('Hay registros para revisión. No apliques hasta resolverlos desde el catálogo.')
      return
    }
    if (plan.resumen.revisar) throw new Error('Existen variedades duplicadas o inactivas. Revisar antes de importar.')
    if (argument('--confirmar') !== codigo || !argument('--usuario-correo')) {
      throw new Error('El código cambió o faltan --confirmar CODIGO y --usuario-correo. Ejecuta primero la simulación.')
    }
    const usuarioId = await usuarioAutorizado(db, argument('--usuario-correo'))
    // Revalidar las coincidencias bajo la misma transacción; ningún ID de ciclo se reemplaza.
    for (const fila of plan.filas) {
      if (fila.accion === 'CREAR') {
        const { rows } = await db.query(
          'INSERT INTO cultivo (nombre, descripcion, activo) VALUES ($1, NULL, true) RETURNING id', [fila.nombre])
        await bitacora(db, usuarioId, 'CREATE', rows[0].id, null,
          { nombre: fila.nombre, activo: true }, codigo)
      } else if (fila.accion === 'NORMALIZAR') {
        await db.query('UPDATE cultivo SET nombre = $1 WHERE id = $2', [fila.nombre, fila.id])
        await bitacora(db, usuarioId, 'UPDATE', fila.id,
          { nombre: fila.anterior }, { nombre: fila.nombre }, codigo)
      }
    }
    await db.query('COMMIT'); transaccion = false
    console.log(`CIR-03: importación confirmada. Nuevos: ${plan.resumen.crear}; ` +
      `nombres normalizados: ${plan.resumen.normalizar}.`)
    console.log('Vuelve a ejecutar sin --aplicar para verificar 22 EXISTE y 0 REVISAR.')
  } finally {
    if (transaccion) await db.query('ROLLBACK').catch(() => {})
    await db.end().catch(() => {})
  }
}

main().catch(error => { console.error(`CIR-03 cancelado: ${error.message}`); process.exitCode = 1 })
