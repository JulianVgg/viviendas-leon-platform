import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router, raw } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../auth/require-permission.middleware.js'

export const trainingRouter = Router()

trainingRouter.use(requireAuth, requirePermission('PANTALLA_CAPACITACIONES'))

const evidenceRoot = resolve(process.env.TRAINING_EVIDENCE_DIR || fileURLToPath(new URL('../../../storage/training/', import.meta.url)))
const maxPhotoBytes = 3 * 1024 * 1024
const maxPhotosPerTraining = 8
const photoBody = raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: maxPhotoBytes })
const photoExtensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const

type PhotoMime = keyof typeof photoExtensions

function isValidImage(bytes: Buffer, mime: string): mime is PhotoMime {
  if (bytes.length < 12 || bytes.length > maxPhotoBytes) return false
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9
  if (mime === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  if (mime === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  return false
}

class EvidenceLimitError extends Error {}

function evidenceInfo(trainingId: number, evidence: { id: number; nombreArchivo: string; tipoArchivo: string | null }) {
  return { id: evidence.id, name: evidence.nombreArchivo, mimeType: evidence.tipoArchivo,
    url: `/api/v1/capacitaciones/${trainingId}/evidencias/${evidence.id}` }
}


const validDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const optionalText = (value: unknown, max: number): string | null | undefined => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || value.trim().length > max) return undefined
  return value.trim() || null
}

const optionalTime = (value: unknown): Date | null | undefined => {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return undefined
  return new Date(`1970-01-01T${value}:00.000Z`)
}

function serialize(item: {
  id: number
  tema: string
  descripcion: string | null
  fecha: Date
  horaInicio: Date | null
  horaFin: Date | null
  facilitadorNombre: string | null
  estado: string
  observaciones: string | null
  comunidadId: number | null
  comunidad: { id: number; nombre: string } | null
  asistenciasFamilia?: Array<{ familia: { id: number; nombreReferencia: string; comunidad: { id: number; nombre: string } } }>
  evidencias?: Array<{ evidencia: { id: number; nombreArchivo: string; tipoArchivo: string | null } }>
}) {
  return {
    id: item.id,
    tema: item.tema,
    descripcion: item.descripcion,
    fecha: item.fecha.toISOString().slice(0, 10),
    horaInicio: item.horaInicio?.toISOString().slice(11, 16) ?? null,
    horaFin: item.horaFin?.toISOString().slice(11, 16) ?? null,
    facilitadorNombre: item.facilitadorNombre,
    estado: item.estado,
    observaciones: item.observaciones,
    comunidadId: item.comunidadId,
    comunidad: item.comunidad,
    familiasPresentes: item.asistenciasFamilia?.map(asistencia => asistencia.familia) ?? [],
    evidencias: item.evidencias?.map(link => evidenceInfo(item.id, link.evidencia)) ?? [],
  }
}

// CAP-01: consultar capacitaciones; cada registro se puede mostrar en el calendario.
trainingRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await getPrismaClient().capacitacion.findMany({
      include: {
        comunidad: { select: { id: true, nombre: true } },
        evidencias: { where: { evidencia: { rutaArchivo: { startsWith: 'training/' } } }, include: { evidencia: { select: { id: true, nombreArchivo: true, tipoArchivo: true } } } },
        asistenciasFamilia: { include: { familia: {
          select: { id: true, nombreReferencia: true, comunidad: { select: { id: true, nombre: true } } },
        } } },
      },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
      take: 500,
    })
    res.setHeader('Cache-Control', 'no-store')
    res.json({ data: rows.map(serialize) })
  } catch (error) { next(error) }
})

// CAP-01: registrar una capacitación, sin modificar el esquema Prisma.
trainingRouter.post('/', requirePermission('CAPACITACIONES_WRITE'), async (req, res, next) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Solicitud no autorizada.' } })
    return
  }

  const body: unknown = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Se requiere un formulario válido.' } })
    return
  }

  const input = body as Record<string, unknown>
  const tema = typeof input.tema === 'string' ? input.tema.trim() : ''
  const fecha = typeof input.fecha === 'string' ? input.fecha : ''
  const descripcion = optionalText(input.descripcion, 2000)
  const facilitadorNombre = optionalText(input.facilitadorNombre, 160)
  const observaciones = optionalText(input.observaciones, 2000)
  const horaInicio = optionalTime(input.horaInicio)
  const horaFin = optionalTime(input.horaFin)
  const estado = input.estado === undefined ? 'PROGRAMADA' : input.estado
  const comunidadId = input.comunidadId == null || input.comunidadId === '' ? null : input.comunidadId

  if (!tema || tema.length > 160 || !validDate(fecha) ||
      descripcion === undefined || facilitadorNombre === undefined || observaciones === undefined ||
      horaInicio === undefined || horaFin === undefined ||
      (estado !== 'PROGRAMADA' && estado !== 'REALIZADA') ||
      (comunidadId !== null && (typeof comunidadId !== 'number' || !Number.isSafeInteger(comunidadId) || comunidadId <= 0)) ||
      (horaInicio && horaFin && horaFin <= horaInicio)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa el tema, la fecha, el horario y los demás datos.' } })
    return
  }

  try {
    const prisma = getPrismaClient()
    if (comunidadId !== null) {
      const community = await prisma.comunidad.findFirst({
        where: { id: Number(comunidadId), activo: true }, select: { id: true },
      })
      if (!community) {
        res.status(400).json({ error: { code: 'INVALID_COMMUNITY', message: 'Selecciona una comunidad activa.' } })
        return
      }
    }

    const saved = await prisma.capacitacion.create({
      data: {
        tema,
        descripcion,
        fecha: new Date(`${fecha}T00:00:00.000Z`),
        horaInicio,
        horaFin,
        facilitadorNombre,
        observaciones,
        estado,
        comunidadId: comunidadId === null ? null : Number(comunidadId),
      },
      include: { comunidad: { select: { id: true, nombre: true } } },
    })
    res.status(201).json({ data: serialize(saved) })
  } catch (error) { next(error) }
})


// CAP-02: familias agrupables por comunidad. No se usa paginación que oculte familias.
trainingRouter.get('/familias', async (_req, res, next) => {
  try {
    const rows = await getPrismaClient().familia.findMany({
      where: { comunidad: { activo: true, municipio: { activo: true } } },
      select: { id: true, nombreReferencia: true, comunidad: { select: { id: true, nombre: true } } },
      orderBy: [{ comunidad: { nombre: 'asc' } }, { nombreReferencia: 'asc' }, { id: 'asc' }],
    })
    res.setHeader('Cache-Control', 'no-store')
    res.json({ data: rows })
  } catch (error) { next(error) }
})

// CAP-02: guardar solamente las familias marcadas presentes, sin atribuir
// asistencia a un integrante específico. Los cambios son atómicos.
trainingRouter.put('/:id/asistencia-familiar', requirePermission('CAPACITACIONES_WRITE'), async (req, res, next) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Solicitud no autorizada.' } })
    return
  }
  const trainingId = Number(req.params.id)
  const ids: unknown = req.body?.familiaIds
  if (!Number.isSafeInteger(trainingId) || trainingId <= 0 || !Array.isArray(ids) ||
      ids.length < 1 || ids.length > 1000 ||
      ids.some(id => typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) ||
      new Set(ids).size !== ids.length) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Selecciona al menos una familia, sin duplicados.' } })
    return
  }
  try {
    const prisma = getPrismaClient()
    const saved = await prisma.$transaction(async tx => {
      const capacitacion = await tx.capacitacion.findUnique({ where: { id: trainingId }, select: { id: true } })
      if (!capacitacion) return { type: 'NOT_FOUND' as const }
      const valid = await tx.familia.count({ where: { id: { in: ids as number[] } } })
      if (valid !== ids.length) return { type: 'INVALID_FAMILY' as const }
      await tx.asistenciaFamiliaCapacitacion.deleteMany({ where: { capacitacionId: trainingId } })
      await tx.asistenciaFamiliaCapacitacion.createMany({
        data: (ids as number[]).map(familiaId => ({ capacitacionId: trainingId, familiaId })),
      })
      const row = await tx.capacitacion.update({
        where: { id: trainingId },
        data: { estado: 'REALIZADA' },
        include: {
          comunidad: { select: { id: true, nombre: true } },
          evidencias: { where: { evidencia: { rutaArchivo: { startsWith: 'training/' } } }, include: { evidencia: { select: { id: true, nombreArchivo: true, tipoArchivo: true } } } },
          asistenciasFamilia: { include: { familia: {
            select: { id: true, nombreReferencia: true, comunidad: { select: { id: true, nombre: true } } },
          } } },
        },
      })
      return { type: 'OK' as const, row }
    })
    if (saved.type === 'NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No existe la capacitación seleccionada.' } })
      return
    }
    if (saved.type === 'INVALID_FAMILY') {
      res.status(400).json({ error: { code: 'INVALID_FAMILY', message: 'Una de las familias seleccionadas ya no existe.' } })
      return
    }
    res.setHeader('Cache-Control', 'no-store')
    res.json({ data: serialize(saved.row) })
  } catch (error) { next(error) }
})


// CAP-03: archivos privados asociados a una capacitación existente. No exponer storage al público.
trainingRouter.get('/:id/evidencias/:evidenceId', async (req, res, next) => {
  const trainingId = Number(req.params.id)
  const evidenceId = Number(req.params.evidenceId)
  if (!Number.isSafeInteger(trainingId) || trainingId <= 0 || !Number.isSafeInteger(evidenceId) || evidenceId <= 0) {
    res.status(400).json({ error: { message: 'Identificador inválido.' } }); return
  }
  try {
    const link = await getPrismaClient().capacitacionEvidencia.findUnique({
    where: { capacitacionId_evidenciaId: { capacitacionId: trainingId, evidenciaId: evidenceId } },      include: { evidencia: { select: { rutaArchivo: true, tipoArchivo: true } } },
    })
    const match = /^training\/(\d+)\/([0-9a-f-]{36})\.(jpg|png|webp)$/.exec(link?.evidencia.rutaArchivo ?? '')
    if (!match || Number(match[1]) !== trainingId ||
        link?.evidencia.tipoArchivo !== `image/${match[3] === 'jpg' ? 'jpeg' : match[3]}`) {
      res.status(404).end(); return
    }
    const bytes = await readFile(join(evidenceRoot, String(trainingId), `${match[2]}.${match[3]}`))
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.type(link.evidencia.tipoArchivo!).send(bytes)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') { res.status(404).end(); return }
    next(error)
  }
})

trainingRouter.post('/:id/evidencias', requirePermission('CAPACITACIONES_WRITE'), photoBody, async (req, res, next) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    res.status(403).json({ error: { message: 'Solicitud no autorizada.' } }); return
  }
  const trainingId = Number(req.params.id)
  if (!Number.isSafeInteger(trainingId) || trainingId <= 0) {
    res.status(400).json({ error: { message: 'Capacitación inválida.' } }); return
  }
  const bytes: unknown = req.body
  const mime = req.get('Content-Type')?.split(';')[0]?.toLowerCase() ?? ''
  if (!Buffer.isBuffer(bytes) || !isValidImage(bytes, mime)) {
    res.status(415).json({ error: { message: 'Utiliza una fotografía JPEG, PNG o WebP válida, de máximo 3 MB.' } }); return
  }
  let name = 'Fotografía de capacitación'
  try { name = decodeURIComponent(req.get('X-File-Name') || name).replace(/[\/\\\x00-\x1f]/g, '').slice(0, 120) || name }
  catch { /* Usar nombre genérico */ }
  const prisma = getPrismaClient()
  const extension = photoExtensions[mime]
  const filename = `${randomUUID()}.${extension}`
  const folder = join(evidenceRoot, String(trainingId))
  const diskPath = join(folder, filename)
  let written = false
  try {
    const exists = await prisma.capacitacion.findUnique({ where: { id: trainingId }, select: { id: true } })
    if (!exists) { res.status(404).json({ error: { message: 'La capacitación no existe.' } }); return }
    await mkdir(folder, { recursive: true, mode: 0o700 })
    await writeFile(diskPath, bytes, { flag: 'wx', mode: 0o600 })
    written = true
    const evidence = await prisma.$transaction(async tx => {
      // Evitar superar el límite por subidas simultáneas a una misma capacitación.
      await tx.$queryRaw`SELECT 1::integer AS acquired FROM pg_advisory_xact_lock(${trainingId}::bigint)`
      const count = await tx.capacitacionEvidencia.count({ where: { capacitacionId: trainingId, evidencia: { rutaArchivo: { startsWith: `training/${trainingId}/` } } } })
      if (count >= maxPhotosPerTraining) throw new EvidenceLimitError('Esta capacitación ya tiene ocho fotografías.')
      const created = await tx.evidencia.create({ data: {
        nombreArchivo: name, rutaArchivo: `training/${trainingId}/${filename}`,
        tipoArchivo: mime, fechaRegistro: new Date(),
      } })
      await tx.capacitacionEvidencia.create({ data: { capacitacionId: trainingId, evidenciaId: created.id } })
      return created
    })
    res.setHeader('Cache-Control', 'no-store')
    res.status(201).json({ data: evidenceInfo(trainingId, evidence) })
  } catch (error) {
    if (written) await unlink(diskPath).catch(() => {})
    if (error instanceof EvidenceLimitError) { res.status(422).json({ error: { message: error.message } }); return }
    next(error)
  }
})
