import { Router, type NextFunction, type Response } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { parseProductionId, validateProductionInput } from './production.validation.js'

export const productionRouter = Router()
productionRouter.use(requireAuth)

const productionSelect = {
  id: true, cicloCultivoId: true, fechaInicioPeriodo: true, fechaFinPeriodo: true, observaciones: true,
  cicloCultivo: { select: {
    id: true, estado: true,
    cultivo: { select: { id: true, nombre: true } },
    huerto: { select: { id: true, nombre: true, familiaId: true,
      familia: { select: { id: true, nombreReferencia: true, comunidad: { select: { nombre: true } } } },
    } },
  } },
  detalles: { select: {
    id: true, cantidadTotal: true,
    unidadMedida: { select: { id: true, codigo: true, nombre: true, abreviatura: true, activo: true } },
  } },
} satisfies Prisma.RegistroProduccionSelect

type ProductionRecord = Prisma.RegistroProduccionGetPayload<{ select: typeof productionSelect }>
const day = (value: Date) => value.toISOString().slice(0, 10)
const serialize = (record: ProductionRecord) => ({
  ...record,
  fechaInicioPeriodo: day(record.fechaInicioPeriodo),
  fechaFinPeriodo: day(record.fechaFinPeriodo),
  fechaCosecha: day(record.fechaInicioPeriodo) === day(record.fechaFinPeriodo) ? day(record.fechaInicioPeriodo) : null,
  detalles: record.detalles.map(detail => ({ ...detail, cantidadTotal: detail.cantidadTotal.toString() })),
})
const issue = (code: string, message: string, details?: unknown) =>
  ({ error: { code, message, ...(details ? { details } : {}) } })

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
    res.status(409).json(issue('RELATION_CONFLICT', 'El ciclo o la unidad de medida ya no está disponible.'))
    return
  }
  next(error)
}

// Unidades activas para nuevos registros; el historial conserva unidades inactivas.
productionRouter.get('/unidades', requirePermission('PANTALLA_PRODUCCION'), async (_req, res, next) => {
  try {
    const data = await getPrismaClient().unidadMedida.findMany({
      where: { activo: true },
      select: { id: true, codigo: true, nombre: true, abreviatura: true },
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    })
    res.json({ data })
  } catch (error) { next(error) }
})

// Información estructurada y vinculada al ciclo; se conserva para reportes futuros.
productionRouter.get('/', requirePermission('PANTALLA_PRODUCCION'), async (req, res, next) => {
  const cicloCultivoId = req.query.cicloCultivoId === undefined ? undefined : parseProductionId(req.query.cicloCultivoId)
  if (cicloCultivoId === null) {
    res.status(400).json(issue('VALIDATION_ERROR', 'Selecciona un ciclo válido.'))
    return
  }
  try {
    const records = await getPrismaClient().registroProduccion.findMany({
      where: cicloCultivoId ? { cicloCultivoId } : undefined,
      select: productionSelect,
      orderBy: [{ fechaFinPeriodo: 'desc' }, { id: 'desc' }],
      take: 500,
    })
    res.json({ data: records.map(serialize) })
  } catch (error) { next(error) }
})

productionRouter.post('/', requirePermission('PRODUCCION_WRITE'), async (req, res, next) => {
  const checked = validateProductionInput(req.body)
  if (!checked.data) {
    res.status(400).json(issue('VALIDATION_ERROR', 'Revisa los datos de la cosecha.', checked.details))
    return
  }
  const input = checked.data
  try {
    const result = await getPrismaClient().$transaction(async tx => {
      const cycle = await tx.cicloCultivo.findUnique({
        where: { id: input.cicloCultivoId },
        select: { id: true, fechaSiembra: true, fechaTrasplante: true, fechaFin: true },
      })
      if (!cycle) return { status: 404 as const, code: 'CYCLE_NOT_FOUND', message: 'El ciclo de cultivo no existe.' }
      const unit = await tx.unidadMedida.findUnique({ where: { id: input.unidadMedidaId }, select: { id: true, activo: true } })
      if (!unit || !unit.activo) return { status: 409 as const, code: 'UNIT_UNAVAILABLE', message: 'Selecciona una unidad de medida activa.' }
      const dates = [cycle.fechaSiembra, cycle.fechaTrasplante].filter((value): value is Date => value !== null)
      const lastPlantingDate = dates.map(day).sort().at(-1)
      if (lastPlantingDate && input.fechaCosecha < lastPlantingDate) {
        return { status: 400 as const, code: 'INVALID_HARVEST_DATE', message: 'La cosecha no puede ser anterior a la siembra o al trasplante.' }
      }
      if (cycle.fechaFin && input.fechaCosecha > day(cycle.fechaFin)) {
        return { status: 400 as const, code: 'INVALID_HARVEST_DATE', message: 'La cosecha no puede ser posterior al cierre del ciclo.' }
      }
      const fecha = new Date(`${input.fechaCosecha}T00:00:00.000Z`)
      // El modelo almacena períodos: para una cosecha puntual, inicio y fin coinciden.
      const created = await tx.registroProduccion.create({
        data: {
          cicloCultivoId: input.cicloCultivoId,
          fechaInicioPeriodo: fecha,
          fechaFinPeriodo: fecha,
          observaciones: input.observaciones,
          detalles: { create: { unidadMedidaId: input.unidadMedidaId, cantidadTotal: new Prisma.Decimal(input.cantidad) } },
        },
        select: productionSelect,
      })
      const data = serialize(created)
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'registro_produccion', registroId: String(created.id),
        accion: 'CREATE', fecha: new Date(), datosNuevos: JSON.stringify(data),
        descripcion: 'Registro de cosecha asociado a un ciclo de cultivo.',
      } })
      return { status: 201 as const, data }
    })
    if (result.status !== 201) {
      res.status(result.status).json(issue(result.code, result.message))
      return
    }
    res.status(201).json({ data: result.data })
  } catch (error) { handleError(error, res, next) }
})
