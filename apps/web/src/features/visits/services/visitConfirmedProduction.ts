import { productionEstimate, estimatedSaleQ } from './visitProduction.ts'
import type { MovimientoVisita } from './visitEconomics'

// La misma visita registra el lote producido y la venta una sola vez.
// Unidades y kilogramos son mediciones independientes, nunca conversiones.
export type RegistroProduccion = {
  plantasVendidas: string
  perPlantUnits: string
  perPlantKg: string
  priceBasis: 'unidad' | 'kg'
  priceQ: string
}

export const registroIniciado = (value: RegistroProduccion): boolean =>
  Boolean(value.plantasVendidas.trim() || value.perPlantUnits.trim() || value.perPlantKg.trim() || value.priceQ.trim())

const cantidades = (value: RegistroProduccion) => productionEstimate({
  plants: value.plantasVendidas,
  perPlantUnits: value.perPlantUnits.trim() ? value.perPlantUnits : '1',
  perPlantKg: value.perPlantKg,
  priceBasis: value.priceBasis,
  priceQ: value.priceQ,
})

export function validarProduccion(value: RegistroProduccion): string | null {
  if (!registroIniciado(value)) return null
  if (!/^\d{1,9}$/.test(value.plantasVendidas) || Number(value.plantasVendidas) <= 0) {
    return 'Ingresa una cantidad válida de plantas vendidas.'
  }
  for (const field of [value.perPlantUnits, value.perPlantKg]) {
    if (field.trim() && (!/^\d{1,9}(?:\.\d{1,3})?$/.test(field) || Number(field) <= 0)) {
      return 'Ingresa una producción por planta positiva (máximo tres decimales).'
    }
  }
  const { units, kg } = cantidades(value)
  if (units !== null && (!Number.isSafeInteger(units) || units <= 0)) {
    return 'La cantidad de unidades vendidas debe ser un número entero.'
  }
  if (kg !== null && kg <= 0) return 'El peso de la producción debe ser positivo.'
  if (value.priceBasis === 'unidad' ? units === null : kg === null) {
    return 'Ingresa el peso por planta (kg).' 
  }
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(value.priceQ) || Number(value.priceQ) <= 0) {
    return 'Ingresa el precio de venta por unidad o kilogramo.'
  }
  if (totalProduccion(value) === null) return 'El total calculado debe ser positivo.'
  return null
}

export function totalProduccion(value: RegistroProduccion): number | null {
  if (!registroIniciado(value)) return null
  const total = estimatedSaleQ({
    plants: value.plantasVendidas,
    perPlantUnits: value.perPlantUnits.trim() ? value.perPlantUnits : '1',
    perPlantKg: value.perPlantKg,
    priceBasis: value.priceBasis,
    priceQ: value.priceQ,
  })
  return total !== null && total > 0 ? total : null
}

export function movimientoProduccion(value: RegistroProduccion, params: {
  fecha: string; unidadId: number; kgId: number; monedaId: number
}): MovimientoVisita | undefined {
  if (!registroIniciado(value)) return undefined
  const issue = validarProduccion(value)
  if (issue) throw Error(issue)
  const { units, kg } = cantidades(value)
  const principal = value.priceBasis === 'kg' ? kg : units
  const secundaria = value.priceBasis === 'kg' ? units : kg
  const unidadPrincipal = value.priceBasis === 'kg' ? params.kgId : params.unidadId
  const unidadSecundaria = value.priceBasis === 'kg' ? params.unidadId : params.kgId
  if (!principal || !unidadPrincipal || !params.monedaId || (secundaria !== null && !unidadSecundaria)) {
    throw Error('No se encontraron las unidades o la moneda GTQ del catálogo.')
  }
  return {
    cosecha: { fechaCosecha: params.fecha, cantidad: String(principal), unidadMedidaId: unidadPrincipal,
      ...(secundaria !== null ? { detalleAdicional: { cantidad: String(secundaria), unidadMedidaId: unidadSecundaria } } : {}),
    },
    venta: { fechaVenta: params.fecha, cantidad: String(principal), unidadMedidaId: unidadPrincipal,
      monedaId: params.monedaId, precioUnitario: value.priceQ, observaciones: null },
  }
}
