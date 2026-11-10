import { MAX_DATABASE_INTEGER, validateFamilyInput } from './families.validation.js'
import type { ValidationDetail } from './families.types.js'
import type { FamilyMemberInput, FamilyProgramInput, IntegralFamilyInput } from './families-integral.types.js'
import { ALLOWED_SEX, MAX_INTEGRAL_MEMBERS, MAX_INTEGRAL_PROGRAMS, MAX_MEMBER_NAME, MAX_ROLE_NAME, MAX_PHONE_LENGTH, validMemberPhone, validMemberRole, validPersonName } from './families-field.rules.js'
import { MAX_OBSERVATIONS_LENGTH } from './families.validation.js'

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function rejectUnknown(input: Record<string, unknown>, allowed: string[], path: string, details: ValidationDetail[]) {
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) details.push({ field: `${path}${key}`, message: 'Este campo no está permitido.' })
  }
}

function optionalText(value: unknown, field: string, details: ValidationDetail[], max = MAX_OBSERVATIONS_LENGTH): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    details.push({ field, message: 'Este campo debe ser texto.' })
    return null
  }
  const cleaned = value.trim()
  if (cleaned.length > max) details.push({ field, message: `Máximo ${max} caracteres.` })
  return cleaned || null
}

function optionalDate(value: unknown, field: string, details: ValidationDetail[]): Date | null {
  if (value === undefined || value === null) return null
  const text = typeof value === 'string' ? value.trim() : ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(text) && !text.startsWith('0000')) {
    const date = new Date(`${text}T00:00:00.000Z`)
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text) return date
  }
  details.push({ field, message: 'Introduce una fecha existente en formato YYYY-MM-DD.' })
  return null
}

export function validateIntegralFamilyInput(body: unknown): { data?: IntegralFamilyInput; details: ValidationDetail[] } {
  if (!isObject(body)) return { details: [{ field: 'body', message: 'Se requiere un objeto con los datos de la familia.' }] }
  const details: ValidationDetail[] = []
  const familyFields = ['nombreReferencia', 'comunidadId', 'fechaIngreso', 'observaciones']
  rejectUnknown(body, [...familyFields, 'integrantes', 'programas'], '', details)
  const basic = validateFamilyInput(Object.fromEntries(familyFields.map((field) => [field, body[field]])))
  details.push(...basic.details)
  if (!body.fechaIngreso) details.push({ field: 'fechaIngreso', message: 'La fecha de ingreso es obligatoria.' })
  const members: FamilyMemberInput[] = []
  if (!Array.isArray(body.integrantes) || body.integrantes.length === 0) {
    details.push({ field: 'integrantes', message: 'Incluye al menos un integrante.' })
  } else {
    if (body.integrantes.length > MAX_INTEGRAL_MEMBERS) details.push({ field: 'integrantes', message: `Máximo ${MAX_INTEGRAL_MEMBERS} integrantes.` })
    body.integrantes.forEach((member: unknown, index: number) => {
      const path = `integrantes[${index}].`
      if (!isObject(member)) { details.push({ field: `integrantes[${index}]`, message: 'Se requiere un objeto.' }); return }
      rejectUnknown(member, ['nombreCompleto', 'fechaNacimiento', 'sexo', 'parentesco', 'telefono', 'observaciones'], path, details)
      const name = typeof member.nombreCompleto === 'string' ? member.nombreCompleto.trim() : ''
      if (!validPersonName(name, MAX_MEMBER_NAME)) details.push({ field: `${path}nombreCompleto`, message: 'Escribe un nombre válido de hasta 150 caracteres, sin números.' })
      if (member.fechaNacimiento == null) details.push({ field: `${path}fechaNacimiento`, message: 'La fecha de nacimiento es obligatoria.' })
      const sexo = optionalText(member.sexo, `${path}sexo`, details, 20)
      if (!sexo || !ALLOWED_SEX.includes(sexo)) details.push({ field: `${path}sexo`, message: 'Selecciona un sexo válido.' })
      const role = optionalText(member.parentesco, `${path}parentesco`, details, MAX_ROLE_NAME)
      if (!role || !validMemberRole(role)) details.push({ field: `${path}parentesco`, message: 'Indica un rol válido.' })
      const phone = optionalText(member.telefono, `${path}telefono`, details, MAX_PHONE_LENGTH)
      if (!validMemberPhone(phone)) details.push({ field: `${path}telefono`, message: 'Introduce un teléfono válido (mínimo 8 dígitos).' })
      if (typeof member.fechaNacimiento === 'string' && member.fechaNacimiento > new Date().toISOString().slice(0, 10)) details.push({ field: `${path}fechaNacimiento`, message: 'La fecha de nacimiento no puede ser futura.' })
      members.push({
        nombreCompleto: name,
        fechaNacimiento: optionalDate(member.fechaNacimiento, `${path}fechaNacimiento`, details),
        sexo,
        parentesco: role,
        telefono: phone,
        observaciones: optionalText(member.observaciones, `${path}observaciones`, details),
      })
    })
  }
  const programs: FamilyProgramInput[] = []
  const seen = new Set<number>()
  if (!Array.isArray(body.programas) || body.programas.length === 0) {
    details.push({ field: 'programas', message: 'Incluye al menos un programa.' })
  } else {
    if (body.programas.length > MAX_INTEGRAL_PROGRAMS) details.push({ field: 'programas', message: `Máximo ${MAX_INTEGRAL_PROGRAMS} programas.` })
    body.programas.forEach((program: unknown, index: number) => {
      const path = `programas[${index}].`
      if (!isObject(program)) { details.push({ field: `programas[${index}]`, message: 'Se requiere un objeto.' }); return }
      rejectUnknown(program, ['programaId', 'fechaIngreso', 'fechaSalida', 'estado', 'observaciones'], path, details)
      const id = program.programaId
      if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0 || id > MAX_DATABASE_INTEGER) {
        details.push({ field: `${path}programaId`, message: 'Selecciona un programa con identificador entero positivo válido.' })
      } else {
        if (seen.has(id)) details.push({ field: `${path}programaId`, message: 'No repitas un programa en la solicitud.' })
        seen.add(id)
      }
      const entry = optionalDate(program.fechaIngreso, `${path}fechaIngreso`, details)
      const exit = optionalDate(program.fechaSalida, `${path}fechaSalida`, details)
      if (entry && exit && exit < entry) details.push({ field: `${path}fechaSalida`, message: 'La fecha de salida no puede ser anterior a la fecha de ingreso.' })
      // El wizard anterior enviaba null. Respetamos esa compatibilidad, sin dejar un nuevo estado vacío.
      const estado = program.estado == null ? (exit ? 'FINALIZADO' : 'ACTIVO') : program.estado
      if (typeof estado !== 'string' || !['ACTIVO', 'FINALIZADO', 'RETIRADO'].includes(estado)) {
        details.push({ field: `${path}estado`, message: 'Selecciona ACTIVO, FINALIZADO o RETIRADO.' })
      }
      programs.push({
        programaId: id as number, fechaIngreso: entry, fechaSalida: exit,
        estado: typeof estado === 'string' ? estado : null,
        observaciones: optionalText(program.observaciones, `${path}observaciones`, details),
      })
    })
  }
  if (details.length || !basic.data) return { details }
  return { data: { ...basic.data, integrantes: members, programas: programs }, details }
}
