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
    const result = Number(value) * plants
    return Number.isFinite(result) && result >= 0 ? Number(result.toFixed(3)) : null
  }
  return { units: estimate(entry.perPlantUnits), kg: estimate(entry.perPlantKg) }
}

export function estimatedSaleQ(entry: ProductionEntry): number | null {
  if (!entry.priceQ.trim()) return null
  const quantity = entry.priceBasis === 'kg' ? productionEstimate(entry).kg : productionEstimate(entry).units
  const price = Number(entry.priceQ)
  if (quantity === null || !Number.isFinite(price) || price < 0) return null
  return Number((quantity * price).toFixed(2))
}
