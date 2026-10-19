export type CommunityInput = { nombre: string; municipioId: number }
export type FieldError = { field: string; message: string }

const MAX_INTEGER = 2_147_483_647
export const MAX_COMMUNITY_NAME = 120

export function parseCommunityId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id <= MAX_INTEGER ? id : null
}

export function validateCommunityInput(body: unknown): { data?: CommunityInput; details: FieldError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { details: [{ field: 'body', message: 'Se requiere un objeto con los datos de la comunidad.' }] }
  }
  const fields = body as Record<string, unknown>
  const details: FieldError[] = []
  for (const key of Object.keys(fields)) {
    if (!['nombre', 'municipioId'].includes(key)) {
      details.push({ field: key, message: 'Este campo no está permitido.' })
    }
  }
  const nombre = typeof fields.nombre === 'string'
    ? fields.nombre.normalize('NFC').trim().replace(/\s+/g, ' ')
    : ''
  if (!nombre || nombre.length > MAX_COMMUNITY_NAME || /[\u0000-\u001f\u007f]/.test(nombre)) {
    details.push({ field: 'nombre', message: `Ingresa un nombre válido de hasta ${MAX_COMMUNITY_NAME} caracteres.` })
  }
  const municipioId = fields.municipioId
  if (typeof municipioId !== 'number' || !Number.isSafeInteger(municipioId) || municipioId < 1 || municipioId > MAX_INTEGER) {
    details.push({ field: 'municipioId', message: 'Selecciona un municipio válido.' })
  }
  return details.length ? { details } : { data: { nombre, municipioId: municipioId as number }, details }
}

export function validateCommunityState(body: unknown): { data?: { activo: boolean }; details: FieldError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { details: [{ field: 'body', message: 'Se requiere el estado de la comunidad.' }] }
  }
  const fields = body as Record<string, unknown>
  const details: FieldError[] = []
  for (const key of Object.keys(fields)) {
    if (key !== 'activo') details.push({ field: key, message: 'Este campo no está permitido.' })
  }
  if (typeof fields.activo !== 'boolean') {
    details.push({ field: 'activo', message: 'El estado debe ser verdadero o falso.' })
  }
  return details.length ? { details } : { data: { activo: fields.activo as boolean }, details }
}
