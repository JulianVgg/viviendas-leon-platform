export type MunicipalityInput = { nombre: string }
export type MunicipalityFieldError = { field: string; message: string }

const MAX_INTEGER = 2_147_483_647
export const MAX_MUNICIPALITY_NAME = 120

export function parseMunicipalityId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id <= MAX_INTEGER ? id : null
}

export function validateMunicipalityInput(body: unknown): { data?: MunicipalityInput; details: MunicipalityFieldError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { details: [{ field: 'body', message: 'Se requiere un objeto con los datos del municipio.' }] }
  }
  const fields = body as Record<string, unknown>
  const details: MunicipalityFieldError[] = []
  for (const key of Object.keys(fields)) {
    if (key !== 'nombre') details.push({ field: key, message: 'Este campo no está permitido.' })
  }
  const hasControls = typeof fields.nombre === 'string' && /[\u0000-\u001f\u007f]/.test(fields.nombre)
  const nombre = typeof fields.nombre === 'string'
    ? fields.nombre.normalize('NFC').trim().replace(/\s+/g, ' ')
    : ''
  if (!nombre || nombre.length > MAX_MUNICIPALITY_NAME || hasControls) {
    details.push({ field: 'nombre', message: `Ingresa un nombre válido de hasta ${MAX_MUNICIPALITY_NAME} caracteres.` })
  }
  return details.length ? { details } : { data: { nombre }, details }
}

export function validateMunicipalityState(body: unknown): { data?: { activo: boolean }; details: MunicipalityFieldError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { details: [{ field: 'body', message: 'Se requiere el estado del municipio.' }] }
  }
  const fields = body as Record<string, unknown>
  const details: MunicipalityFieldError[] = []
  for (const key of Object.keys(fields)) {
    if (key !== 'activo') details.push({ field: key, message: 'Este campo no está permitido.' })
  }
  if (typeof fields.activo !== 'boolean') details.push({ field: 'activo', message: 'El estado debe ser verdadero o falso.' })
  return details.length ? { details } : { data: { activo: fields.activo as boolean }, details }
}
