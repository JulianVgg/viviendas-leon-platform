// CIR-09: solo ventas efectivas. Los precios de referencia se mantienen en visitas.
export type SaleInput = {
  registroProduccionId: number
  fechaVenta: string
  cantidad: string
  unidadMedidaId: number
  monedaId: number
  precioUnitario: string
  observaciones: string | null
}
export type SaleFieldError = { field: string; message: string }
const MAX_ID = 2_147_483_647
const fields = new Set(['registroProduccionId', 'fechaVenta', 'cantidad', 'unidadMedidaId', 'monedaId', 'precioUnitario', 'observaciones'])

function id(value: unknown, field: string, details: SaleFieldError[]): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > MAX_ID) {
    details.push({ field, message: 'Selecciona un registro válido.' })
    return 0
  }
  return value
}

export function validSaleDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function validateSaleInput(body: unknown): { data?: SaleInput; details: SaleFieldError[] } {
  if (!body || Array.isArray(body) || typeof body !== 'object') return { details: [{ field: 'body', message: 'Envía un objeto válido.' }] }
  const source = body as Record<string, unknown>
  const details: SaleFieldError[] = []
  for (const key of Object.keys(source)) if (!fields.has(key)) details.push({ field: key, message: 'Campo no permitido.' })
  const registroProduccionId = id(source.registroProduccionId, 'registroProduccionId', details)
  const unidadMedidaId = id(source.unidadMedidaId, 'unidadMedidaId', details)
  const monedaId = id(source.monedaId, 'monedaId', details)
  const fechaVenta = validSaleDate(source.fechaVenta) ? source.fechaVenta : ''
  if (!fechaVenta) details.push({ field: 'fechaVenta', message: 'Ingresa una fecha válida (AAAA-MM-DD).' })
  const cantidad = source.cantidad
  if (typeof cantidad !== 'string' || !/^\d{1,9}(?:\.\d{1,3})?$/.test(cantidad) || Number(cantidad) <= 0) {
    details.push({ field: 'cantidad', message: 'Ingresa una cantidad positiva, máximo tres decimales.' })
  }
  const precioUnitario = source.precioUnitario
  if (typeof precioUnitario !== 'string' || !/^\d{1,9}(?:\.\d{1,4})?$/.test(precioUnitario) || Number(precioUnitario) <= 0) {
    details.push({ field: 'precioUnitario', message: 'Ingresa un precio positivo, máximo cuatro decimales.' })
  }
  let observaciones: string | null = null
  if (source.observaciones !== undefined && source.observaciones !== null && source.observaciones !== '') {
    if (typeof source.observaciones !== 'string' || source.observaciones.length > 500 ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(source.observaciones) ||
      (source.observaciones.match(/\S+/gu)?.length ?? 0) > 100) {
      details.push({ field: 'observaciones', message: 'Máximo 500 caracteres y 100 palabras.' })
    } else observaciones = source.observaciones.normalize('NFC').trim() || null
  }
  if (details.length) return { details }
  return { data: {
    registroProduccionId, fechaVenta, cantidad: cantidad as string, unidadMedidaId, monedaId,
    precioUnitario: precioUnitario as string, observaciones,
  }, details }
}
