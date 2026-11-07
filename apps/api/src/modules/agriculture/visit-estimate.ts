/**
 * Recupera solamente la estimación de un cultivo desde la captura JSONB de su visita.
 * No convierte estimaciones en cosechas ni ventas: ambas se registran aparte.
 * Funciona también con capturas anteriores que carecen de origenProduccion.
 */
export type EstimacionVisita = {
  unidades: number | null
  kg: number | null
  precioReferenciaQ: number | null
  precioPor: 'unidad' | 'kg'
  valorEstimadoQ: number | null
}

const numeric = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null

export function estimacionDeCaptura(captura: unknown, cicloCultivoId: number): EstimacionVisita | null {
  if (!captura || typeof captura !== 'object' || Array.isArray(captura)) return null
  const crops = (captura as Record<string, unknown>).crops
  if (!Array.isArray(crops)) return null
  const matches = crops.filter((crop: unknown) => crop && typeof crop === 'object' && !Array.isArray(crop) &&
    (crop as Record<string, unknown>).cicloCultivoId === cicloCultivoId &&
    (crop as Record<string, unknown>).production === true)
  // Evita presentar una estimación ambigua cuando hay dos registros del mismo ciclo.
  if (matches.length !== 1) return null
  const crop = matches[0] as Record<string, unknown>
  const unidades = numeric(crop.units)
  const kg = numeric(crop.kg)
  const precioReferenciaQ = numeric(crop.priceQ)
  const precioPor = crop.priceBasis === 'kg' ? 'kg' : 'unidad'
  const cantidadParaPrecio = precioPor === 'kg' ? kg : unidades
  const producto = precioReferenciaQ !== null && cantidadParaPrecio !== null
    ? precioReferenciaQ * cantidadParaPrecio : null
  const valorEstimadoQ = producto !== null && Number.isFinite(producto) && producto <= Number.MAX_SAFE_INTEGER
    ? Math.round((producto + Number.EPSILON) * 100) / 100 : null
  return { unidades, kg, precioReferenciaQ, precioPor, valorEstimadoQ }
}
