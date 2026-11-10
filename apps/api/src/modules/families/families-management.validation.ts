import type {
  FamilyMemberCreateInput,
  FamilyMemberStateInput,
  FamilyMemberUpdateInput,
  FamilyUpdateInput,
  ValidationDetail,
} from './families.types.js'
import { MAX_DATABASE_INTEGER, MAX_OBSERVATIONS_LENGTH, MAX_REFERENCE_NAME_LENGTH } from './families.validation.js'
import { validateCoordinates } from './family-coordinates.rules.js'
import { ALLOWED_SEX, MAX_MEMBER_NAME, MAX_PHONE_LENGTH, validMemberPhone, validMemberRole, validPersonName } from './families-field.rules.js'

const MEMBER_NAME_MAX = MAX_MEMBER_NAME
const PHONE_MAX = MAX_PHONE_LENGTH
const VERSION_PATTERN = /^\d{1,10}$/
const SEX_OPTIONS = ALLOWED_SEX
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
  if (field === 'fechaNacimiento' && value > new Date().toISOString().slice(0, 10)) {
    details.push({ field, message: 'La fecha de nacimiento no puede ser futura.' })
    return null
  }
  return date
}

function requiredText(value: unknown, field: string, max: number, details: ValidationDetail[]) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!validPersonName(text, max)) details.push({ field, message: `Usa entre 2 y ${max} caracteres, solo letras y signos de nombre.` })
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

function optionValue(value: unknown, field: string, options: readonly string[], details: ValidationDetail[], nullable: boolean) {
  if (value === null && nullable) return null
  if (typeof value !== 'string' || !options.includes(value)) {
    details.push({ field, message: `Selecciona una opción válida para ${field}.` })
    return null
  }
  return value
}

function roleValue(value: unknown, details: ValidationDetail[], nullable: boolean) {
  if (value == null && nullable) return null
  const role = typeof value === 'string' ? value.trim() : ''
  if (!validMemberRole(role)) { details.push({ field: 'parentesco', message: 'Indica un rol válido de hasta 60 caracteres.' }); return null }
  return role
}

function phoneValue(value: unknown, details: ValidationDetail[]) {
  const phone = nullableText(value, 'telefono', PHONE_MAX, details)
  if (!validMemberPhone(phone)) details.push({ field: 'telefono', message: 'Introduce un teléfono válido (al menos 8 dígitos).' })
  return phone
}

export function validateFamilyUpdate(body: unknown, allowEmpty = false): { data?: FamilyUpdateInput; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  const allowed = ['nombreReferencia', 'comunidadId', 'fechaIngreso', 'observaciones', 'latitud', 'longitud', 'version']
  const input = objectInput(body, allowed, details)
  if (!input) return { details }
  const data: FamilyUpdateInput = { version: versionValue(input.version, details) }
  if (has(input, 'nombreReferencia')) data.nombreReferencia = requiredText(input.nombreReferencia, 'nombreReferencia', MAX_REFERENCE_NAME_LENGTH, details)
  if (has(input, 'comunidadId')) data.comunidadId = positiveId(input.comunidadId, 'comunidadId', details)
  if (has(input, 'fechaIngreso')) data.fechaIngreso = dateValue(input.fechaIngreso, 'fechaIngreso', details, true)
  if (has(input, 'observaciones')) data.observaciones = nullableText(input.observaciones, 'observaciones', MAX_OBSERVATIONS_LENGTH, details)
  const coordinates = validateCoordinates(input)
  details.push(...coordinates.details)
  if (coordinates.data) Object.assign(data, coordinates.data)
  if (!allowEmpty && !allowed.slice(0, -1).some((field) => has(input, field))) details.push({ field: 'body', message: 'Incluye al menos un campo para actualizar.' })
  return details.length ? { details } : { data, details }
}

export function validateMemberCreate(body: unknown): { data?: FamilyMemberCreateInput; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  const input = objectInput(body, ['nombreCompleto', 'fechaNacimiento', 'sexo', 'parentesco', 'telefono', 'whatsappAutorizado', 'observaciones'], details)
  if (!input) return { details }
  if (input.whatsappAutorizado !== undefined && typeof input.whatsappAutorizado !== 'boolean')
    details.push({ field: 'whatsappAutorizado', message: 'La autorización debe ser verdadera o falsa.' })
  const data: FamilyMemberCreateInput = {
    nombreCompleto: requiredText(input.nombreCompleto, 'nombreCompleto', MEMBER_NAME_MAX, details),
    fechaNacimiento: dateValue(input.fechaNacimiento, 'fechaNacimiento', details, false) as Date,
    sexo: optionValue(input.sexo, 'sexo', SEX_OPTIONS, details, false) as string,
    parentesco: roleValue(input.parentesco, details, false) as string,
    telefono: phoneValue(input.telefono, details),
    ...(input.whatsappAutorizado !== undefined ? { whatsappAutorizado: input.whatsappAutorizado === true } : {}),
    observaciones: nullableText(input.observaciones, 'observaciones', MAX_OBSERVATIONS_LENGTH, details),
  }
  if (data.whatsappAutorizado && !data.telefono)
    details.push({ field: 'telefono', message: 'Registra un teléfono antes de autorizar WhatsApp.' })
  return details.length ? { details } : { data, details }
}

export function validateMemberUpdate(body: unknown): { data?: FamilyMemberUpdateInput; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  const fields = ['nombreCompleto', 'fechaNacimiento', 'sexo', 'parentesco', 'telefono', 'whatsappAutorizado', 'observaciones']
  const input = objectInput(body, [...fields, 'version'], details)
  if (!input) return { details }
  const data: FamilyMemberUpdateInput = { version: versionValue(input.version, details) }
  if (has(input, 'nombreCompleto')) data.nombreCompleto = requiredText(input.nombreCompleto, 'nombreCompleto', MEMBER_NAME_MAX, details)
  if (has(input, 'fechaNacimiento')) data.fechaNacimiento = dateValue(input.fechaNacimiento, 'fechaNacimiento', details, true)
  if (has(input, 'sexo')) data.sexo = optionValue(input.sexo, 'sexo', SEX_OPTIONS, details, true)
  if (has(input, 'parentesco')) data.parentesco = roleValue(input.parentesco, details, true)
  if (has(input, 'telefono')) data.telefono = phoneValue(input.telefono, details)
  if (has(input, 'whatsappAutorizado')) {
    if (typeof input.whatsappAutorizado !== 'boolean')
      details.push({ field: 'whatsappAutorizado', message: 'La autorización debe ser verdadera o falsa.' })
    else data.whatsappAutorizado = input.whatsappAutorizado
  }
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
