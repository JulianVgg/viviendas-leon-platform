import { Router, raw } from 'express'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requireFamilyWrite } from './families.authorization.js'
import { parseFamilyId } from './families.validation.js'
import { detectFamilyPhoto, MAX_FAMILY_PHOTO_BYTES } from './family-photo.validation.js'

export const familyPhotoRouter = Router()
// La carpeta debe vivir en el volumen persistente de apps/api/storage en Railway.
const photoDir = path.resolve(process.env.FAMILY_IMAGE_DIR || fileURLToPath(new URL('../../../storage/families/', import.meta.url)))
familyPhotoRouter.get('/:id/foto', requireAuth, async (req, res, next) => {
  const id = parseFamilyId(req.params.id)
  if (!id) return res.status(400).json({ error: { message: 'Familia no válida.' } })
  try {
    const rows = await getPrismaClient().$queryRaw<Array<{ foto_ruta: string | null; foto_mime: string | null }>>`SELECT foto_ruta, foto_mime FROM familia WHERE id = ${id}`
    const family = rows[0]
    if (!family?.foto_ruta || !family.foto_mime || !['image/png', 'image/jpeg', 'image/webp'].includes(family.foto_mime)) return res.status(404).end()
    const bytes = await readFile(path.join(photoDir, path.basename(family.foto_ruta))).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null
      throw error
    })
    if (!bytes) return res.status(404).end()
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.type(family.foto_mime).send(bytes)
  } catch (error) { next(error) }
})

familyPhotoRouter.put('/:id/foto', requireAuth, requireFamilyWrite, raw({ type: () => true, limit: '4mb' }), async (req, res, next) => {
  const id = parseFamilyId(req.params.id)
  if (!id) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Familia no válida.' } })
  const bytes = req.body
  const fileType = Buffer.isBuffer(bytes) ? detectFamilyPhoto(bytes) : null
  const contentType = req.get('Content-Type')?.split(';')[0]?.toLowerCase()
  if (!fileType || bytes.length === 0 || bytes.length > MAX_FAMILY_PHOTO_BYTES || contentType !== fileType.mime) return res.status(415).json({ error: { code: 'INVALID_PHOTO', message: 'Selecciona una fotografía JPG, PNG o WebP de hasta 4 MB.' } })
  let newPath: string | undefined
  try {
    const prisma = getPrismaClient()
    const oldRows = await prisma.$queryRaw<Array<{ foto_ruta: string | null }>>`SELECT foto_ruta FROM familia WHERE id = ${id}`
    const old = oldRows[0]
    if (!old) return res.status(404).json({ error: { code: 'FAMILY_NOT_FOUND', message: 'No existe la familia.' } })
    await mkdir(photoDir, { recursive: true })
    const filename = `${randomUUID()}${fileType.extension}`
    newPath = path.join(photoDir, filename)
    await writeFile(newPath, bytes, { flag: 'wx' })
    // Evita registrar una ruta que todavía no tiene archivo.
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE familia SET foto_ruta = ${filename}, foto_mime = ${fileType.mime}, foto_actualizada_en = ${new Date()} WHERE id = ${id}`
      await tx.bitacora.create({ data: { usuarioId: req.session.userId!, entidad: 'familia', registroId: String(id), accion: 'UPDATE', fecha: new Date(), descripcion: 'Fotografía de referencia actualizada.' } })
    })
    newPath = undefined
    if (old.foto_ruta) await unlink(path.join(photoDir, path.basename(old.foto_ruta))).catch(() => {})
    res.setHeader('Cache-Control', 'private, no-store')
    return res.json({ data: { tieneFoto: true, fotoUrl: `/api/v1/familias/${id}/foto?v=${Date.now()}` } })
  } catch (error) { if (newPath) await unlink(newPath).catch(() => {}); next(error) }
})

familyPhotoRouter.delete('/:id/foto', requireAuth, requireFamilyWrite, async (req, res, next) => {
  const id = parseFamilyId(req.params.id)
  if (!id) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Familia no válida.' } })
  try {
    const prisma = getPrismaClient()
    const existingRows = await prisma.$queryRaw<Array<{ foto_ruta: string | null }>>`SELECT foto_ruta FROM familia WHERE id = ${id}`
    const existing = existingRows[0]
    if (!existing) return res.status(404).json({ error: { code: 'FAMILY_NOT_FOUND', message: 'La familia no existe.' } })
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE familia SET foto_ruta = NULL, foto_mime = NULL, foto_actualizada_en = NULL WHERE id = ${id}`
      await tx.bitacora.create({ data: { usuarioId: req.session.userId!, entidad: 'familia', registroId: String(id), accion: 'UPDATE', fecha: new Date(), descripcion: 'Fotografía de referencia retirada.' } })
    })
    if (existing.foto_ruta) await unlink(path.join(photoDir, path.basename(existing.foto_ruta))).catch(() => {})
    res.setHeader('Cache-Control', 'private, no-store')
    return res.json({ data: { tieneFoto: false, fotoUrl: null } })
  } catch (error) { next(error) }
})
