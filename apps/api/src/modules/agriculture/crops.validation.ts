export type CropInput = { nombre: string; descripcion: string | null; activo: boolean }
export type CropFieldError = { field: string; message: string }
const allowed = new Set(['nombre', 'descripcion', 'activo'])
const maxId = 2_147_483_647

export function parseCropId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id <= maxId ? id : null
}

export function validateCropInput(body: unknown): { data?: CropInput; details: CropFieldError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { details: [{ field: 'body', message: 'Envía un objeto JSON con los datos del cultivo.' }] }
  }
  const raw = body as Record<string, unknown>
  const details: CropFieldError[] = []
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) details.push({ field: key, message: 'Este campo no está permitido.' })
  }
  const nombre = typeof raw.nombre === 'string' ? raw.nombre.normalize('NFC').trim().replace(/\s+/g, ' ') : ''
  if (!nombre || nombre.length > 120 || /[\u0000-\u001f\u007f]/.test(raw.nombre as string ?? '')) {
    details.push({ field: 'nombre', message: 'Ingresa un nombre válido de hasta 120 caracteres.' })
  }
  let descripcion: string | null = null
  if (raw.descripcion !== undefined && raw.descripcion !== null) {
    if (typeof raw.descripcion !== 'string' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(raw.descripcion)) {
      details.push({ field: 'descripcion', message: 'La descripción contiene caracteres no permitidos.' })
    } else {
      descripcion = raw.descripcion.normalize('NFC').trim() || null
      if (descripcion && descripcion.length > 2000) {
        details.push({ field: 'descripcion', message: 'La descripción no puede superar 2000 caracteres.' })
      }
    }
  }
  const activo = raw.activo === undefined ? true : raw.activo
  if (typeof activo !== 'boolean') details.push({ field: 'activo', message: 'Selecciona un estado válido.' })
  if (details.length) return { details }
  return { data: { nombre, descripcion, activo: activo as boolean }, details }
}
