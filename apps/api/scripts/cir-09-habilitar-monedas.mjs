#!/usr/bin/env node
// CIR-09: catálogo básico para registrar una venta. No convierte moneda ni fija tasa de cambio (CIR-10).
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { config } from 'dotenv'
import pg from 'pg'

const wanted = [
  { codigo: 'GTQ', nombre: 'Quetzal guatemalteco', simbolo: 'Q' },
  { codigo: 'USD', nombre: 'Dólar estadounidense', simbolo: '$' },
]
const args = process.argv
const get = name => { const index = args.indexOf(name); return index < 0 ? null : args[index + 1] }
const plain = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

async function main() {
  if (args.includes('--help')) {
    console.log('Desde apps/api: node scripts/cir-09-habilitar-monedas.mjs [--aplicar --respaldo-confirmado --confirmar CODIGO --usuario-correo EMAIL]')
    return
  }
  const apply = args.includes('--aplicar')
  if (apply && !args.includes('--respaldo-confirmado')) throw Error('Confirma un respaldo verificado antes de aplicar.')
  config({ path: resolve(process.cwd(), '.env'), quiet: true })
  if (!process.env.DATABASE_URL) throw Error('Falta DATABASE_URL.')
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
  let tx = false
  try {
    await db.connect()
    await db.query(apply ? 'BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE' : 'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
    tx = true
    if (apply) await db.query("SELECT pg_advisory_xact_lock(hashtextextended('CIR-09:MONEDAS', 0))")
    const { rows: snapshot } = await db.query(`SELECT id,codigo,nombre,simbolo,activo FROM moneda ORDER BY id${apply ? ' FOR UPDATE' : ''}`)
    const plan = wanted.map(item => {
      const matches = snapshot.filter(row => plain(row.codigo) === plain(item.codigo))
      return { ...item, accion: matches.length > 1 || matches.length === 1 && !matches[0].activo ? 'REVISAR' : matches.length ? 'EXISTE' : 'CREAR' }
    })
    const code = createHash('sha256').update(JSON.stringify({ snapshot, plan })).digest('hex').slice(0, 16).toUpperCase()
    for (const item of plan) console.log(`${item.accion}: ${item.codigo} — ${item.nombre}`)
    if (!apply) {
      await db.query('COMMIT'); tx = false
      console.log(`Sin cambios en PostgreSQL. Código de confirmación: ${code}`)
      return
    }
    if (plan.some(item => item.accion === 'REVISAR')) throw Error('Existen monedas inactivas o inconsistentes. Revisa el catálogo.')
    if (get('--confirmar') !== code || !get('--usuario-correo')) throw Error('Código o correo ausentes. Ejecuta la simulación.')
    const { rows: users } = await db.query(`SELECT u.id, u.estado, r.nombre rol, p.codigo permiso FROM usuario u
      LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
      LEFT JOIN rol r ON r.id = ur.rol_id AND r.activo = true
      LEFT JOIN rol_permiso rp ON rp.rol_id = r.id
      LEFT JOIN permiso p ON p.id = rp.permiso_id
      WHERE lower(u.correo)=lower($1)`, [get('--usuario-correo')])
    if (!users.length || plain(users[0].estado) !== 'activo' || !users.some(u => u.permiso === 'PRODUCCION_WRITE' || plain(u.rol).includes('direccion general'))) {
      throw Error('Se requiere usuario activo con permiso de producción o Dirección.')
    }
    for (const item of plan.filter(row => row.accion === 'CREAR')) {
      const { rows } = await db.query('INSERT INTO moneda(codigo,nombre,simbolo,activo) VALUES($1,$2,$3,true) RETURNING id',
        [item.codigo, item.nombre, item.simbolo])
      await db.query(`INSERT INTO bitacora(usuario_id,entidad,registro_id,accion,fecha,datos_nuevos,descripcion)
        VALUES($1,'moneda',$2,'CREATE',NOW(),$3,'CIR-09: moneda para ventas, sin tipo de cambio')`,
      [users[0].id, String(rows[0].id), JSON.stringify(item)])
    }
    await db.query('COMMIT'); tx = false
    console.log('CIR-09: catálogo de monedas disponible. Vuelve a ejecutar la simulación.')
  } finally {
    if (tx) await db.query('ROLLBACK').catch(() => {})
    await db.end().catch(() => {})
  }
}
main().catch(e => { console.error(`CIR-09 cancelado: ${e.message}`); process.exitCode = 1 })
