import { Router, type NextFunction, type Response, type Request } from 'express'
import { Prisma } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { esDireccionGeneral, requirePermission } from '../auth/require-permission.middleware.js'
import {
  catalogNameKey, parseCatalogId, validateCategoriaInput, validateInsumoInput,
  type CatalogFieldError,
} from './insumos.validation.js'

export const insumosRouter = Router()
insumosRouter.use(requireAuth)

type ErrorCatalog = { code: string; message: string; details?: CatalogFieldError[] }
class CatalogError extends Error {
  constructor(public readonly status: 404 | 409, public readonly code: string, message: string) { super(message) }
}
const selectCategoria = { id: true, nombre: true, descripcion: true, activo: true, _count: { select: { insumos: true } } } satisfies Prisma.CategoriaInsumoSelect
const selectInsumo = {
  id: true, nombre: true, descripcion: true, activo: true, categoriaInsumoId: true,
  categoriaInsumo: { select: { id: true, nombre: true, activo: true } },
  _count: { select: { tratamientos: true, detallesEntrega: true } },
} satisfies Prisma.InsumoSelect

type ProductRecord = Prisma.InsumoGetPayload<{ select: typeof selectInsumo }>
type CategoryRecord = Prisma.CategoriaInsumoGetPayload<{ select: typeof selectCategoria }>
const productoJson = ({ _count, ...row }: ProductRecord) => ({ ...row, tratamientosCount: _count.tratamientos, entregasCount: _count.detallesEntrega })
const categoriaJson = ({ _count, ...row }: CategoryRecord) => ({ ...row, insumosCount: _count.insumos })

function sendError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof CatalogError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } satisfies ErrorCatalog })
    return
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: { code: 'DUPLICATE_NAME', message: 'Ya existe una opción con ese nombre.' } })
    return
  }
  next(err)
}

async function uniqueName(tx: Prisma.TransactionClient, tipo: 'categoria' | 'insumo', nombre: string, exceptId?: number) {
  const key = catalogNameKey(nombre)
  // Misma estrategia transaccional de AGR-02: evita duplicados en solicitudes concurrentes.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`insumos:${tipo}:${key}`}, 0))`
  const rows = tipo === 'insumo'
    ? await tx.insumo.findMany({ select: { id: true, nombre: true } })
    : await tx.categoriaInsumo.findMany({ select: { id: true, nombre: true } })
  if (rows.some(row => row.id !== exceptId && catalogNameKey(row.nombre) === key)) {
    throw new CatalogError(409, 'DUPLICATE_NAME', 'Ya existe una opción con ese nombre o una variante ortográfica.')
  }
}

async function requireCatalogRead(req: Request, res: Response, next: NextFunction) {
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sesión no válida.' } }); return }
    if (!esDireccionGeneral(usuario.roles) && !['PANTALLA_INSUMOS', 'PANTALLA_VISITAS_NUEVA', 'VISITAS_READ', 'VISITAS_WRITE'].some(p => usuario.permisos.includes(p))) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No tienes permiso para consultar productos.' } }); return
    }
    next()
  } catch (error) { next(error) }
}

// Técnico, Coordinación y Dirección administran el mismo catálogo.
// El permiso se verifica en la API: ocultar botones no es una restricción suficiente.
export async function requireCatalogWrite(req: Request, res: Response, next: NextFunction) {
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sesión inválida.' } }); return }
    const rolesPermitidos = ['tecnico agropecuario', 'coordinadora del programa agroforestal',
      'coordinador del programa agroforestal', 'coordinacion']
    const rolAutorizado = usuario.roles.some(rol => rolesPermitidos.includes(
      rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()))
    if (!esDireccionGeneral(usuario.roles) && (!rolAutorizado || !usuario.permisos.includes('INSUMOS_WRITE'))) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No tienes permiso para administrar los catálogos agrícolas.' } }); return
    }
    next()
  } catch (error) { next(error) }
}

// Las opciones activas se podrán consultar desde el registro de visitas (CIR-18).
insumosRouter.get('/disponibles', requireCatalogRead, async (_req, res, next) => {
  try {
    const rows = await getPrismaClient().insumo.findMany({
      where: { activo: true, categoriaInsumo: { activo: true } },
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      select: { id: true, nombre: true, descripcion: true, categoriaInsumoId: true, categoriaInsumo: { select: { nombre: true } } },
    })
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: rows })
  } catch (error) { next(error) }
})

insumosRouter.get('/categorias', requirePermission('PANTALLA_INSUMOS'), async (_req, res, next) => {
  try {
    const rows = await getPrismaClient().categoriaInsumo.findMany({ orderBy: [{ nombre: 'asc' }, { id: 'asc' }], select: selectCategoria })
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: rows.map(categoriaJson) })
  } catch (error) { next(error) }
})

insumosRouter.get('/', requirePermission('PANTALLA_INSUMOS'), async (_req, res, next) => {
  try {
    const rows = await getPrismaClient().insumo.findMany({ orderBy: [{ nombre: 'asc' }, { id: 'asc' }], select: selectInsumo })
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: rows.map(productoJson) })
  } catch (error) { next(error) }
})

insumosRouter.post('/categorias', requireCatalogWrite, async (req, res, next) => {
  const result = validateCategoriaInput(req.body)
  if (!result.data) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos de la categoría.', details: result.details } }); return }
  try {
    const data = await getPrismaClient().$transaction(async tx => {
      await uniqueName(tx, 'categoria', result.data!.nombre)
      const category = await tx.categoriaInsumo.create({ data: result.data!, select: selectCategoria })
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'categoria_insumo', registroId: String(category.id), accion: 'CREATE', fecha: new Date(),
        datosNuevos: JSON.stringify(categoriaJson(category)), descripcion: 'Alta de categoría de insumos.',
      } })
      return categoriaJson(category)
    })
    res.status(201).json({ data })
  } catch (err) { sendError(err, res, next) }
})

insumosRouter.patch('/categorias/:id', requireCatalogWrite, async (req, res, next) => {
  const id = parseCatalogId(req.params.id)
  const result = validateCategoriaInput(req.body)
  if (!id || !result.data) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Identificador o datos inválidos.', details: result.details } }); return }
  try {
    const data = await getPrismaClient().$transaction(async tx => {
      const locked = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM categoria_insumo WHERE id = ${id} FOR UPDATE`
      if (!locked.length) throw new CatalogError(404, 'NOT_FOUND', 'No se encontró la categoría.')
      const previous = await tx.categoriaInsumo.findUniqueOrThrow({ where: { id }, select: selectCategoria })
      if (catalogNameKey(previous.nombre) !== catalogNameKey(result.data!.nombre)) await uniqueName(tx, 'categoria', result.data!.nombre, id)
      if (previous.activo && !result.data!.activo) {
        const activos = await tx.insumo.count({ where: { categoriaInsumoId: id, activo: true } })
        if (activos) throw new CatalogError(409, 'CATEGORY_IN_USE', 'Desactiva primero los productos activos de esta categoría.')
      }
      const changed = previous.nombre !== result.data!.nombre || previous.descripcion !== result.data!.descripcion || previous.activo !== result.data!.activo
      if (!changed) return categoriaJson(previous)
      const updated = await tx.categoriaInsumo.update({ where: { id }, data: result.data!, select: selectCategoria })
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'categoria_insumo', registroId: String(id), accion: 'UPDATE', fecha: new Date(),
        datosAnteriores: JSON.stringify(categoriaJson(previous)), datosNuevos: JSON.stringify(categoriaJson(updated)), descripcion: 'Actualización de categoría de insumos.',
      } })
      return categoriaJson(updated)
    })
    res.json({ data })
  } catch (err) { sendError(err, res, next) }
})

insumosRouter.post('/', requireCatalogWrite, async (req, res, next) => {
  const result = validateInsumoInput(req.body)
  if (!result.data) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos del producto.', details: result.details } }); return }
  try {
    const data = await getPrismaClient().$transaction(async tx => {
      const categoria = await tx.categoriaInsumo.findUnique({ where: { id: result.data!.categoriaInsumoId }, select: { activo: true } })
      if (!categoria) throw new CatalogError(404, 'CATEGORY_NOT_FOUND', 'La categoría no existe.')
      if (result.data!.activo && !categoria.activo) throw new CatalogError(409, 'CATEGORY_INACTIVE', 'No puedes activar un producto dentro de una categoría inactiva.')
      await uniqueName(tx, 'insumo', result.data!.nombre)
      const record = await tx.insumo.create({ data: result.data!, select: selectInsumo })
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'insumo', registroId: String(record.id), accion: 'CREATE', fecha: new Date(),
        datosNuevos: JSON.stringify(productoJson(record)), descripcion: 'Alta de producto en el catálogo agrícola.',
      } })
      return productoJson(record)
    })
    res.status(201).json({ data })
  } catch (err) { sendError(err, res, next) }
})

insumosRouter.patch('/:id', requireCatalogWrite, async (req, res, next) => {
  const id = parseCatalogId(req.params.id)
  const result = validateInsumoInput(req.body)
  if (!id || !result.data) { res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Identificador o datos inválidos.', details: result.details } }); return }
  try {
    const data = await getPrismaClient().$transaction(async tx => {
      const locked = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM insumo WHERE id = ${id} FOR UPDATE`
      if (!locked.length) throw new CatalogError(404, 'NOT_FOUND', 'No se encontró el producto.')
      const previous = await tx.insumo.findUniqueOrThrow({ where: { id }, select: selectInsumo })
      const category = await tx.categoriaInsumo.findUnique({ where: { id: result.data!.categoriaInsumoId }, select: { activo: true } })
      if (!category) throw new CatalogError(404, 'CATEGORY_NOT_FOUND', 'La categoría no existe.')
      if (result.data!.activo && !category.activo) throw new CatalogError(409, 'CATEGORY_INACTIVE', 'No puedes activar un producto dentro de una categoría inactiva.')
      if (catalogNameKey(previous.nombre) !== catalogNameKey(result.data!.nombre)) await uniqueName(tx, 'insumo', result.data!.nombre, id)
      const input = result.data!
      if (previous.nombre === input.nombre && previous.descripcion === input.descripcion && previous.activo === input.activo && previous.categoriaInsumoId === input.categoriaInsumoId) return productoJson(previous)
      const record = await tx.insumo.update({ where: { id }, data: input, select: selectInsumo })
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'insumo', registroId: String(id), accion: 'UPDATE', fecha: new Date(),
        datosAnteriores: JSON.stringify(productoJson(previous)), datosNuevos: JSON.stringify(productoJson(record)), descripcion: 'Edición o cambio de estado de producto agrícola.',
      } })
      return productoJson(record)
    })
    res.json({ data })
  } catch (err) { sendError(err, res, next) }
})
