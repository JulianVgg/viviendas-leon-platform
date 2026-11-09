export type CatalogFieldError = { field: string; message: string }
export type CategoriaInput = { nombre: string; descripcion: string | null; activo: boolean }
export type InsumoInput = CategoriaInput & { categoriaInsumoId: number }

const control = /[\u0000-\u001f\u007f]/
const maxId = 2_147_483_647

export const catalogNameKey = (name: string): string => name.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[-_]+/g, ' ')
  .trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-GT')

export function parseCatalogId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id <= maxId ? id : null
}

function validateBase(body: unknown, extras: string[] = []) {
  const details: CatalogFieldError[] = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { data: null, details: [{ field: 'body', message: 'Envía los datos del catálogo en un objeto JSON.' }] }
  }
  const raw = body as Record<string, unknown>
  const keys = new Set(['nombre', 'descripcion', 'activo', ...extras])
  Object.keys(raw).forEach(key => { if (!keys.has(key)) details.push({ field: key, message: 'Este campo no está permitido.' }) })
  const nombre = typeof raw.nombre === 'string' ? raw.nombre.normalize('NFC').trim().replace(/\s+/g, ' ') : ''
  if (!nombre || nombre.length > 120 || control.test(String(raw.nombre ?? ''))) {
    details.push({ field: 'nombre', message: 'Ingresa un nombre válido (máximo 120 caracteres).' })
  }
  const descripcion = raw.descripcion == null ? null : typeof raw.descripcion === 'string'
    ? raw.descripcion.normalize('NFC').trim() || null : null
  if ((raw.descripcion !== null && raw.descripcion !== undefined && typeof raw.descripcion !== 'string') ||
      (descripcion !== null && (descripcion.length > 2000 || control.test(descripcion)))) {
    details.push({ field: 'descripcion', message: 'La descripción no puede superar 2000 caracteres ni contener caracteres de control.' })
  }
  const activo = raw.activo === undefined ? true : raw.activo
  if (typeof activo !== 'boolean') details.push({ field: 'activo', message: 'Selecciona un estado válido.' })
  return { data: { nombre, descripcion, activo: activo as boolean }, details }
}

export function validateCategoriaInput(body: unknown): { data?: CategoriaInput; details: CatalogFieldError[] } {
  const result = validateBase(body)
  return result.details.length || !result.data ? { details: result.details } : { data: result.data, details: [] }
}

export function validateInsumoInput(body: unknown): { data?: InsumoInput; details: CatalogFieldError[] } {
  const result = validateBase(body, ['categoriaInsumoId'])
  if (!result.data || !body || typeof body !== 'object' || Array.isArray(body)) return { details: result.details }
  const categoryId = (body as Record<string, unknown>).categoriaInsumoId
  if (typeof categoryId !== 'number' || !Number.isSafeInteger(categoryId) || categoryId < 1 || categoryId > maxId) {
    result.details.push({ field: 'categoriaInsumoId', message: 'Selecciona una categoría válida.' })
  }
  if (result.details.length) return { details: result.details }
  return { data: { ...result.data, categoriaInsumoId: categoryId as number }, details: [] }
}
