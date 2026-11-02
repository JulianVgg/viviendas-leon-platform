export type ProductionInput = {
  cicloCultivoId: number
  fechaCosecha: string
  cantidad: string
  unidadMedidaId: number
  observaciones: string | null
}
export type ProductionFieldError = { field: string; message: string }
const MAX_ID = 2_147_483_647
const allowedFields = new Set(['cicloCultivoId', 'fechaCosecha', 'cantidad', 'unidadMedidaId', 'observaciones'])

export function parseProductionId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id <= MAX_ID ? id : null
}

function readId(value: unknown, field: string, details: ProductionFieldError[]): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > MAX_ID) {
    details.push({ field, message: 'Selecciona un registro válido.' })
    return 0
  }
  return value
}

function validDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function validateProductionInput(body: unknown): { data?: ProductionInput; details: ProductionFieldError[] } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { details: [{ field: 'body', message: 'Envía un objeto JSON válido.' }] }
  }
  const source = body as Record<string, unknown>
  const details: ProductionFieldError[] = []
  for (const key of Object.keys(source)) {
    if (!allowedFields.has(key)) details.push({ field: key, message: 'Este campo no está permitido.' })
  }
  const cicloCultivoId = readId(source.cicloCultivoId, 'cicloCultivoId', details)
  const unidadMedidaId = readId(source.unidadMedidaId, 'unidadMedidaId', details)
  const fechaCosecha = validDay(source.fechaCosecha) ? source.fechaCosecha : ''
  if (!fechaCosecha) details.push({ field: 'fechaCosecha', message: 'Ingresa una fecha de cosecha válida (AAAA-MM-DD).' })
  const cantidad = source.cantidad
  // Decimal en formato de texto para no introducir errores de coma flotante.
  // Máximo nueve dígitos enteros y tres decimales; siempre mayor que cero.
  if (typeof cantidad !== 'string' || !/^\d{1,9}(?:\.\d{1,3})?$/.test(cantidad) || Number(cantidad) <= 0) {
    details.push({ field: 'cantidad', message: 'Ingresa una cantidad positiva, con hasta tres decimales (usa punto decimal).' })
  }
  let observaciones: string | null = null
  if (source.observaciones !== undefined && source.observaciones !== null && source.observaciones !== '') {
    if (typeof source.observaciones !== 'string' || source.observaciones.length > 2000 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(source.observaciones)) {
      details.push({ field: 'observaciones', message: 'Las observaciones no son válidas (máximo 2000 caracteres).' })
    } else observaciones = source.observaciones.normalize('NFC').trim() || null
  }
  if (details.length) return { details }
  return { data: { cicloCultivoId, fechaCosecha, cantidad: cantidad as string, unidadMedidaId, observaciones }, details }
}
