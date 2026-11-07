// CIR-09: movimientos económicos reales confirmados con la visita (sin estimaciones).
export type MovimientoVisita = {
  cosecha?: { fechaCosecha: string; cantidad: string; unidadMedidaId: number }
  venta?: { registroProduccionId?: number; fechaVenta: string; cantidad: string;
    unidadMedidaId: number; monedaId: number; precioUnitario: string; observaciones: string | null }
}
export type MovimientoMode = 'ninguno' | 'nueva' | 'existente'
export function validarMovimientoParaVisita(value: MovimientoVisita | undefined, fechaVisita: string): string | null {
  if (!value) return null
  const decimal = (number: string) => /^\d{1,9}(?:\.\d{1,3})?$/.test(number) && Number(number) > 0
  const day = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) === date && date <= fechaVisita
  if (!value.cosecha && !value.venta) return 'Selecciona una cosecha o venta real.'
  if (value.cosecha && (!day(value.cosecha.fechaCosecha) || !decimal(value.cosecha.cantidad) || !value.cosecha.unidadMedidaId))
    return 'Completa fecha, cantidad y unidad de la cosecha real.'
  if (value.venta) {
    const sale = value.venta
    if (!value.cosecha && !sale.registroProduccionId) return 'Selecciona una cosecha existente.'
    if (value.cosecha && sale.registroProduccionId) return 'La venta de cosecha nueva no requiere otro ID.'
    if (!day(sale.fechaVenta) || (value.cosecha && sale.fechaVenta < value.cosecha.fechaCosecha) ||
      !decimal(sale.cantidad) || !sale.unidadMedidaId || !sale.monedaId ||
      !/^\d{1,9}(?:\.\d{1,4})?$/.test(sale.precioUnitario) || Number(sale.precioUnitario) <= 0)
      return 'Completa la fecha, cantidad, unidad, moneda y precio real de venta.'
    if ((sale.observaciones?.length ?? 0) > 500) return 'Máximo 500 caracteres en observaciones de venta.'
    if (value.cosecha && (value.cosecha.unidadMedidaId !== sale.unidadMedidaId || Number(sale.cantidad) > Number(value.cosecha.cantidad)))
      return 'La venta debe utilizar la unidad cosechada y no superar la cantidad registrada.'
  }
  return null
}
