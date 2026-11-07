import { Router, type NextFunction, type Response } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { parseProductionId } from './production.validation.js'
import { availableToSell, guatemalaToday, officialCurrency, saleMoney } from './sales.rules.js'
import { validateSaleInput } from './sales.validation.js'
import { requireProductionRead } from './production.access.js'
import { harvestUnitKind, isOfficialHarvestUnit } from './production.units.js'

export const salesRouter = Router()
const errorBody = (code: string, message: string, details?: unknown) => ({ error: { code, message, ...(details ? { details } : {}) } })
const day = (value: Date) => value.toISOString().slice(0, 10)

const saleSelect = {
  id: true, registroProduccionId: true, visitaOrigenId: true, fecha: true, cantidadVendida: true, unidadMedidaId: true, observaciones: true,
  unidadMedida: { select: { id: true, codigo: true, nombre: true, abreviatura: true } },
  registroProduccion: { select: {
    id: true,
    cicloCultivo: { select: { id: true, cultivo: { select: { nombre: true } },
      huerto: { select: { nombre: true, familia: { select: { nombreReferencia: true, comunidad: { select: { nombre: true } } } } } },
    } },
  } },
  precios: { select: { precioUnitario: true, moneda: { select: { id: true, codigo: true, nombre: true, simbolo: true } } } },
} satisfies Prisma.RegistroVentaSelect

type SaleRow = Prisma.RegistroVentaGetPayload<{ select: typeof saleSelect }>
function serializeSale(sale: SaleRow) {
  // Un registro antiguo con varios precios no debe atribuir un importe arbitrario.
  const precio = sale.precios.length === 1 && officialCurrency({ ...sale.precios[0].moneda, activo: true })
    ? sale.precios[0] : undefined
  return {
    id: sale.id, registroProduccionId: sale.registroProduccionId, visitaOrigenId: sale.visitaOrigenId, fechaVenta: sale.fecha ? day(sale.fecha) : null,
    cantidad: sale.cantidadVendida.toString(), unidadMedida: sale.unidadMedida,
    observaciones: sale.observaciones,
    cicloCultivo: sale.registroProduccion.cicloCultivo,
    precioUnitario: precio?.precioUnitario.toString() ?? null,
    moneda: precio?.moneda ?? null,
    totalVenta: precio ? saleMoney(sale.cantidadVendida.toString(), precio.precioUnitario.toString()) : null,
    tipoImporte: 'VENTA_REAL' as const,
    esDatoPrueba: sale.unidadMedida.codigo.startsWith('SYN-') || !precio,
  }
}

salesRouter.get('/monedas', requireProductionRead, async (_req, res, next) => {
  try {
    const currencies = await getPrismaClient().moneda.findMany({
      where: { activo: true }, select: { id: true, codigo: true, nombre: true, simbolo: true, activo: true },
      orderBy: { codigo: 'asc' },
    })
    res.json({ data: currencies.filter(officialCurrency) })
  } catch (error) { next(error) }
})

salesRouter.get('/disponibilidad', requireProductionRead, async (req, res, next) => {
  const registroProduccionId = parseProductionId(req.query.registroProduccionId)
  if (!registroProduccionId) { res.status(400).json(errorBody('VALIDATION_ERROR', 'Selecciona una cosecha válida.')); return }
  try {
    const record = await getPrismaClient().registroProduccion.findUnique({
      where: { id: registroProduccionId },
      select: { id: true, detalles: { select: { unidadMedidaId: true, cantidadTotal: true,
        unidadMedida: { select: { id: true, codigo: true, nombre: true, abreviatura: true, activo: true } },
      } }, ventas: { select: { unidadMedidaId: true, cantidadVendida: true } } },
    })
    if (!record) { res.status(404).json(errorBody('NOT_FOUND', 'La cosecha no existe.')); return }
    res.json({ data: { registroProduccionId, unidades: record.detalles.filter(detail => isOfficialHarvestUnit(detail.unidadMedida)).map(detail => {
      const sold = detail.unidadMedidaId
      const total = record.ventas.filter(sale => sale.unidadMedidaId === sold)
        .reduce((value, sale) => value.plus(sale.cantidadVendida), new Prisma.Decimal(0))
      return { unidadMedida: detail.unidadMedida, tipo: harvestUnitKind(detail.unidadMedida), cosechado: detail.cantidadTotal.toString(),
        vendido: total.toString(), disponible: detail.cantidadTotal.minus(total).toString() }
    }) } })
  } catch (error) { next(error) }
})

salesRouter.get('/', requireProductionRead, async (req, res, next) => {
  const productionId = req.query.registroProduccionId === undefined ? undefined : parseProductionId(req.query.registroProduccionId)
  if (productionId === null) { res.status(400).json(errorBody('VALIDATION_ERROR', 'Selecciona una cosecha válida.')); return }
  try {
    const records = await getPrismaClient().registroVenta.findMany({
      where: productionId ? { registroProduccionId: productionId } : undefined,
      select: saleSelect, orderBy: [{ fecha: 'desc' }, { id: 'desc' }], take: 500,
    })
    res.json({ data: records.map(serializeSale) })
  } catch (error) { next(error) }
})

salesRouter.post('/', requirePermission('PRODUCCION_WRITE'), async (req, res, next) => {
  const checked = validateSaleInput(req.body)
  if (!checked.data) { res.status(400).json(errorBody('VALIDATION_ERROR', 'Revisa los datos de la venta.', checked.details)); return }
  const input = checked.data
  if (input.fechaVenta > guatemalaToday()) {
    res.status(400).json(errorBody('INVALID_SALE_DATE', 'No puedes registrar una venta con fecha futura.')); return
  }
  const prisma = getPrismaClient()
  try {
    // Serializable evita que dos peticiones simultáneas vendan la misma cantidad.
    const result = await prisma.$transaction(async tx => {
      const record = await tx.registroProduccion.findUnique({
        where: { id: input.registroProduccionId },
        select: { id: true, fechaInicioPeriodo: true, detalles: {
          select: { unidadMedidaId: true, cantidadTotal: true,
            unidadMedida: { select: { id: true, codigo: true, nombre: true, abreviatura: true, activo: true } },
          },
        } },
      })
      if (!record) return { status: 404, code: 'HARVEST_NOT_FOUND', message: 'La cosecha no existe.' }
      if (input.fechaVenta < day(record.fechaInicioPeriodo)) {
        return { status: 400, code: 'INVALID_SALE_DATE', message: 'La venta no puede ser anterior al inicio del período de producción.' }
      }
      const detail = record.detalles.find(item => item.unidadMedidaId === input.unidadMedidaId)
      if (!detail || !isOfficialHarvestUnit(detail.unidadMedida)) {
        return { status: 409, code: 'UNIT_MISMATCH', message: 'La unidad de venta debe coincidir con una unidad registrada en la cosecha.' }
      }
      const moneda = await tx.moneda.findUnique({ where: { id: input.monedaId }, select: { id: true, codigo: true, activo: true } })
      if (!moneda || !officialCurrency(moneda)) {
        return { status: 409, code: 'CURRENCY_UNAVAILABLE', message: 'Selecciona una moneda activa y oficial.' }
      }
      const sold = await tx.registroVenta.aggregate({ where: {
        registroProduccionId: record.id, unidadMedidaId: input.unidadMedidaId,
      }, _sum: { cantidadVendida: true } })
      const availability = availableToSell(detail.cantidadTotal.toString(), sold._sum.cantidadVendida?.toString() ?? '0',
        input.cantidad, detail.unidadMedida)
      if (availability.error) {
        return { status: 409, code: 'INSUFFICIENT_HARVEST', message: availability.error }
      }
      if (new Prisma.Decimal(saleMoney(input.cantidad, input.precioUnitario)).isZero()) {
        return { status: 400, code: 'PRICE_TOO_SMALL', message: 'El importe de la venta debe ser mayor que cero al expresarlo con dos decimales.' }
      }
      const created = await tx.registroVenta.create({ data: {
        registroProduccionId: record.id, fecha: new Date(`${input.fechaVenta}T00:00:00.000Z`),
        cantidadVendida: new Prisma.Decimal(input.cantidad), unidadMedidaId: input.unidadMedidaId,
        observaciones: input.observaciones,
        precios: { create: { monedaId: input.monedaId, precioUnitario: new Prisma.Decimal(input.precioUnitario) } },
      }, select: saleSelect })
      const data = serializeSale(created)
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'registro_venta', registroId: String(created.id),
        accion: 'CREATE', fecha: new Date(), datosNuevos: JSON.stringify(data),
        descripcion: 'Venta efectiva vinculada a una cosecha real; no es un precio de referencia.',
      } })
      return { status: 201, data }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    if ('code' in result && typeof result.code === 'string' && typeof result.message === 'string') {
      res.status(result.status).json(errorBody(result.code, result.message)); return
    }
    res.status(201).json({ data: result.data })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      res.status(409).json(errorBody('SALE_CONFLICT', 'Otra venta cambió la disponibilidad. Actualiza y vuelve a verificar.'))
    } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      res.status(409).json(errorBody('RELATION_CONFLICT', 'La cosecha, moneda o unidad de medida ya no está disponible.'))
    } else next(error)
  }
})
