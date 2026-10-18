import type {
  FamilyMemberCreateInput,
  FamilyMemberStateInput,
  FamilyMemberUpdateInput,
  FamilyUpdateInput,
  ValidationDetail,
} from './families.types.js'
import { MAX_DATABASE_INTEGER, MAX_OBSERVATIONS_LENGTH, MAX_REFERENCE_NAME_LENGTH } from './families.validation.js'

const MEMBER_NAME_MAX = 150
const PHONE_MAX = 30
const VERSION_PATTERN = /^\d{1,10}$/
const SEX_OPTIONS = ['Masculino', 'Femenino']
const RELATIONSHIP_OPTIONS = ['Padre', 'Madre', 'Hijo', 'Hija', 'Abuela', 'Abuelo', 'Cuñado', 'Cuñada']
const has = (input: Record<string, unknown>, field: string) => Object.prototype.hasOwnProperty.call(input, field)

function objectInput(body: unknown, allowed: string[], details: ValidationDetail[]) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    details.push({ field: 'body', message: 'Se requiere un objeto JSON válido.' })
    return null
  }
  const input = body as Record<string, unknown>
  for (const field of Object.keys(input)) {
    if (!allowed.includes(field)) details.push({ field, message: 'Este campo no está permitido.' })
  }
  return input
}

function versionValue(value: unknown, details: ValidationDetail[]) {
  if (typeof value !== 'string' || !VERSION_PATTERN.test(value) || Number(value) > 4_294_967_295) {
    details.push({ field: 'version', message: 'La versión del registro no es válida.' })
    return ''
  }
  return value
}

function positiveId(value: unknown, field: string, details: ValidationDetail[]) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0 || value > MAX_DATABASE_INTEGER) {
    details.push({ field, message: 'Selecciona una comunidad válida.' })
    return 0
  }
  return value
}

function dateValue(value: unknown, field: string, details: ValidationDetail[], nullable: boolean): Date | null {
  if (value === null && nullable) return null
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) {
    details.push({ field, message: 'Introduce una fecha existente en formato YYYY-MM-DD.' })
    return null
  }
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    details.push({ field, message: 'Introduce una fecha existente en formato YYYY-MM-DD.' })
    return null
  }
  return date
}

function requiredText(value: unknown, field: string, max: number, details: ValidationDetail[]) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.length > max) details.push({ field, message: `Este campo es obligatorio y admite hasta ${max} caracteres.` })
  return text
}

function nullableText(value: unknown, field: string, max: number, details: ValidationDetail[]) {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || value.trim().length > max) {
    details.push({ field, message: `Este campo admite hasta ${max} caracteres.` })
    return null
  }
  return value.trim() || null
}

function optionValue(value: unknown, field: string, options: string[], details: ValidationDetail[], nullable: boolean) {
  if (value === null && nullable) return null
  if (typeof value !== 'string' || !options.includes(value)) {
    details.push({ field, message: `Selecciona una opción válida para ${field}.` })
    return null
  }
  return value
}

export function validateFamilyUpdate(body: unknown): { data?: FamilyUpdateInput; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  const allowed = ['nombreReferencia', 'comunidadId', 'fechaIngreso', 'observaciones', 'version']
  const input = objectInput(body, allowed, details)
  if (!input) return { details }
  const data: FamilyUpdateInput = { version: versionValue(input.version, details) }
  if (has(input, 'nombreReferencia')) data.nombreReferencia = requiredText(input.nombreReferencia, 'nombreReferencia', MAX_REFERENCE_NAME_LENGTH, details)
  if (has(input, 'comunidadId')) data.comunidadId = positiveId(input.comunidadId, 'comunidadId', details)
  if (has(input, 'fechaIngreso')) data.fechaIngreso = dateValue(input.fechaIngreso, 'fechaIngreso', details, true)
  if (has(input, 'observaciones')) data.observaciones = nullableText(input.observaciones, 'observaciones', MAX_OBSERVATIONS_LENGTH, details)
  if (!allowed.slice(0, -1).some((field) => has(input, field))) details.push({ field: 'body', message: 'Incluye al menos un campo para actualizar.' })
  return details.length ? { details } : { data, details }
}

export function validateMemberCreate(body: unknown): { data?: FamilyMemberCreateInput; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  const input = objectInput(body, ['nombreCompleto', 'fechaNacimiento', 'sexo', 'parentesco', 'telefono', 'observaciones'], details)
  if (!input) return { details }
  const data: FamilyMemberCreateInput = {
    nombreCompleto: requiredText(input.nombreCompleto, 'nombreCompleto', MEMBER_NAME_MAX, details),
    fechaNacimiento: dateValue(input.fechaNacimiento, 'fechaNacimiento', details, false) as Date,
    sexo: optionValue(input.sexo, 'sexo', SEX_OPTIONS, details, false) as string,
    parentesco: optionValue(input.parentesco, 'parentesco', RELATIONSHIP_OPTIONS, details, false) as string,
    telefono: nullableText(input.telefono, 'telefono', PHONE_MAX, details),
    observaciones: nullableText(input.observaciones, 'observaciones', MAX_OBSERVATIONS_LENGTH, details),
  }
  return details.length ? { details } : { data, details }
}

export function validateMemberUpdate(body: unknown): { data?: FamilyMemberUpdateInput; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  const fields = ['nombreCompleto', 'fechaNacimiento', 'sexo', 'parentesco', 'telefono', 'observaciones']
  const input = objectInput(body, [...fields, 'version'], details)
  if (!input) return { details }
  const data: FamilyMemberUpdateInput = { version: versionValue(input.version, details) }
  if (has(input, 'nombreCompleto')) data.nombreCompleto = requiredText(input.nombreCompleto, 'nombreCompleto', MEMBER_NAME_MAX, details)
  if (has(input, 'fechaNacimiento')) data.fechaNacimiento = dateValue(input.fechaNacimiento, 'fechaNacimiento', details, true)
  if (has(input, 'sexo')) data.sexo = optionValue(input.sexo, 'sexo', SEX_OPTIONS, details, true)
  if (has(input, 'parentesco')) data.parentesco = optionValue(input.parentesco, 'parentesco', RELATIONSHIP_OPTIONS, details, true)
  if (has(input, 'telefono')) data.telefono = nullableText(input.telefono, 'telefono', PHONE_MAX, details)
  if (has(input, 'observaciones')) data.observaciones = nullableText(input.observaciones, 'observaciones', MAX_OBSERVATIONS_LENGTH, details)
  if (!fields.some((field) => has(input, field))) details.push({ field: 'body', message: 'Incluye al menos un campo para actualizar.' })
  return details.length ? { details } : { data, details }
}

export function validateMemberState(body: unknown): { data?: FamilyMemberStateInput; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  const input = objectInput(body, ['activo', 'version'], details)
  if (!input) return { details }
  if (typeof input.activo !== 'boolean') details.push({ field: 'activo', message: 'Indica si el integrante debe quedar activo o inactivo.' })
  const data = { activo: input.activo as boolean, version: versionValue(input.version, details) }
  return details.length ? { details } : { data, details }
}

export function validIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
