/**
 * Migración controlada de cuentas de PostgreSQL local a una base Railway NUEVA.
 * - Solo usuarios institucionales, roles y fotos de perfil.
 * - Conserva hashes Argon2 e IDs de usuario; nunca exporta credenciales.
 * - Omite cuentas sintéticas; solo reconcilia 8 accesos de pantalla del rol técnico.
 * - Nunca copia permisos SYN-* del seed de pruebas.
 * - Requiere destino sin usuarios; usa transacción para todo el import.
 *
 * Ejecutar desde la raíz del repositorio: node apps/api/scripts/migrar-usuarios-railway.mjs --preview
 * Ver docs/MIGRACION-USUARIOS-RAILWAY.md
 */
import pg from 'pg'
import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'node:url'

loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true })

const mode = process.argv[2] ?? '--preview'
if (!['--preview', '--apply'].includes(mode) || process.argv.length > 3) {
  console.error('Uso: node apps/api/scripts/migrar-usuarios-railway.mjs [--preview|--apply]')
  process.exit(2)
}

const localUrl = process.env.LOCAL_DATABASE_URL ?? process.env.DATABASE_URL
const railwayUrl = process.env.RAILWAY_DATABASE_URL

if (!localUrl || !railwayUrl) {
  console.error('Falta DATABASE_URL local (apps/api/.env) o RAILWAY_DATABASE_URL del túnel Railway.')
  process.exit(2)
}

function locationOf(url, label) {
  try {
    const value = new URL(url)
    if (!['postgres:', 'postgresql:'].includes(value.protocol)) {
      throw new Error('protocolo inválido')
    }
    return value
  } catch {
    throw new Error(`La URL de ${label} no es una cadena PostgreSQL válida.`)
  }
}

const localLocation = locationOf(localUrl, 'origen')
const targetLocation = locationOf(railwayUrl, 'destino')
const localHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
if (!localHosts.has(localLocation.hostname)) {
  throw new Error('El origen debe ser PostgreSQL LOCAL (localhost); revisa apps/api/.env.')
}
// Los destinos permitidos son el tunel SSH local de Railway o su TCP proxy
// publico oficial. Rechazar dominios arbitrarios reduce el riesgo de enviar
// hashes de contrasenas a una base equivocada.
const isTunnel = localHosts.has(targetLocation.hostname)
const isRailwayTcpProxy = /^[a-z0-9-]+\.proxy\.rlwy\.net$/i.test(targetLocation.hostname)
if (!isTunnel && !isRailwayTcpProxy) {
  throw new Error('El destino debe ser el tunel local de Railway o un host *.proxy.rlwy.net.')
}
if (isRailwayTcpProxy) {
  if (!targetLocation.port) {
    throw new Error('Falta el puerto publico TCP asignado por Railway.')
  }
  if (!['require', 'verify-full', 'verify-ca'].includes(targetLocation.searchParams.get('sslmode'))) {
    throw new Error('Para el proxy TCP exige una URL con sslmode=require o verificacion TLS mas estricta.')
  }
}
if (
  localLocation.hostname === targetLocation.hostname &&
  (localLocation.port || '5432') === (targetLocation.port || '5432') &&
  localLocation.pathname === targetLocation.pathname
) {
  throw new Error('El origen y el destino parecen ser la misma base. Operación cancelada.')
}

// Solo se permiten estas diferencias de configuración, verificadas con el
// código de navegación y la matriz de accesos institucionales.
const rolTecnico = 'Técnico agropecuario'
const pantallasTecnico = [
  'PANTALLA_CONTROL_FITOSANITARIO',
  'PANTALLA_FAMILIAS',
  'PANTALLA_FAMILIAS_CREAR',
  'PANTALLA_FAMILIAS_DETALLE',
  'PANTALLA_GESTION_AGRICOLA',
  'PANTALLA_VISITAS_AGENDA',
  'PANTALLA_VISITAS_HISTORIAL',
  'PANTALLA_VISITAS_NUEVA',
]
const pantallasPermitidas = new Set(pantallasTecnico)
const permisosSinteticosExcluidos = new Set(['SYN-AGRICULTURA-WRITE', 'SYN-VISITAS-WRITE'])

const source = new pg.Client({ connectionString: localUrl, connectionTimeoutMillis: 8000 })
const target = new pg.Client({ connectionString: railwayUrl, connectionTimeoutMillis: 8000 })

const userSql = `
  SELECT u.id, u.nombre, u.apellido, u.telefono, u.departamento, u.municipio,
    u.direccion, u.correo, u.password_hash, u.debe_cambiar_password,
    u.estado, u.ultimo_acceso, u.fecha_creacion,
    COALESCE(array_agg(DISTINCT r.nombre) FILTER (WHERE r.nombre IS NOT NULL), '{}') AS roles
  FROM usuario u
  LEFT JOIN usuario_rol ur ON ur.usuario_id = u.id
  LEFT JOIN rol r ON r.id = ur.rol_id
  GROUP BY u.id
  ORDER BY u.id
`

function esCuentaDePrueba(usuario) {
  const email = usuario.correo?.trim().toLowerCase() ?? ''
  return email === 'dev@viviendas-leon.test' || email.endsWith('@pruebas.invalid') ||
    /sint[eé]tic[oa]|fictici[oa]/i.test(usuario.nombre)
}

function esHashArgon2(value) {
  return typeof value === 'string' && /^\$argon2(?:id|i|d)\$/.test(value)
}

function agruparPermisos(rows) {
  const map = new Map()
  for (const { nombre, codigo } of rows) {
    if (!map.has(nombre)) map.set(nombre, new Set())
    if (codigo) map.get(nombre).add(codigo)
  }
  return map
}

async function main() {
  await source.connect()
  await target.connect()

  const allUsers = (await source.query(userSql)).rows
  const users = allUsers.filter((u) => !esCuentaDePrueba(u))
  const omitted = allUsers.length - users.length

  if (!users.length) {
    throw new Error(`No existen usuarios institucionales para migrar (${omitted} cuentas de prueba excluidas).`)
  }
  const invalidUsers = users.filter((u) => !esHashArgon2(u.password_hash) || !u.roles.length)
  if (invalidUsers.length) {
    throw new Error(`${invalidUsers.length} usuario(s) tienen un hash no válido o no tienen rol. Se canceló la operación.`)
  }

  const targetCount = Number((await target.query('SELECT COUNT(*) AS n FROM usuario')).rows[0].n)
  if (targetCount !== 0) {
    throw new Error(`La base de Railway ya tiene ${targetCount} usuario(s). No se copiará sobre cuentas existentes.`)
  }

  const roles = [...new Set(users.flatMap((u) => u.roles))].sort()
  const destinationRoles = (await target.query('SELECT id, nombre, activo FROM rol')).rows
  const roleIds = new Map(destinationRoles.filter((r) => r.activo).map((r) => [r.nombre, r.id]))
  const missing = roles.filter((name) => !roleIds.has(name))
  if (missing.length) {
    throw new Error(`Faltan roles activos en Railway: ${missing.join(', ')}. No se copiarán usuarios con permisos incorrectos.`)
  }

  // Verificar que las migraciones hayan generado permisos equivalentes.
  const rolePermSql = `
    SELECT r.nombre, p.codigo
    FROM rol r
    LEFT JOIN rol_permiso rp ON rp.rol_id = r.id
    LEFT JOIN permiso p ON p.id = rp.permiso_id
    WHERE r.nombre = ANY($1::text[])
  `
  const sourcePermissions = agruparPermisos((await source.query(rolePermSql, [roles])).rows)
  const targetPermissions = agruparPermisos((await target.query(rolePermSql, [roles])).rows)
  const mismatches = []
  const pantallasAAgregar = []
  const sinteticOmitidos = []
  for (const role of roles) {
    const localSet = sourcePermissions.get(role) ?? new Set()
    const railwaySet = targetPermissions.get(role) ?? new Set()
    const soloLocal = [...localSet].filter((code) => !railwaySet.has(code)).sort()
    const soloRailway = [...railwaySet].filter((code) => !localSet.has(code)).sort()
    if (role === rolTecnico && soloRailway.length === 0 &&
        soloLocal.every((code) => pantallasPermitidas.has(code) || permisosSinteticosExcluidos.has(code))) {
      pantallasAAgregar.push(...soloLocal.filter((code) => pantallasPermitidas.has(code)))
      sinteticOmitidos.push(...soloLocal.filter((code) => permisosSinteticosExcluidos.has(code)))
      continue
    }
    if (soloLocal.length || soloRailway.length) mismatches.push({ role, soloLocal, soloRailway })
  }
  if (mismatches.length) {
    console.error('\nDIFERENCIAS DE PERMISOS NO AUTORIZADAS (sin cambios en ninguna base):')
    for (const { role, soloLocal, soloRailway } of mismatches) {
      console.error(`\nRol: ${role}`)
      console.error(`  Solo en PostgreSQL LOCAL (${soloLocal.length}): ${soloLocal.join(', ') || 'ninguno'}`)
      console.error(`  Solo en RAILWAY (${soloRailway.length}): ${soloRailway.join(', ') || 'ninguno'}`)
    }
    throw new Error('Diferencias distintas a las 8 pantallas técnicas y 2 permisos SYN conocidos. Revisar antes de importar.')
  }
  // No inventar códigos nuevos: los permisos oficiales deben existir en el
  // catálogo de Railway gracias a las migraciones de Prisma.
  if (pantallasAAgregar.length) {
    const existing = (await target.query('SELECT codigo FROM permiso WHERE codigo = ANY($1::text[])',
      [pantallasAAgregar])).rows.map((row) => row.codigo)
    const missingCatalog = pantallasAAgregar.filter((code) => !existing.includes(code))
    if (missingCatalog.length) {
      throw new Error(`Faltan permisos de pantalla en el catálogo Railway: ${missingCatalog.join(', ')}.`)
    }
  }

  const ids = users.map((u) => u.id)
  const photos = (await source.query(
    'SELECT usuario_id, mime_type, contenido, actualizada_en FROM usuario_foto_perfil WHERE usuario_id = ANY($1::int[])',
    [ids],
  )).rows
  const statuses = Object.entries(users.reduce((acc, u) => {
    acc[u.estado] = (acc[u.estado] ?? 0) + 1
    return acc
  }, {})).map(([status, count]) => `${status}: ${count}`).join(', ')

  console.log(`Origen: PostgreSQL local; destino: Railway (${isTunnel ? 'tunel privado' : 'proxy TCP temporal con TLS'}).`)
  console.log(`Cuentas institucionales: ${users.length} (${statuses})`)
  console.log(`Cuentas de prueba excluidas: ${omitted}`)
  console.log(`Roles comprobados: ${roles.join(', ')}`)
  console.log(`Fotos de perfil a copiar: ${photos.length}`)
  console.log('Cuentas actuales en Railway: 0')
  console.log(`Permisos de pantalla que se agregarán al Técnico (${pantallasAAgregar.length}): ${pantallasAAgregar.join(', ') || 'ninguno'}`)
  console.log(`Permisos sintéticos excluidos (${sinteticOmitidos.length}): ${sinteticOmitidos.join(', ') || 'ninguno'}`)

  if (mode === '--preview') {
    console.log('VISTA PREVIA: no se realizó ninguna escritura. Ejecuta --apply tras revisar este resumen.')
    return
  }

  await target.query('BEGIN')
  try {
    // Volver a comprobar dentro de la transacción, y bloquear la tabla para evitar
    // una alta simultánea mientras se importan los IDs originales.
    await target.query('LOCK TABLE usuario IN SHARE ROW EXCLUSIVE MODE')
    const liveCount = Number((await target.query('SELECT COUNT(*) AS n FROM usuario')).rows[0].n)
    if (liveCount) throw new Error('Se detectó un usuario nuevo en Railway; migración cancelada.')

    // Los permisos se agregan en la MISMA transacción que los usuarios.
    // Un error posterior revierte ambas operaciones.
    if (pantallasAAgregar.length) {
      await target.query('LOCK TABLE rol_permiso IN SHARE ROW EXCLUSIVE MODE')
      const actual = agruparPermisos((await target.query(rolePermSql, [roles])).rows)
      for (const role of roles) {
        const alInicio = targetPermissions.get(role) ?? new Set()
        const ahora = actual.get(role) ?? new Set()
        if (alInicio.size !== ahora.size || [...alInicio].some((code) => !ahora.has(code))) {
          throw new Error('Los permisos de Railway cambiaron durante el proceso. Reintentar desde --preview.')
        }
      }
      const result = await target.query(`
        INSERT INTO rol_permiso (rol_id, permiso_id)
        SELECT $1, p.id FROM permiso p WHERE p.codigo = ANY($2::text[])
        ON CONFLICT (rol_id, permiso_id) DO NOTHING
      `, [roleIds.get(rolTecnico), pantallasAAgregar])
      if (result.rowCount !== pantallasAAgregar.length) {
        throw new Error('No se pudo asociar exactamente el número esperado de permisos técnicos.')
      }
    }

    for (const u of users) {
      await target.query(`
        INSERT INTO usuario
          (id, nombre, apellido, telefono, departamento, municipio, direccion, correo,
           password_hash, debe_cambiar_password, estado, ultimo_acceso, fecha_creacion)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      `, [u.id, u.nombre, u.apellido, u.telefono, u.departamento, u.municipio,
        u.direccion, u.correo, u.password_hash, u.debe_cambiar_password,
        u.estado, u.ultimo_acceso, u.fecha_creacion])

      for (const role of u.roles) {
        await target.query('INSERT INTO usuario_rol (usuario_id, rol_id) VALUES ($1, $2)',
          [u.id, roleIds.get(role)])
      }
    }

    for (const photo of photos) {
      await target.query(`
        INSERT INTO usuario_foto_perfil (usuario_id, mime_type, contenido, actualizada_en)
        VALUES ($1,$2,$3,$4)
      `, [photo.usuario_id, photo.mime_type, photo.contenido, photo.actualizada_en])
    }

    // El próximo ID autoincremental debe ser mayor al último ID importado.
    await target.query(`
      SELECT setval(pg_get_serial_sequence('usuario', 'id'), (SELECT MAX(id) FROM usuario), true)
    `)
    await target.query('COMMIT')
    console.log(`IMPORTACIÓN COMPLETADA: ${users.length} usuarios, ${photos.length} fotos y ${pantallasAAgregar.length} permisos de pantalla del Técnico.`)
    console.log('No se transfirieron sesiones, bitácoras, familias, visitas ni notificaciones.')
  } catch (error) {
    await target.query('ROLLBACK')
    throw error
  }
}

try {
  await main()
} catch (error) {
  console.error(`MIGRACIÓN CANCELADA: ${error instanceof Error ? error.message : 'error desconocido'}`)
  process.exitCode = 1
} finally {
  await Promise.allSettled([source.end(), target.end()])
}
