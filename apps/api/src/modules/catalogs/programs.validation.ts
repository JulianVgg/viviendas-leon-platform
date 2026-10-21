export type ProgramState = 'ACTIVO' | 'INACTIVO'
export type ProgramInput = {
  nombre: string
  descripcion: string | null
  fechaInicio: string | null
  fechaFin: string | null
  estado: ProgramState
}
export type ProgramFieldError = { field: string; message: string }

const ALLOWED_KEYS = new Set(['nombre', 'descripcion', 'fechaInicio', 'fechaFin', 'estado'])
const MAX_INTEGER = 2_147_483_647
export const MAX_PROGRAM_NAME = 120
export const MAX_PROGRAM_DESCRIPTION = 2000

export function parseProgramId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id <= MAX_INTEGER ? id : null
}

export function isValidDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validateProgramInput(body: unknown): { data?: ProgramInput; details: ProgramFieldError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { details: [{ field: 'body', message: 'Se requiere un objeto con los datos del programa.' }] }
  }
  const raw = body as Record<string, unknown>
  const details: ProgramFieldError[] = []
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) details.push({ field: key, message: 'Este campo no está permitido.' })
  }

  const nombre = typeof raw.nombre === 'string' ? raw.nombre.normalize('NFC').trim().replace(/\s+/g, ' ') : ''
  if (!nombre || nombre.length > MAX_PROGRAM_NAME || /[\u0000-\u001f\u007f]/.test(raw.nombre as string ?? '')) {
    details.push({ field: 'nombre', message: `Ingresa un nombre válido de hasta ${MAX_PROGRAM_NAME} caracteres.` })
  }

  let descripcion: string | null = null
  if (raw.descripcion !== undefined && raw.descripcion !== null) {
    if (typeof raw.descripcion !== 'string' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw.descripcion)) {
      details.push({ field: 'descripcion', message: 'La descripción contiene caracteres no permitidos.' })
    } else {
      descripcion = raw.descripcion.normalize('NFC').trim() || null
      if (descripcion && descripcion.length > MAX_PROGRAM_DESCRIPTION) {
        details.push({ field: 'descripcion', message: `La descripción no puede superar ${MAX_PROGRAM_DESCRIPTION} caracteres.` })
      }
    }
  }

  function parseDay(key: 'fechaInicio' | 'fechaFin'): string | null {
    const value = raw[key]
    if (value === undefined || value === null || value === '') return null
    if (typeof value !== 'string' || !isValidDay(value)) {
      details.push({ field: key, message: 'Introduce una fecha real en formato YYYY-MM-DD.' })
      return null
    }
    return value
  }
  const fechaInicio = parseDay('fechaInicio')
  const fechaFin = parseDay('fechaFin')
  if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
    details.push({ field: 'fechaFin', message: 'La fecha de finalización no puede ser anterior a la de inicio.' })
  }

  const estado = raw.estado === undefined ? 'ACTIVO' : raw.estado
  if (estado !== 'ACTIVO' && estado !== 'INACTIVO') {
    details.push({ field: 'estado', message: 'Selecciona ACTIVO o INACTIVO.' })
  }
  if (details.length) return { details }
  return { data: { nombre, descripcion, fechaInicio, fechaFin, estado: estado as ProgramState }, details }
}
