export type ProductionEntry = {
  plants: string
  perPlantUnits: string
  perPlantKg: string
  priceBasis: 'unidad' | 'kg'
  priceQ: string
}

/** Solo cálculos orientativos; no equivalen a cosecha o ventas reales. */
export function productionEstimate(entry: ProductionEntry): { units: number | null; kg: number | null } {
  const plants = entry.plants.trim() ? Number(entry.plants) : NaN
  if (!Number.isSafeInteger(plants) || plants <= 0) return { units: null, kg: null }
  const estimate = (value: string) => {
    if (!value.trim()) return null
    if (!/^\d{1,9}(?:\.\d{1,3})?$/.test(value)) return null
    const result = Number(value) * plants
    return Number.isFinite(result) && result >= 0 ? Number(result.toFixed(3)) : null
  }
  return { units: estimate(entry.perPlantUnits), kg: estimate(entry.perPlantKg) }
}

export function estimatedSaleQ(entry: ProductionEntry): number | null {
  if (!entry.priceQ.trim()) return null
  const quantity = entry.priceBasis === 'kg' ? productionEstimate(entry).kg : productionEstimate(entry).units
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(entry.priceQ)) return null
  const price = Number(entry.priceQ)
  if (quantity === null || !Number.isFinite(price) || price < 0) return null
  return Number((quantity * price).toFixed(2))
}

/** Solo valorización orientativa de una captura: no representa ingresos por ventas. */
export function valorEstimadoCapturaQ(crop: {
  production: boolean; priceBasis: 'unidad' | 'kg';
  priceQ: number | null; units: number | null; kg: number | null
}): number | null {
  if (crop.production !== true || crop.priceQ === null || !Number.isFinite(crop.priceQ) || crop.priceQ < 0) return null
  const quantity = crop.priceBasis === 'kg' ? crop.kg : crop.units
  if (quantity === null || !Number.isFinite(quantity) || quantity < 0) return null
  const amount = quantity * crop.priceQ
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : null
}
