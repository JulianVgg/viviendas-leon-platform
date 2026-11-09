import { Router, type NextFunction, type Request, type Response } from 'express'
import { Prisma } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { esDireccionGeneral } from '../auth/require-permission.middleware.js'
import { requireCatalogWrite } from './insumos.routes.js'
import { catalogNameKey, parseCatalogId, validateCategoriaInput } from './insumos.validation.js'

export const sanidadRouter = Router()
sanidadRouter.use(requireAuth)
type TipoSanidad = 'plagas' | 'enfermedades'
const isTipo = (v: string): v is TipoSanidad => v === 'plagas' || v === 'enfermedades'
const selectSanidad = { id: true, nombre: true, descripcion: true, activo: true } as const

async function readCatalog(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthenticatedUser(req.session.userId!)
    if (!user) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sesión no válida.' } }); return }
    if (!esDireccionGeneral(user.roles) && !['PANTALLA_INSUMOS', 'PANTALLA_VISITAS_NUEVA', 'VISITAS_WRITE'].some(p => user.permisos.includes(p))) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No puedes consultar el catálogo.' } }); return
    }
    next()
  } catch (err) { next(err) }
}

sanidadRouter.get('/', readCatalog, async (_req, res, next) => {
  try {
    const db = getPrismaClient()
    const [plagas, enfermedades] = await Promise.all([
      db.plaga.findMany({ select: selectSanidad, orderBy: { nombre: 'asc' } }),
      db.enfermedad.findMany({ select: selectSanidad, orderBy: { nombre: 'asc' } }),
    ])
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: { plagas, enfermedades } })
  } catch (err) { next(err) }
})

sanidadRouter.get('/disponibles', readCatalog, async (_req, res, next) => {
  try {
    const db = getPrismaClient()
    const [plagas, enfermedades] = await Promise.all([
      db.plaga.findMany({ where: { activo: true }, select: selectSanidad, orderBy: { nombre: 'asc' } }),
      db.enfermedad.findMany({ where: { activo: true }, select: selectSanidad, orderBy: { nombre: 'asc' } }),
    ])
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: { plagas, enfermedades } })
  } catch (err) { next(err) }
})

async function mutate(req: Request, res: Response, next: NextFunction) {
  const tipo = String(req.params.tipo)
  if (!isTipo(tipo)) { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Catálogo inexistente.' } }); return }
  const id = req.method === 'PATCH' ? parseCatalogId(req.params.id) : null
  if (req.method === 'PATCH' && !id) { res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID inválido.' } }); return }
  const result = validateCategoriaInput(req.body)
  if (!result.data) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos.', details: result.details } }); return }
  try {
    const input = result.data
    const data = await getPrismaClient().$transaction(async tx => {
      const key = catalogNameKey(input.nombre)
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`sanidad:${tipo}:${key}`}, 0))`
      const rows = tipo === 'plagas' ? await tx.plaga.findMany({ select: selectSanidad }) : await tx.enfermedad.findMany({ select: selectSanidad })
      if (id && !rows.some(row => row.id === id)) throw new Error('NOT_FOUND')
      if (rows.some(row => row.id !== id && catalogNameKey(row.nombre) === key)) throw new Error('DUPLICATE')
      const previous = id ? rows.find(row => row.id === id) : null
      const record = tipo === 'plagas'
        ? id ? await tx.plaga.update({ where: { id }, data: input, select: selectSanidad }) : await tx.plaga.create({ data: input, select: selectSanidad })
        : id ? await tx.enfermedad.update({ where: { id }, data: input, select: selectSanidad }) : await tx.enfermedad.create({ data: input, select: selectSanidad })
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: tipo === 'plagas' ? 'plaga' : 'enfermedad', registroId: String(record.id),
        accion: id ? 'UPDATE' : 'CREATE', fecha: new Date(),
        ...(previous ? { datosAnteriores: JSON.stringify(previous) } : {}),
        datosNuevos: JSON.stringify(record), descripcion: 'Mantenimiento del catálogo fitosanitario autorizado.',
      } })
      return record
    })
    res.status(id ? 200 : 201).json({ data })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Registro inexistente.' } }); return }
    if (err instanceof Error && err.message === 'DUPLICATE' || err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: { code: 'DUPLICATE_NAME', message: 'Ya existe un registro con ese nombre.' } }); return
    }
    next(err)
  }
}
sanidadRouter.post('/:tipo', requireCatalogWrite, mutate)
sanidadRouter.patch('/:tipo/:id', requireCatalogWrite, mutate)
