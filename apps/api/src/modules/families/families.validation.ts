import type { FamilyCreateInput, ValidationDetail } from './families.types.js'

export const MAX_REFERENCE_NAME_LENGTH = 150
export const MAX_OBSERVATIONS_LENGTH = 2000
export const MAX_DATABASE_INTEGER = 2_147_483_647

export function parseFamilyId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isInteger(id) && id > 0 && id <= MAX_DATABASE_INTEGER ? id : null
}

export function validateFamilyInput(body: unknown): { data?: FamilyCreateInput; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { details: [{ field: 'body', message: 'Se requiere un objeto con los datos de la familia.' }] }
  }
  const input = body as Record<string, unknown>
  const allowedFields = ['nombreReferencia', 'comunidadId', 'fechaIngreso', 'observaciones']
  for (const field of Object.keys(input)) {
    if (!allowedFields.includes(field)) details.push({ field, message: 'Este campo no está permitido.' })
  }
  const name = typeof input.nombreReferencia === 'string' ? input.nombreReferencia.trim() : ''
  if (!name || name.length > MAX_REFERENCE_NAME_LENGTH) {
    details.push({ field: 'nombreReferencia', message: `El nombre es obligatorio y debe tener como máximo ${MAX_REFERENCE_NAME_LENGTH} caracteres.` })
  }
  const communityId = input.comunidadId
  if (typeof communityId !== 'number' || !Number.isInteger(communityId) || communityId <= 0 || communityId > MAX_DATABASE_INTEGER) {
    details.push({ field: 'comunidadId', message: 'Selecciona una comunidad válida.' })
  }
  let date: Date | null = null
  if (input.fechaIngreso !== undefined && input.fechaIngreso !== null) {
    const value = typeof input.fechaIngreso === 'string' ? input.fechaIngreso.trim() : ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000')) {
      const parsed = new Date(`${value}T00:00:00.000Z`)
      if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value) date = parsed
    }
    if (!date) details.push({ field: 'fechaIngreso', message: 'Introduce una fecha existente en formato YYYY-MM-DD.' })
  }
  let observations: string | null = null
  if (input.observaciones !== undefined && input.observaciones !== null) {
    if (typeof input.observaciones !== 'string' || input.observaciones.trim().length > MAX_OBSERVATIONS_LENGTH) {
      details.push({ field: 'observaciones', message: `Las observaciones deben ser texto de hasta ${MAX_OBSERVATIONS_LENGTH} caracteres.` })
    } else observations = input.observaciones.trim() || null
  }
  if (details.length) return { details }
  return { details, data: { nombreReferencia: name, comunidadId: communityId as number, fechaIngreso: date, observaciones: observations } }
}
