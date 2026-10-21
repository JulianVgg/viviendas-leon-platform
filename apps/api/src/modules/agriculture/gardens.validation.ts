export type GardenInput = {
  familiaId: number
  nombre: string | null
  tipo: 'FAMILIAR' | 'COMUNITARIO' | null
  fechaInicio: string | null
  estado: 'PLANIFICADO' | 'ACTIVO' | 'INACTIVO'
  observaciones: string | null
}

type ValidationDetail = { field: string; message: string }
const MAX_DB_ID = 2_147_483_647

export function parseGardenId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed <= MAX_DB_ID ? parsed : null
}

function optionalString(value: unknown, field: string, max: number, details: ValidationDetail[]): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.trim().length > max) {
    details.push({ field, message: `Ingresa un texto de hasta ${max} caracteres.` })
    return null
  }
  return value.trim() || null
}

function validDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const date = new Date(`${day}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(`${day}T`)
}

export function validateGardenInput(body: unknown): { data: GardenInput | null; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { data: null, details: [{ field: 'body', message: 'Debes enviar un objeto JSON.' }] }
  }
  const source = body as Record<string, unknown>
  const familiaId = Number.isInteger(source.familiaId) && Number(source.familiaId) > 0 && Number(source.familiaId) <= MAX_DB_ID
    ? Number(source.familiaId) : null
  if (familiaId === null) details.push({ field: 'familiaId', message: 'Selecciona una familia existente.' })
  const nombre = optionalString(source.nombre, 'nombre', 120, details)
  const observaciones = optionalString(source.observaciones, 'observaciones', 2000, details)
  const tipo = source.tipo === undefined || source.tipo === null || source.tipo === '' ? null : source.tipo
  if (tipo !== null && tipo !== 'FAMILIAR' && tipo !== 'COMUNITARIO') {
    details.push({ field: 'tipo', message: 'El tipo debe ser familiar o comunitario.' })
  }
  const estado = source.estado
  if (estado !== 'PLANIFICADO' && estado !== 'ACTIVO' && estado !== 'INACTIVO') {
    details.push({ field: 'estado', message: 'Selecciona un estado válido.' })
  }
  const fechaInicio = source.fechaInicio === undefined || source.fechaInicio === null || source.fechaInicio === '' ? null : source.fechaInicio
  if (fechaInicio !== null && (typeof fechaInicio !== 'string' || !validDay(fechaInicio))) {
    details.push({ field: 'fechaInicio', message: 'Ingresa una fecha válida (AAAA-MM-DD).' })
  }
  if (details.length || familiaId === null || (tipo !== null && tipo !== 'FAMILIAR' && tipo !== 'COMUNITARIO') ||
    (estado !== 'PLANIFICADO' && estado !== 'ACTIVO' && estado !== 'INACTIVO') ||
    (fechaInicio !== null && typeof fechaInicio !== 'string')) return { data: null, details }

  return { data: { familiaId, nombre, tipo, fechaInicio, estado, observaciones }, details: [] }
}
