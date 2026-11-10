/** Reglas puras para clasificar operaciones, sin leer cuerpos ni credenciales. */
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE'
export type AuditOperation = { entidad: string; accion: AuditAction }

const RESOURCE_AREAS: ReadonlyArray<readonly [string, string]> = [
  ['/api/v1/usuarios', 'usuario'],
  ['/api/v1/roles', 'rol_permiso'],
  ['/api/v1/perfil', 'perfil'],
  ['/api/v1/familias', 'familia'],
  ['/api/v1/comunidades', 'comunidad'],
  ['/api/v1/municipios', 'municipio'],
  ['/api/v1/programas', 'programa'],
  ['/api/v1/huertos', 'huerto'],
  ['/api/v1/cultivos', 'cultivo'],
  ['/api/v1/insumos', 'insumo'],
  ['/api/v1/sanidad', 'sanidad'],
  ['/api/v1/ciclos-cultivo', 'ciclo_cultivo'],
  ['/api/v1/producciones', 'produccion'],
  ['/api/v1/visitas', 'visita'],
  ['/api/v1/capacitaciones', 'capacitacion'],
  ['/api/v1/calendario', 'calendario'],
  ['/api/v1/invitaciones', 'invitacion'],
  ['/api/v1/reportes', 'reporte'],
]

export function classifyAuditOperation(method: string, path: string): AuditOperation | null {
  if (method === 'POST' && path === '/api/v1/auth/login') return { entidad: 'autenticacion', accion: 'LOGIN' }
  if (method === 'POST' && path === '/api/v1/auth/logout') return { entidad: 'autenticacion', accion: 'LOGOUT' }
  if (method === 'PATCH' && path === '/api/v1/auth/password') return { entidad: 'autenticacion', accion: 'PASSWORD_CHANGE' }

  const actions: Record<string, AuditAction> = {
    POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE',
  }
  const accion = actions[method]
  if (!accion) return null

  for (const [prefix, entidad] of RESOURCE_AREAS) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return { entidad, accion }
  }
  return null
}

export function normalizedAuditPath(path: string): string {
  // Nunca persistir identificadores personales incrustados en una ruta.
  return path.split('/').map((part) =>
    /^\d+$/.test(part) || /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(part)
      ? ':id'
      : part.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60),
  ).join('/').slice(0, 240)
}

function safeId(value: unknown): string | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value)
  if (typeof value === 'string' && (/^[1-9]\d{0,14}$/.test(value) || /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value))) return value
  return null
}

export function responseRecordId(value: unknown): string | null {
  // Solo se extrae un ID predecible; no se guardan datos del cuerpo de respuesta.
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const direct = safeId(record.id)
  if (direct) return direct
  for (const key of ['data', 'usuario', 'familia', 'visita', 'huerto', 'ciclo', 'capacitacion', 'evento', 'rol', 'registro', 'resultado']) {
    const nested = record[key]
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) continue
    const nestedId = safeId((nested as Record<string, unknown>).id)
    if (nestedId) return nestedId
  }
  return null
}

export function pathRecordId(path: string): string | null {
  const ids = path.split('/').map(safeId).filter((id): id is string => id !== null)
  return ids.at(-1) ?? null
}

export function safeAuditMetadata(method: string, path: string, httpStatus: number): string {
  return JSON.stringify({
    metodo: method,
    ruta: normalizedAuditPath(path),
    estadoHttp: httpStatus,
    resultado: httpStatus >= 200 && httpStatus < 400 ? 'EXITOSO' : 'RECHAZADO',
  })
}
