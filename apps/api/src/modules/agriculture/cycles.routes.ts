import { Router, type NextFunction, type Response } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { parseCycleId, validateCycleInput } from './cycles.validation.js'

export const cyclesRouter = Router()
cyclesRouter.use(requireAuth)
const cycleSelect = {
  id: true, huertoId: true, cultivoId: true, fechaSiembra: true, fechaTrasplante: true,
  cantidadPlantas: true, fechaFin: true, estado: true, observaciones: true,
  cultivo: { select: { id: true, nombre: true, activo: true } },
  huerto: { select: { id: true, nombre: true, estado: true, familiaId: true,
    familia: { select: { id: true, nombreReferencia: true, comunidad: { select: { nombre: true } } } } } },
} satisfies Prisma.CicloCultivoSelect

type CycleRecord = Prisma.CicloCultivoGetPayload<{ select: typeof cycleSelect }>
const day = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null
const serialize = (cycle: CycleRecord) => ({
  ...cycle, fechaSiembra: day(cycle.fechaSiembra), fechaTrasplante: day(cycle.fechaTrasplante), fechaFin: day(cycle.fechaFin),
})
const issue = (code: string, message: string, details?: unknown) => ({ error: { code, message, ...(details ? { details } : {}) } })

function errorHandler(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
    res.status(409).json(issue('RELATION_CONFLICT', 'El huerto o cultivo ya no está disponible.'))
    return
  }
  next(err)
}

// Consultas globales o por huerto/familia; no se eliminan los ciclos históricos.
cyclesRouter.get('/', requirePermission('PANTALLA_CICLOS'), async (req, res, next) => {
  const huertoId = req.query.huertoId === undefined ? undefined : parseCycleId(req.query.huertoId)
  const familiaId = req.query.familiaId === undefined ? undefined : parseCycleId(req.query.familiaId)
  if (huertoId === null || familiaId === null || (huertoId && familiaId)) {
    res.status(400).json(issue('VALIDATION_ERROR', 'Selecciona un huerto o familia válido, no ambos.'))
    return
  }
  try {
    const data = await getPrismaClient().cicloCultivo.findMany({
      where: { ...(huertoId ? { huertoId } : {}), ...(familiaId ? { huerto: { familiaId } } : {}) },
      select: cycleSelect,
      orderBy: [{ id: 'desc' }], take: 500,
    })
    res.json({ data: data.map(serialize) })
  } catch (err) { next(err) }
})

cyclesRouter.get('/:id', requirePermission('PANTALLA_CICLOS'), async (req, res, next) => {
  const id = parseCycleId(req.params.id)
  if (!id) { res.status(400).json(issue('VALIDATION_ERROR', 'El identificador no es válido.')); return }
  try {
    const record = await getPrismaClient().cicloCultivo.findUnique({ where: { id }, select: cycleSelect })
    if (!record) { res.status(404).json(issue('CYCLE_NOT_FOUND', 'La siembra no existe.')); return }
    res.json({ data: serialize(record) })
  } catch (err) { next(err) }
})

cyclesRouter.post('/', requirePermission('CICLOS_WRITE'), async (req, res, next) => {
  const check = validateCycleInput(req.body)
  if (!check.data) {
    res.status(400).json(issue('VALIDATION_ERROR', 'Revisa los datos de la siembra.', check.details))
    return
  }
  const input = check.data
  try {
    const result = await getPrismaClient().$transaction(async tx => {
      // Asegurar las condiciones de las relaciones incluso si otro usuario intenta desactivarlas.
      const gardens = await tx.$queryRaw<Array<{ id: number; estado: string }>>`
        SELECT id, estado FROM huerto WHERE id = ${input.huertoId} FOR SHARE
      `
      if (!gardens.length) return { status: 404 as const, code: 'GARDEN_NOT_FOUND', message: 'El huerto no existe.' }
      if (gardens[0].estado !== 'ACTIVO') return { status: 409 as const, code: 'GARDEN_NOT_ACTIVE', message: 'El huerto debe estar activo para registrar una siembra.' }
      const crops = await tx.$queryRaw<Array<{ id: number; activo: boolean }>>`
        SELECT id, activo FROM cultivo WHERE id = ${input.cultivoId} FOR SHARE
      `
      if (!crops.length) return { status: 404 as const, code: 'CROP_NOT_FOUND', message: 'El cultivo no existe.' }
      if (!crops[0].activo) return { status: 409 as const, code: 'CROP_NOT_ACTIVE', message: 'El cultivo seleccionado está desactivado.' }
      const date = (raw: string | null) => raw ? new Date(`${raw}T00:00:00.000Z`) : null
      const created = await tx.cicloCultivo.create({
        data: { huertoId: input.huertoId, cultivoId: input.cultivoId,
          fechaSiembra: date(input.fechaSiembra), fechaTrasplante: date(input.fechaTrasplante),
          cantidadPlantas: input.cantidadPlantas, observaciones: input.observaciones,
          estado: 'ACTIVO', fechaFin: null },
        select: cycleSelect,
      })
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'ciclo_cultivo', registroId: String(created.id),
        accion: 'CREATE', fecha: new Date(), datosNuevos: JSON.stringify(serialize(created)),
        descripcion: 'Registro de siembra desde un huerto activo.',
      } })
      return { status: 201 as const, data: serialize(created) }
    })
    if (result.status !== 201) {
      res.status(result.status).json(issue(result.code, result.message))
      return
    }
    res.status(201).location(`/api/v1/ciclos-cultivo/${result.data.id}`).json({ data: result.data })
  } catch (err) { errorHandler(err, res, next) }
})
