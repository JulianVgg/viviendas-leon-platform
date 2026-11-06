export const GARDEN_ENTORNOS = ['CAMPO_ABIERTO', 'MACROTUNEL', 'MIXTO', 'OTRO'] as const
export const GARDEN_MODALIDADES = ['AGRICOLA', 'AGROFORESTAL', 'SILVOPASTORIL'] as const

type EntornoCultivo = typeof GARDEN_ENTORNOS[number]
type ModalidadProductiva = typeof GARDEN_MODALIDADES[number]

export type GardenClassification = {
  tipo: 'FAMILIAR' | 'COMUNITARIO' | null
  entornoCultivo: EntornoCultivo | null
  detalleEntorno: string | null
  modalidadesProductivas: ModalidadProductiva[]
}

export type GardenInput = GardenClassification & {
  familiaId: number
  nombre: string | null
  fechaInicio: string | null
  estado: 'PLANIFICADO' | 'ACTIVO' | 'INACTIVO'
  observaciones: string | null
}

type ValidationDetail = { field: string; message: string }
const MAX_DB_ID = 2_147_483_647

export function parseGardenId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed <= MAX_DB_ID ? parsed : null
}

function optionalString(value: unknown, field: string, max: number, details: ValidationDetail[]): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.trim().length > max) {
    details.push({ field, message: `Ingresa un texto de hasta ${max} caracteres.` })
    return null
  }
  return value.trim() || null
}

function validDay(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  const date = new Date(`${day}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(`${day}T`)
}

// La ausencia de un dato no implica ninguna modalidad: no inventar clasificación histórica.
function parseClassification(source: Record<string, unknown>, details: ValidationDetail[]): GardenClassification {
  const tipoValue = source.tipo === undefined || source.tipo === null || source.tipo === '' ? null : source.tipo
  if (tipoValue !== null && tipoValue !== 'FAMILIAR' && tipoValue !== 'COMUNITARIO') {
    details.push({ field: 'tipo', message: 'El tipo debe ser familiar o comunitario.' })
  }
  const entornoValue = source.entornoCultivo === undefined || source.entornoCultivo === null || source.entornoCultivo === ''
    ? null : source.entornoCultivo
  if (entornoValue !== null && !GARDEN_ENTORNOS.includes(entornoValue as EntornoCultivo)) {
    details.push({ field: 'entornoCultivo', message: 'Selecciona un entorno de cultivo válido.' })
  }
  const detalleEntorno = optionalString(source.detalleEntorno, 'detalleEntorno', 180, details)
  if (entornoValue === 'OTRO' && !detalleEntorno) {
    details.push({ field: 'detalleEntorno', message: 'Describe la estructura o entorno seleccionado.' })
  } else if (entornoValue !== 'OTRO' && detalleEntorno) {
    details.push({ field: 'detalleEntorno', message: 'El detalle solo se usa cuando el entorno es Otro.' })
  }
  const rawModalidades = source.modalidadesProductivas === undefined ? [] : source.modalidadesProductivas
  if (!Array.isArray(rawModalidades) || rawModalidades.length > GARDEN_MODALIDADES.length ||
    rawModalidades.some(value => typeof value !== 'string' || !GARDEN_MODALIDADES.includes(value as ModalidadProductiva)) ||
    new Set(rawModalidades).size !== rawModalidades.length) {
    details.push({ field: 'modalidadesProductivas', message: 'Selecciona modalidades válidas, sin repetirlas.' })
  }
  return {
    tipo: tipoValue === 'FAMILIAR' || tipoValue === 'COMUNITARIO' ? tipoValue : null,
    entornoCultivo: GARDEN_ENTORNOS.find(item => item === entornoValue) ?? null,
    detalleEntorno: entornoValue === 'OTRO' ? detalleEntorno : null,
    modalidadesProductivas: Array.isArray(rawModalidades)
      ? GARDEN_MODALIDADES.filter(item => rawModalidades.includes(item)) : [],
  }
}

export function validateGardenClassification(body: unknown): { data: GardenClassification | null; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { data: null, details: [{ field: 'body', message: 'Debes enviar un objeto JSON.' }] }
  }
  const source = body as Record<string, unknown>
  // PATCH reemplaza únicamente clasificación: exigir todos sus campos evita borrar datos por omisión.
  for (const field of ['tipo', 'entornoCultivo', 'detalleEntorno', 'modalidadesProductivas']) {
    if (!Object.prototype.hasOwnProperty.call(source, field)) {
      details.push({ field, message: 'Incluye este campo en la clasificación.' })
    }
  }
  const classification = parseClassification(source, details)
  return details.length ? { data: null, details } : { data: classification, details: [] }
}

export function validateGardenInput(body: unknown): { data: GardenInput | null; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { data: null, details: [{ field: 'body', message: 'Debes enviar un objeto JSON.' }] }
  }
  const source = body as Record<string, unknown>
  const familiaId = Number.isInteger(source.familiaId) && Number(source.familiaId) > 0 && Number(source.familiaId) <= MAX_DB_ID
    ? Number(source.familiaId) : null
  if (familiaId === null) details.push({ field: 'familiaId', message: 'Selecciona una familia existente.' })
  const nombre = optionalString(source.nombre, 'nombre', 120, details)
  const observaciones = optionalString(source.observaciones, 'observaciones', 2000, details)
  const classification = parseClassification(source, details)
  const estado = source.estado
  if (estado !== 'PLANIFICADO' && estado !== 'ACTIVO' && estado !== 'INACTIVO') {
    details.push({ field: 'estado', message: 'Selecciona un estado válido.' })
  }
  const fechaInicio = source.fechaInicio === undefined || source.fechaInicio === null || source.fechaInicio === '' ? null : source.fechaInicio
  if (fechaInicio !== null && (typeof fechaInicio !== 'string' || !validDay(fechaInicio))) {
    details.push({ field: 'fechaInicio', message: 'Ingresa una fecha válida (AAAA-MM-DD).' })
  }
  if (details.length || familiaId === null ||
    (estado !== 'PLANIFICADO' && estado !== 'ACTIVO' && estado !== 'INACTIVO') ||
    (fechaInicio !== null && typeof fechaInicio !== 'string')) return { data: null, details }

  return { data: { familiaId, nombre, ...classification, fechaInicio, estado, observaciones }, details: [] }
}
