#!/usr/bin/env node
// CIR-05: lectura de catálogo y anomalías sin imprimir información de las familias.
import { resolve } from 'node:path'
import { config } from 'dotenv'
import pg from 'pg'
import { tipoDeUnidad } from './cir-05-unidades-lib.mjs'

async function main() {
  config({ path: resolve(process.cwd(), '.env'), quiet: true })
  if (!process.env.DATABASE_URL) throw Error('DATABASE_URL no configurada en apps/api/.env.')
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
  try {
    await db.connect()
    await db.query('BEGIN TRANSACTION READ ONLY')
    const { rows } = await db.query(`
      SELECT u.id, u.codigo, u.nombre, u.abreviatura, u.activo,
        COUNT(d.id)::int AS registros,
        COUNT(d.id) FILTER (WHERE d.cantidad_total <= 0)::int AS no_positivas,
        COUNT(d.id) FILTER (WHERE d.cantidad_total <> trunc(d.cantidad_total))::int AS con_decimales
      FROM unidad_medida u LEFT JOIN detalle_produccion d ON d.unidad_medida_id = u.id
      GROUP BY u.id ORDER BY u.id`)
    await db.query('COMMIT')
    console.log('CIR-05: auditoría de unidades (solo lectura)')
    let conteosDecimales = 0, cantidadesInvalidas = 0, noClasificadas = 0
    for (const item of rows) {
      const kind = tipoDeUnidad(item) ?? 'otra'
      if ((kind === 'unidades' || kind === 'manojos') && Number(item.con_decimales) > 0) conteosDecimales += Number(item.con_decimales)
      cantidadesInvalidas += Number(item.no_positivas)
      if (kind === 'otra') noClasificadas += Number(item.registros)
      console.log(`  ${item.codigo}: ${kind}, ${item.activo ? 'activa' : 'inactiva'}, registros=${item.registros}`)
    }
    console.log(`Conteos fraccionarios (unidades/manojos): ${conteosDecimales}`)
    console.log(`Cantidades no positivas: ${cantidadesInvalidas}`)
    console.log(`Detalles con unidades sin clasificación: ${noClasificadas}`)
    console.log('Las alertas requieren revisión; este comando no corrige datos.')
  } finally { await db.end().catch(() => {}) }
}
main().catch(e => { console.error(`CIR-05: ${e.message}`); process.exitCode = 1 })
