#!/usr/bin/env node
// CIR-05: por defecto simula. No modifica ni renombra unidades usadas por registros históricos.
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { config } from 'dotenv'
import pg from 'pg'
import { planUnidades } from './cir-05-unidades-lib.mjs'

const args = process.argv
function arg(name) {
  const index = args.indexOf(name)
  if (index < 0) return null
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw Error(`Falta el valor para ${name}.`)
  return value
}
const canonical = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[_-]/g, ' ').trim()
const help = `Desde apps/api:\n  node scripts/cir-05-importar-unidades.mjs\n  node scripts/cir-05-importar-unidades.mjs --aplicar --respaldo-confirmado --confirmar CODIGO --usuario-correo correo@dominio`

async function main() {
  if (args.includes('--help')) { console.log(help); return }
  const aplicar = args.includes('--aplicar')
  if (aplicar && !args.includes('--respaldo-confirmado')) throw Error('Confirma primero un respaldo verificado con --respaldo-confirmado.')
  config({ path: resolve(process.cwd(), '.env'), quiet: true })
  if (!process.env.DATABASE_URL) throw Error('DATABASE_URL no está configurada en apps/api/.env.')
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
  let tx = false
  try {
    await db.connect()
    await db.query(aplicar ? 'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE' : 'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
    tx = true
    if (aplicar) await db.query("SELECT pg_advisory_xact_lock(hashtextextended('CIR-05:UNIDADES', 0))")
    const { rows: snapshot } = await db.query(`SELECT id, codigo, nombre, abreviatura, activo FROM unidad_medida ORDER BY id${aplicar ? ' FOR UPDATE' : ''}`)
    const plan = planUnidades(snapshot)
    const confirmacion = createHash('sha256').update(JSON.stringify({ snapshot, plan })).digest('hex').slice(0,16).toUpperCase()
    console.log(`CIR-05: crear ${plan.resumen.crear}; existentes ${plan.resumen.existentes}; revisar ${plan.resumen.revisar}.`)
    for (const fila of plan.filas) console.log(`  ${fila.accion}: ${fila.nombre}${fila.codigoExistente ? ` (código existente: ${fila.codigoExistente})` : ''}`)
    if (!aplicar) {
      await db.query('COMMIT'); tx = false
      console.log(`Simulación sin escritura. Código de confirmación: ${confirmacion}`)
      return
    }
    if (plan.resumen.revisar) throw Error('Existen unidades duplicadas o inactivas para revisar antes de aplicar.')
    if (arg('--confirmar') !== confirmacion || !arg('--usuario-correo')) throw Error('Código inválido. Ejecuta simulación y proporciona --confirmar y --usuario-correo.')
    const { rows: usuarios } = await db.query(`
      SELECT u.id, u.estado, r.nombre rol, p.codigo permiso FROM usuario u
      LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
      LEFT JOIN rol r ON r.id = ur.rol_id AND r.activo = true
      LEFT JOIN rol_permiso rp ON rp.rol_id = r.id
      LEFT JOIN permiso p ON p.id = rp.permiso_id
      WHERE lower(u.correo) = lower($1)`, [arg('--usuario-correo')])
    const autorizado = usuarios.length && canonical(usuarios[0].estado) === 'activo' && usuarios.some(u =>
      u.permiso === 'PRODUCCION_WRITE' || canonical(u.rol).includes('direccion general'))
    if (!autorizado) throw Error('Se requiere un usuario activo con permiso de producción o Dirección General.')
    for (const fila of plan.filas) {
      if (fila.accion !== 'CREAR') continue
      const { rows } = await db.query('INSERT INTO unidad_medida (codigo,nombre,abreviatura,activo) VALUES ($1,$2,$3,true) RETURNING id', [fila.codigo, fila.nombre, fila.abreviatura])
      await db.query(`INSERT INTO bitacora (usuario_id,entidad,registro_id,accion,fecha,datos_nuevos,descripcion)
        VALUES ($1,'unidad_medida',$2,'CREATE',NOW(),$3,$4)`, [usuarios[0].id, String(rows[0].id),
        JSON.stringify({ codigo: fila.codigo, nombre: fila.nombre, abreviatura: fila.abreviatura, activo: true }), `CIR-05: catálogo de unidades de cosecha. Revisión ${confirmacion}.`])
    }
    await db.query('COMMIT'); tx = false
    console.log(`CIR-05 aplicado: ${plan.resumen.crear} unidades nuevas. Repite la simulación para comprobar 3 EXISTE.`)
  } finally {
    if (tx) await db.query('ROLLBACK').catch(() => {})
    await db.end().catch(() => {})
  }
}
main().catch(e => { console.error(`CIR-05 cancelado: ${e.message}`); process.exitCode = 1 })
