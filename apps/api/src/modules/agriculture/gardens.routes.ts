import { Router, raw } from 'express'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getPrismaClient } from '../../config/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { parseGardenId, validateGardenInput } from './gardens.validation.js'

export const gardensRouter = Router()
const storageDir = path.resolve(process.env.HUERTO_IMAGE_DIR ?? path.join(process.cwd(), 'storage', 'huertos'))
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const gardenSelect = {
  id: true, familiaId: true, nombre: true, tipo: true, fechaInicio: true,
  estado: true, observaciones: true, imagenRuta: true, imagenActualizadaEn: true,
  familia: { select: { id: true, nombreReferencia: true, comunidad: { select: { nombre: true } } } },
} satisfies Prisma.HuertoSelect

type GardenRecord = Prisma.HuertoGetPayload<{ select: typeof gardenSelect }>
function serializeGarden(garden: GardenRecord) {
  const { imagenRuta, ...rest } = garden
  return {
    ...rest,
    fechaInicio: garden.fechaInicio?.toISOString().slice(0, 10) ?? null,
    imagenActualizadaEn: garden.imagenActualizadaEn?.toISOString() ?? null,
    tieneImagen: Boolean(imagenRuta),
    imagenUrl: imagenRuta ? `/api/v1/huertos/${garden.id}/imagen` : null,
  }
}

function errorResponse(code: string, message: string) { return { error: { code, message } } }

// Verify magic bytes as well as Content-Type; SVG and other active formats are forbidden.
function detectImageType(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: 'image/png', ext: '.png' }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', ext: '.jpg' }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', ext: '.webp' }
  return null
}

gardensRouter.use(requireAuth)

gardensRouter.get('/familias-opciones', async (_req, res, next) => {
  try {
    const families = await getPrismaClient().familia.findMany({
      orderBy: [{ nombreReferencia: 'asc' }, { id: 'asc' }], take: 500,
      select: { id: true, nombreReferencia: true, estado: true, comunidad: { select: { nombre: true } } },
    })
    res.json({ data: families })
  } catch (error) { next(error) }
})

gardensRouter.get('/', async (req, res, next) => {
  const familiaId = req.query.familiaId === undefined ? undefined : parseGardenId(req.query.familiaId)
  if (familiaId === null) { res.status(400).json(errorResponse('VALIDATION_ERROR', 'La familia seleccionada no es válida.')); return }
  try {
    const gardens = await getPrismaClient().huerto.findMany({
      ...(familiaId ? { where: { familiaId } } : {}),
      orderBy: [{ id: 'desc' }], take: 500, select: gardenSelect,
    })
    res.json({ data: gardens.map(serializeGarden) })
  } catch (error) { next(error) }
})

gardensRouter.post('/', requirePermission('HUERTOS_WRITE'), async (req, res, next) => {
  const result = validateGardenInput(req.body)
  if (!result.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos del huerto.', details: result.details } })
    return
  }
  const input = result.data
  try {
    const created = await getPrismaClient().$transaction(async (tx) => {
      // Lock the family while creating the link to prevent a concurrent deletion.
      const family = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM familia WHERE id = ${input.familiaId} FOR SHARE`
      if (!family.length) return null
      const garden = await tx.huerto.create({
        data: {
          familiaId: input.familiaId,
          nombre: input.nombre,
          tipo: input.tipo,
          fechaInicio: input.fechaInicio ? new Date(`${input.fechaInicio}T00:00:00.000Z`) : null,
          estado: input.estado,
          observaciones: input.observaciones,
        }, select: gardenSelect,
      })
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'huerto', registroId: String(garden.id),
        accion: 'CREATE', fecha: new Date(), datosNuevos: JSON.stringify(serializeGarden(garden)),
        descripcion: 'Registro de huerto asociado a familia beneficiaria.',
      } })
      return garden
    })
    if (!created) { res.status(404).json(errorResponse('FAMILY_NOT_FOUND', 'La familia seleccionada no existe.')); return }
    res.status(201).location(`/api/v1/huertos?familiaId=${created.familiaId}`).json({ data: serializeGarden(created) })
  } catch (error) { next(error) }
})

gardensRouter.post('/:id/imagen', requirePermission('HUERTOS_WRITE'), raw({ type: () => true, limit: '5mb' }), async (req, res, next) => {
  const id = parseGardenId(req.params.id)
  if (id === null) { res.status(400).json(errorResponse('VALIDATION_ERROR', 'El identificador del huerto no es válido.')); return }
  const bytes = req.body
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    res.status(400).json(errorResponse('INVALID_IMAGE', 'Selecciona una imagen válida de hasta 5 MB.'))
    return
  }
  const detected = detectImageType(bytes)
  const requestedMime = req.headers['content-type']?.split(';')[0]?.trim().toLowerCase()
  if (!detected || detected.mime !== requestedMime) {
    res.status(415).json(errorResponse('INVALID_IMAGE_TYPE', 'Solo se admiten archivos PNG, JPG o WebP auténticos.'))
    return
  }
  let newPath: string | null = null
  try {
    const prisma = getPrismaClient()
    const existing = await prisma.huerto.findUnique({ where: { id }, select: { imagenRuta: true } })
    if (!existing) { res.status(404).json(errorResponse('GARDEN_NOT_FOUND', 'El huerto no existe.')); return }
    await mkdir(storageDir, { recursive: true })
    const filename = `${randomUUID()}${detected.ext}`
    newPath = path.join(storageDir, filename)
    await writeFile(newPath, bytes, { flag: 'wx' })
    const oldFilename = existing.imagenRuta
    await prisma.$transaction(async (tx) => {
      await tx.huerto.update({ where: { id }, data: {
        imagenRuta: filename, imagenNombre: `imagen-satelital${detected.ext}`,
        imagenMime: detected.mime, imagenActualizadaEn: new Date(),
      } })
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'huerto', registroId: String(id), accion: 'UPDATE', fecha: new Date(),
        descripcion: 'Imagen satelital del huerto actualizada en almacenamiento local.',
      } })
    })
    newPath = null
    if (oldFilename) await unlink(path.join(storageDir, path.basename(oldFilename))).catch(() => {})
    res.json({ data: { imagenUrl: `/api/v1/huertos/${id}/imagen`, tieneImagen: true } })
  } catch (error) {
    if (newPath) await unlink(newPath).catch(() => {})
    next(error)
  }
})

gardensRouter.get('/:id/imagen', async (req, res, next) => {
  const id = parseGardenId(req.params.id)
  if (id === null) { res.status(400).json(errorResponse('VALIDATION_ERROR', 'Identificador no válido.')); return }
  try {
    const garden = await getPrismaClient().huerto.findUnique({ where: { id }, select: { imagenRuta: true, imagenMime: true } })
    if (!garden?.imagenRuta || !garden.imagenMime) {
      res.status(404).json(errorResponse('IMAGE_NOT_FOUND', 'El huerto no tiene una imagen almacenada.'))
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(garden.imagenMime)) { res.status(404).end(); return }
    const bytes = await readFile(path.join(storageDir, path.basename(garden.imagenRuta))).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null
      throw error
    })
    if (!bytes) { res.status(404).json(errorResponse('IMAGE_NOT_FOUND', 'El archivo local no está disponible.')); return }
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.type(garden.imagenMime).send(bytes)
  } catch (error) { next(error) }
})
