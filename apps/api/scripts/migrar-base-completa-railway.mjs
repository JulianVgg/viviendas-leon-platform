/**
 * Copia COMPLETA de PostgreSQL local a una segunda base Railway VACIA.
 * No modifica la base Railway actual ni actualiza la API automaticamente.
 * Requiere Docker Desktop, el contenedor Postgres local y @viviendas-leon/api.
 *
 * --preview                  Compara versiones, tablas y registros (solo lectura).
 * --backup                   Crea dump completo fuera del repositorio.
 * --restore <ruta.dump>      Restaura en una NUEVA base Railway sin tablas.
 * --verify                   Compara el numero de filas por tabla.
 *
 * La copia INCLUYE datos sinteticos y NO incluye archivos de storage/.
 */
import pg from 'pg'
import { config as dotenvConfig } from 'dotenv'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const mode = process.argv[2] ?? '--preview'
const modes = new Set(['--preview', '--backup', '--restore', '--verify'])
if (!modes.has(mode) || (mode === '--restore' ? process.argv.length !== 4 : process.argv.length !== 3)) {
  console.error('Uso: node apps/api/scripts/migrar-base-completa-railway.mjs --preview|--backup|--restore <ruta.dump>|--verify')
  process.exit(2)
}

dotenvConfig({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })
const localValue = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL
const remoteValue = process.env.RAILWAY_NUEVA_DATABASE_URL
const container = process.env.VL_LOCAL_POSTGRES_CONTAINER || 'viviendas-leon-postgres'
const archiveDir = path.join(os.homedir(), 'Documents', 'ViviendasLeon-Respaldos')

function parsePgUrl(raw, name, { remote = false } = {}) {
  if (!raw) throw new Error(`Falta URL de ${name}.`)
  let url
  try { url = new URL(raw) } catch { throw new Error(`URL de ${name} no valida.`) }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error(`Protocolo de ${name} no es PostgreSQL.`)
  const database = decodeURIComponent(url.pathname.slice(1))
  if (!database || !/^[a-zA-Z0-9_-]+$/.test(database)) throw new Error(`Nombre de base en ${name} no valido.`)
  const username = decodeURIComponent(url.username)
  if (!username) throw new Error(`Usuario de ${name} no encontrado.`)
  if (remote) {
    if (!/^[a-z0-9-]+\.proxy\.rlwy\.net$/i.test(url.hostname) || !url.port) {
      throw new Error('La NUEVA base Railway debe usar un proxy TCP *.proxy.rlwy.net con puerto explicito.')
    }
    // pg 8: sslmode=require en el modo de compatibilidad libpq cifra el canal,
    // pero NO verifica la identidad del servidor. Solo para el acceso temporal.
    url.searchParams.set('sslmode', 'require')
    url.searchParams.set('uselibpqcompat', 'true')
  } else if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('El origen debe ser PostgreSQL local (localhost).')
  }
  return {
    url: url.toString(), host: url.hostname, port: url.port || '5432',
    database, username, password: decodeURIComponent(url.password),
  }
}

function docker(args, password = undefined) {
  const env = { ...process.env }
  if (password !== undefined) env.PGPASSWORD = password
  const result = spawnSync('docker', args, { stdio: 'inherit', env, shell: false })
  if (result.error) throw new Error(`Docker no pudo ejecutarse: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`Docker finalizo con codigo ${result.status}.`)
}

function dockerTemp() {
  return `/tmp/viviendas-leon-migracion-${process.pid}.dump`
}

async function connect(pgUrl) {
  const client = new pg.Client({ connectionString: pgUrl.url, connectionTimeoutMillis: 10000 })
  await client.connect()
  return client
}

async function inspect(client) {
  const version = Number((await client.query('SHOW server_version_num')).rows[0].server_version_num)
  const names = (await client.query(`
    SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename
  `)).rows.map((r) => r.tablename)
  const counts = new Map()
  for (const name of names) {
    const safeName = `"${name.replaceAll('"', '""')}"`
    counts.set(name, Number((await client.query(`SELECT COUNT(*)::bigint AS n FROM public.${safeName}`)).rows[0].n))
  }
  return { version, names, counts }
}

async function inspectSource() {
  const local = parsePgUrl(localValue, 'PostgreSQL local')
  const client = await connect(local)
  try {
    const stats = await inspect(client)
    const syntheticUsers = stats.names.includes('usuario') ? Number((await client.query(`
      SELECT COUNT(*)::int AS n FROM usuario
      WHERE lower(correo)='dev@viviendas-leon.test'
         OR lower(correo) LIKE '%@pruebas.invalid'
         OR nombre ~* 'sint[eé]tic|fictici'
    `)).rows[0].n) : 0
    const syntheticFamilies = stats.names.includes('familia') ? Number((await client.query(`
      SELECT COUNT(*)::int AS n FROM familia
      WHERE nombre_referencia ~* 'sint[eé]tic|fictici'
    `)).rows[0].n) : 0
    return { local, stats, syntheticUsers, syntheticFamilies }
  } finally { await client.end() }
}

function showStats(stats, title) {
  const total = [...stats.counts.values()].reduce((a, b) => a + b, 0)
  console.log(`${title}: PostgreSQL ${Math.floor(stats.version / 10000)}, ${stats.names.length} tablas, ${total} filas.`)
  for (const name of ['municipio', 'comunidad', 'familia', 'integrante_familia', 'huerto', 'cultivo', 'ciclo_cultivo', 'visita', 'capacitacion', 'usuario', '_prisma_migrations']) {
    if (stats.counts.has(name)) console.log(`  ${name}: ${stats.counts.get(name)}`)
  }
}

function validateVersions(source, target) {
  const sourceMajor = Math.floor(source.version / 10000)
  const targetMajor = Math.floor(target.version / 10000)
  if (targetMajor < sourceMajor) throw new Error(`El destino PostgreSQL ${targetMajor} es anterior al origen ${sourceMajor}.`)
  if (sourceMajor !== 17) console.warn(`ATENCION: revisar que el cliente pg_dump del contenedor soporte PostgreSQL ${sourceMajor}.`)
}

async function inspectTarget() {
  const target = parsePgUrl(remoteValue, 'Railway NUEVA', { remote: true })
  const client = await connect(target)
  try { return { target, stats: await inspect(client) } }
  finally { await client.end() }
}

function ensureTargetEmpty(targetStats) {
  if (targetStats.names.length !== 0) {
    throw new Error(`La base destino ya tiene ${targetStats.names.length} tablas. NO se restaurara sobre una base en uso. Crea otra base PostgreSQL vacia en Railway.`)
  }
}

function showSynthetic(source) {
  console.log(`Registros de prueba identificados: ${source.syntheticUsers} cuentas y ${source.syntheticFamilies} familias (minimo).`)
  if (source.syntheticUsers || source.syntheticFamilies) {
    console.log('ATENCION: una copia integral incluye esos registros y sus relaciones. Usar SOLO en staging hasta depurarlos.')
  }
}

async function preview() {
  const source = await inspectSource()
  const { stats: target } = await inspectTarget()
  showStats(source.stats, 'Origen LOCAL')
  showStats(target, 'Destino Railway NUEVO')
  showSynthetic(source)
  validateVersions(source.stats, target)
  ensureTargetEmpty(target)
  console.log('VISTA PREVIA CORRECTA. Ninguna base fue modificada. Realiza --backup y despues --restore en una base NUEVA.')
}

async function backup() {
  const source = await inspectSource()
  showStats(source.stats, 'Origen LOCAL')
  showSynthetic(source)
  mkdirSync(archiveDir, { recursive: true })
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
  const hostPath = path.join(archiveDir, `viviendas-leon-${stamp}.dump`)
  const tmp = dockerTemp()
  try {
    docker(['exec', '-e', 'PGPASSWORD', container, 'pg_dump',
      '-h', '127.0.0.1', '-p', '5432', '-U', source.local.username,
      '-d', source.local.database, '-Fc', '--no-owner', '--no-acl', '-f', tmp], source.local.password)
    docker(['cp', `${container}:${tmp}`, hostPath])
    if (!existsSync(hostPath) || statSync(hostPath).size < 64) throw new Error('El respaldo resulto vacio.')
    console.log(`RESPALDO CREADO: ${hostPath}`)
    console.log('Contiene datos personales y hashes. Guardalo de forma privada y NO lo subas a GitHub.')
  } finally {
    try { docker(['exec', container, 'rm', '-f', tmp]) } catch { /* no sustituir el error principal */ }
  }
}

async function restore(filename) {
  const hostPath = path.resolve(filename)
  if (!existsSync(hostPath) || statSync(hostPath).size < 64) throw new Error('El archivo .dump no existe o esta vacio.')
  const source = await inspectSource()
  const { target, stats } = await inspectTarget()
  showStats(source.stats, 'Origen LOCAL')
  showStats(stats, 'Destino Railway NUEVO')
  showSynthetic(source)
  validateVersions(source.stats, stats)
  ensureTargetEmpty(stats)
  const tmp = dockerTemp()
  try {
    docker(['cp', hostPath, `${container}:${tmp}`])
    docker(['exec', container, 'pg_restore', '--list', tmp])
    console.log('El respaldo se restablecera solo en la SEGUNDA base Railway que esta vacia.')
    docker(['exec', '-e', 'PGPASSWORD', '-e', 'PGSSLMODE=require', container,
      'pg_restore', '-h', target.host, '-p', target.port, '-U', target.username,
      '-d', target.database, '--no-owner', '--no-privileges',
      '--single-transaction', '--exit-on-error', tmp], target.password)
    console.log('RESTAURACION COMPLETADA en base aislada. Ejecuta --verify antes de modificar api.DATABASE_URL.')
  } finally {
    try { docker(['exec', container, 'rm', '-f', tmp]) } catch { /* limpieza best effort */ }
  }
}

async function verify() {
  const source = await inspectSource()
  const { stats: target } = await inspectTarget()
  showStats(source.stats, 'Origen LOCAL')
  showStats(target, 'Railway NUEVO')
  const missing = source.stats.names.filter((table) => !target.counts.has(table))
  const extra = target.names.filter((table) => !source.stats.counts.has(table))
  const different = source.stats.names.filter((table) => target.counts.has(table) && source.stats.counts.get(table) !== target.counts.get(table))
  if (missing.length || extra.length || different.length) {
    if (missing.length) console.error(`Tablas faltantes: ${missing.join(', ')}`)
    if (extra.length) console.error(`Tablas adicionales: ${extra.join(', ')}`)
    for (const table of different) console.error(`${table}: local=${source.stats.counts.get(table)}, Railway=${target.counts.get(table)}`)
    throw new Error('NO coinciden todas las tablas/filas. No cambiar la conexion de la API.')
  }
  console.log('VERIFICACION DE CANTIDADES CORRECTA en todas las tablas. Aun faltan la revision de cuentas sinteticas y los archivos storage/.')
}

try {
  if (mode === '--preview') await preview()
  if (mode === '--backup') await backup()
  if (mode === '--restore') await restore(process.argv[3])
  if (mode === '--verify') await verify()
} catch (error) {
  console.error(`OPERACION CANCELADA: ${error instanceof Error ? error.message : 'error desconocido'}`)
  process.exitCode = 1
}
