import { Router, type NextFunction, type Response } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { parseCropId, validateCropInput, type CropInput, type CropFieldError } from './crops.validation.js'

export const cropsRouter = Router()
cropsRouter.use(requireAuth)

class CropError extends Error {
  constructor(public readonly status: 404 | 409, public readonly code: string,
    message: string, public readonly details: CropFieldError[] = []) { super(message) }
}

const cropSelect = {
  id: true, nombre: true, descripcion: true, activo: true,
  _count: { select: { ciclos: true } },
} satisfies Prisma.CultivoSelect

type CropRecord = Prisma.CultivoGetPayload<{ select: typeof cropSelect }>
const serialize = ({ _count, ...crop }: CropRecord) => ({ ...crop, ciclosCount: _count.ciclos })

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof CropError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } })
    return
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    res.status(409).json({ error: { code: 'DUPLICATE_CROP', message: 'Ya existe un cultivo con ese nombre.' } })
    return
  }
  next(error)
}

async function ensureUniqueName(tx: Prisma.TransactionClient, nombre: string, exceptId?: number) {
  // Serializa los registros con nombres equivalentes, sin importar mayúsculas.
  const key = `cultivo:${nombre.toLocaleLowerCase('es')}`
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`
  const exists = await tx.cultivo.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  })
  if (exists) throw new CropError(409, 'DUPLICATE_CROP', 'Ya existe un cultivo con ese nombre.',
    [{ field: 'nombre', message: 'Utiliza un nombre diferente.' }])
}

// Para AGR-03: solo cultivos activos son opciones para registrar NUEVOS ciclos.
// Los ciclos históricos conservan su relación aunque se desactive el cultivo.
cropsRouter.get('/disponibles', async (_req, res, next) => {
  try {
    const data = await getPrismaClient().cultivo.findMany({
      where: { activo: true }, orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      select: { id: true, nombre: true, descripcion: true },
    })
    res.json({ data })
  } catch (error) { next(error) }
})

cropsRouter.get('/', requirePermission('PANTALLA_CULTIVOS'), async (_req, res, next) => {
  try {
    const records = await getPrismaClient().cultivo.findMany({
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }], select: cropSelect,
    })
    res.json({ data: records.map(serialize) })
  } catch (error) { next(error) }
})

cropsRouter.post('/', requirePermission('CULTIVOS_WRITE'), async (req, res, next) => {
  const checked = validateCropInput(req.body)
  if (!checked.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos del cultivo.', details: checked.details } })
    return
  }
  try {
    const input: CropInput = checked.data
    const data = await getPrismaClient().$transaction(async (tx) => {
      await ensureUniqueName(tx, input.nombre)
      const created = await tx.cultivo.create({ data: input, select: cropSelect })
      const result = serialize(created)
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'cultivo', registroId: String(created.id),
        accion: 'CREATE', fecha: new Date(), datosNuevos: JSON.stringify(result),
        descripcion: 'Registro de cultivo en el catálogo agrícola.',
      } })
      return result
    })
    res.status(201).json({ data })
  } catch (error) { handleError(error, res, next) }
})

cropsRouter.patch('/:id', requirePermission('CULTIVOS_WRITE'), async (req, res, next) => {
  const id = parseCropId(req.params.id)
  if (id === null) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El identificador del cultivo no es válido.' } })
    return
  }
  const checked = validateCropInput(req.body)
  if (!checked.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos del cultivo.', details: checked.details } })
    return
  }
  try {
    const input: CropInput = checked.data
    const data = await getPrismaClient().$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM cultivo WHERE id = ${id} FOR UPDATE`
      if (!locked.length) throw new CropError(404, 'CROP_NOT_FOUND', 'El cultivo solicitado no existe.')
      const previous = await tx.cultivo.findUniqueOrThrow({ where: { id }, select: cropSelect })
      const before = serialize(previous)
      if (previous.nombre !== input.nombre) await ensureUniqueName(tx, input.nombre, id)
      if (previous.nombre === input.nombre && previous.descripcion === input.descripcion && previous.activo === input.activo) return before
      const updated = await tx.cultivo.update({ where: { id }, data: input, select: cropSelect })
      const result = serialize(updated)
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'cultivo', registroId: String(id),
        accion: 'UPDATE', fecha: new Date(), datosAnteriores: JSON.stringify(before),
        datosNuevos: JSON.stringify(result), descripcion: 'Actualización del catálogo de cultivos.',
      } })
      return result
    })
    res.json({ data })
  } catch (error) { handleError(error, res, next) }
})
