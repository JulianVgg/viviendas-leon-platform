import { MAX_DATABASE_INTEGER, validateFamilyInput } from './families.validation.js'
import type { ValidationDetail } from './families.types.js'
import type { FamilyMemberInput, FamilyProgramInput, IntegralFamilyInput } from './families-integral.types.js'

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function rejectUnknown(input: Record<string, unknown>, allowed: string[], path: string, details: ValidationDetail[]) {
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) details.push({ field: `${path}${key}`, message: 'Este campo no está permitido.' })
  }
}

function optionalText(value: unknown, field: string, details: ValidationDetail[]): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string') {
    details.push({ field, message: 'Este campo debe ser texto.' })
    return null
  }
  return value.trim() || null
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
  const members: FamilyMemberInput[] = []
  if (!Array.isArray(body.integrantes) || body.integrantes.length === 0) {
    details.push({ field: 'integrantes', message: 'Incluye al menos un integrante.' })
  } else {
    body.integrantes.forEach((member: unknown, index: number) => {
      const path = `integrantes[${index}].`
      if (!isObject(member)) { details.push({ field: `integrantes[${index}]`, message: 'Se requiere un objeto.' }); return }
      rejectUnknown(member, ['nombreCompleto', 'fechaNacimiento', 'sexo', 'parentesco', 'telefono', 'observaciones'], path, details)
      const name = typeof member.nombreCompleto === 'string' ? member.nombreCompleto.trim() : ''
      if (!name) details.push({ field: `${path}nombreCompleto`, message: 'El nombre completo es obligatorio y no puede estar vacío.' })
      members.push({
        nombreCompleto: name,
        fechaNacimiento: optionalDate(member.fechaNacimiento, `${path}fechaNacimiento`, details),
        sexo: optionalText(member.sexo, `${path}sexo`, details),
        parentesco: optionalText(member.parentesco, `${path}parentesco`, details),
        telefono: optionalText(member.telefono, `${path}telefono`, details),
        observaciones: optionalText(member.observaciones, `${path}observaciones`, details),
      })
    })
  }
  const programs: FamilyProgramInput[] = []
  const seen = new Set<number>()
  if (!Array.isArray(body.programas) || body.programas.length === 0) {
    details.push({ field: 'programas', message: 'Incluye al menos un programa.' })
  } else {
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
