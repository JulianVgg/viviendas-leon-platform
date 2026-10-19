import { MAX_DATABASE_INTEGER } from './families.validation.js'
import type { ValidationDetail } from './families.types.js'

export const PARTICIPATION_STATES = ['ACTIVO', 'FINALIZADO', 'RETIRADO'] as const
export type ParticipationState = typeof PARTICIPATION_STATES[number]

export type ParticipationCreateInput = {
  programaId: number
  fechaIngreso: Date | null
  fechaSalida: Date | null
  estado: ParticipationState
  observaciones: string | null
}
export type ParticipationUpdateInput = Partial<Omit<ParticipationCreateInput, 'programaId'>> & { version: string }

type Result<T> = { data?: T; details: ValidationDetail[] }

function record(value: unknown, allowed: readonly string[], details: ValidationDetail[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    details.push({ field: 'body', message: 'Envía un objeto JSON válido.' })
    return null
  }
  const fields = value as Record<string, unknown>
  for (const key of Object.keys(fields)) {
    if (!allowed.includes(key)) details.push({ field: key, message: 'Este campo no está permitido.' })
  }
  return fields
}

function positiveId(value: unknown, details: ValidationDetail[]) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_DATABASE_INTEGER) {
    details.push({ field: 'programaId', message: 'Selecciona un programa válido.' })
    return 0
  }
  return value
}

function date(value: unknown, field: string, details: ValidationDetail[]) {
  if (value === null || value === '') return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000')) {
    const parsed = new Date(`${value}T00:00:00.000Z`)
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value) return parsed
  }
  details.push({ field, message: 'Introduce una fecha existente en formato YYYY-MM-DD o null.' })
  return null
}

function state(value: unknown, details: ValidationDetail[]): ParticipationState {
  if (typeof value === 'string' && (PARTICIPATION_STATES as readonly string[]).includes(value)) return value as ParticipationState
  details.push({ field: 'estado', message: 'Selecciona ACTIVO, FINALIZADO o RETIRADO.' })
  return 'ACTIVO'
}

function notes(value: unknown, details: ValidationDetail[]) {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || value.trim().length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
    details.push({ field: 'observaciones', message: 'Las observaciones deben ser texto de hasta 2000 caracteres.' })
    return null
  }
  return value.trim() || null
}

function validatePeriod(fechaIngreso: Date | null | undefined, fechaSalida: Date | null | undefined, details: ValidationDetail[]) {
  if (fechaIngreso && fechaSalida && fechaSalida < fechaIngreso) {
    details.push({ field: 'fechaSalida', message: 'La fecha de salida no puede ser anterior a la de ingreso.' })
  }
}

export function validateParticipationCreate(body: unknown): Result<ParticipationCreateInput> {
  const details: ValidationDetail[] = []
  const input = record(body, ['programaId', 'estado', 'fechaIngreso', 'fechaSalida', 'observaciones'], details)
  if (!input) return { details }
  const data: ParticipationCreateInput = {
    programaId: positiveId(input.programaId, details),
    estado: state(input.estado, details),
    fechaIngreso: input.fechaIngreso === undefined ? null : date(input.fechaIngreso, 'fechaIngreso', details),
    fechaSalida: input.fechaSalida === undefined ? null : date(input.fechaSalida, 'fechaSalida', details),
    observaciones: input.observaciones === undefined ? null : notes(input.observaciones, details),
  }
  validatePeriod(data.fechaIngreso, data.fechaSalida, details)
  return details.length ? { details } : { data, details }
}

export function validateParticipationUpdate(body: unknown): Result<ParticipationUpdateInput> {
  const details: ValidationDetail[] = []
  const allowed = ['estado', 'fechaIngreso', 'fechaSalida', 'observaciones']
  const input = record(body, [...allowed, 'version'], details)
  if (!input) return { details }
  const version = input.version
  if (typeof version !== 'string' || !/^\d{1,10}$/.test(version) || Number(version) > 4_294_967_295) {
    details.push({ field: 'version', message: 'La versión de la participación no es válida.' })
  }
  if (!allowed.some((key) => Object.prototype.hasOwnProperty.call(input, key))) {
    details.push({ field: 'body', message: 'Incluye al menos un campo para actualizar.' })
  }
  const data: ParticipationUpdateInput = { version: typeof version === 'string' ? version : '' }
  if ('estado' in input) data.estado = state(input.estado, details)
  if ('fechaIngreso' in input) data.fechaIngreso = date(input.fechaIngreso, 'fechaIngreso', details)
  if ('fechaSalida' in input) data.fechaSalida = date(input.fechaSalida, 'fechaSalida', details)
  if ('observaciones' in input) data.observaciones = notes(input.observaciones, details)
  validatePeriod(data.fechaIngreso, data.fechaSalida, details)
  return details.length ? { details } : { data, details }
}

export function validParticipationIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
