import { Prisma } from '../../generated/prisma/client.js'
import { validateProductionInput } from '../agriculture/production.validation.js'
import { validateSaleInput } from '../agriculture/sales.validation.js'
import { availableToSell, guatemalaToday, officialCurrency, saleMoney } from '../agriculture/sales.rules.js'
import { harvestQuantityError, harvestUnitKind, isOfficialHarvestUnit } from '../agriculture/production.units.js'

// Una cosecha nueva y una venta pueden confirmarse juntas. Los movimientos
// históricos sin visitaOrigenId siguen siendo válidos.
export type MovimientoVisita = {
  cosecha?: { fechaCosecha: string; cantidad: string; unidadMedidaId: number }
  venta?: { registroProduccionId?: number; fechaVenta: string; cantidad: string; unidadMedidaId: number;
    monedaId: number; precioUnitario: string; observaciones: string | null }
}
export function validarMovimientoVisita(value: unknown, cicloCultivoId: number): MovimientoVisita | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (Object.keys(row).some(key => !['cosecha', 'venta'].includes(key))) return null
  if (!row.cosecha && !row.venta) return null
  let cosecha: MovimientoVisita['cosecha']
  if (row.cosecha) {
    if (typeof row.cosecha !== 'object' || Array.isArray(row.cosecha)) return null
    const candidate = row.cosecha as Record<string, unknown>
    const check = validateProductionInput({ ...candidate, cicloCultivoId })
    if (!check.data || (check.data.observaciones ?? null) !== null) return null
    cosecha = { fechaCosecha: check.data.fechaCosecha, cantidad: check.data.cantidad, unidadMedidaId: check.data.unidadMedidaId }
  }
  let venta: MovimientoVisita['venta']
  if (row.venta) {
    if (typeof row.venta !== 'object' || Array.isArray(row.venta)) return null
    const candidate = row.venta as Record<string, unknown>
    if (cosecha && candidate.registroProduccionId !== undefined) return null
    if (!cosecha && !candidate.registroProduccionId) return null
    const check = validateSaleInput({ ...candidate, registroProduccionId: candidate.registroProduccionId ?? 1 })
    if (!check.data) return null
    venta = { ...(cosecha ? {} : { registroProduccionId: check.data.registroProduccionId }),
      fechaVenta: check.data.fechaVenta, cantidad: check.data.cantidad,
      unidadMedidaId: check.data.unidadMedidaId, monedaId: check.data.monedaId,
      precioUnitario: check.data.precioUnitario, observaciones: check.data.observaciones }
  }
  return { ...(cosecha ? { cosecha } : {}), ...(venta ? { venta } : {}) }
}

function rejected(message: string): never { throw new Error(`INVALID_VISIT_ECONOMICS:${message}`) }
const day = (date: Date) => date.toISOString().slice(0, 10)

export async function registrarMovimientoVisita(tx: Prisma.TransactionClient, params: {
  movimiento: MovimientoVisita; cicloCultivoId: number; familiaId: number;
  visitaId: number; fechaVisita: string; usuarioId: number
}): Promise<void> {
  const { movimiento, cicloCultivoId, familiaId, visitaId, fechaVisita, usuarioId } = params
  const today = guatemalaToday()
  const cycle = await tx.cicloCultivo.findUnique({ where: { id: cicloCultivoId }, select: {
    huerto: { select: { familiaId: true } }, fechaSiembra: true, fechaTrasplante: true, fechaFin: true,
  } })
  if (!cycle || cycle.huerto.familiaId !== familiaId || !cycle.fechaSiembra) rejected('La siembra no corresponde a la familia visitada o no tiene fecha de inicio.')
  let productionId = movimiento.venta?.registroProduccionId
  if (movimiento.cosecha) {
    const entry = movimiento.cosecha
    if (entry.fechaCosecha > fechaVisita || entry.fechaCosecha > today || entry.fechaCosecha < day(cycle.fechaSiembra)) {
      rejected('La fecha de cosecha debe estar entre la siembra y la visita.')
    }
    if (cycle.fechaTrasplante && entry.fechaCosecha < day(cycle.fechaTrasplante)) {
      rejected('La cosecha no puede ser anterior al trasplante registrado.')
    }
    if (cycle.fechaFin && entry.fechaCosecha > day(cycle.fechaFin)) rejected('La cosecha es posterior al cierre del ciclo.')
    const unit = await tx.unidadMedida.findUnique({ where: { id: entry.unidadMedidaId }, select: {
      id: true, codigo: true, nombre: true, abreviatura: true, activo: true,
    } })
    if (!unit || !isOfficialHarvestUnit(unit) || harvestQuantityError(entry.cantidad, harvestUnitKind(unit))) {
      rejected('La unidad o cantidad de cosecha no es válida.')
    }
    const date = new Date(`${entry.fechaCosecha}T00:00:00Z`)
    const harvest = await tx.registroProduccion.create({ data: {
      cicloCultivoId, fechaInicioPeriodo: date, fechaFinPeriodo: date,
      visitaOrigenId: visitaId, observaciones: `Registrada en visita técnica #${visitaId}`,
      detalles: { create: { cantidadTotal: new Prisma.Decimal(entry.cantidad), unidadMedidaId: entry.unidadMedidaId } },
    } })
    productionId = harvest.id
    await tx.bitacora.create({ data: { usuarioId, entidad: 'registro_produccion', registroId: String(harvest.id),
      accion: 'CREATE', fecha: new Date(), descripcion: `Cosecha real registrada durante visita #${visitaId}` } })
  }
  if (!movimiento.venta) return
  const sale = movimiento.venta
  if (!productionId) rejected('La venta requiere una cosecha real.')
  if (sale.fechaVenta > fechaVisita || sale.fechaVenta > today) rejected('Fecha de venta posterior a la visita.')
  const harvest = await tx.registroProduccion.findUnique({ where: { id: productionId }, select: {
    id: true, cicloCultivoId: true, fechaInicioPeriodo: true,
    detalles: { select: { unidadMedidaId: true, cantidadTotal: true, unidadMedida: { select: {
      codigo: true, nombre: true, abreviatura: true, activo: true,
    } } } },
  } })
  if (!harvest || harvest.cicloCultivoId !== cicloCultivoId) rejected('La cosecha no pertenece al ciclo seleccionado.')
  if (sale.fechaVenta < day(harvest.fechaInicioPeriodo)) rejected('La venta es anterior a la cosecha.')
  const detail = harvest.detalles.find(item => item.unidadMedidaId === sale.unidadMedidaId)
  if (!detail || !isOfficialHarvestUnit(detail.unidadMedida)) rejected('Unidad incompatible con la cosecha.')
  const currency = await tx.moneda.findUnique({ where: { id: sale.monedaId }, select: { codigo: true, activo: true } })
  if (!currency || !officialCurrency(currency)) rejected('La moneda no está disponible.')
  const sold = await tx.registroVenta.aggregate({ where: { registroProduccionId: productionId, unidadMedidaId: sale.unidadMedidaId },
    _sum: { cantidadVendida: true } })
  const balance = availableToSell(detail.cantidadTotal.toString(), sold._sum.cantidadVendida?.toString() ?? '0',
    sale.cantidad, detail.unidadMedida)
  if (balance.error) rejected(balance.error)
  if (new Prisma.Decimal(saleMoney(sale.cantidad, sale.precioUnitario)).isZero()) rejected('El importe redondeado debe ser positivo.')
  const saleRow = await tx.registroVenta.create({ data: {
    registroProduccionId: productionId, visitaOrigenId: visitaId,
    fecha: new Date(`${sale.fechaVenta}T00:00:00Z`), cantidadVendida: new Prisma.Decimal(sale.cantidad),
    unidadMedidaId: sale.unidadMedidaId, observaciones: sale.observaciones,
    precios: { create: { monedaId: sale.monedaId, precioUnitario: new Prisma.Decimal(sale.precioUnitario) } },
  } })
  await tx.bitacora.create({ data: { usuarioId, entidad: 'registro_venta', registroId: String(saleRow.id),
    accion: 'CREATE', fecha: new Date(), descripcion: `Venta real registrada durante visita #${visitaId}` } })
}
