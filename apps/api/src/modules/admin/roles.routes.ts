import { Router } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { requirePermission, esDireccionGeneral } from '../auth/require-permission.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'

export const rolesRouter = Router()
rolesRouter.use(requirePermission('PANTALLA_ROLES_PERMISOS'))

function errorUnico(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
}

function idsValidos(entrada: unknown): entrada is number[] {
  return Array.isArray(entrada) && entrada.length <= 500 &&
    entrada.every((id) => Number.isSafeInteger(id) && id > 0) &&
    new Set(entrada).size === entrada.length
}

// Retornar roles con sus permisos existentes.
rolesRouter.get('/', async (_req, res, next) => {
  try {
    const roles = await getPrismaClient().rol.findMany({
      orderBy: { nombre: 'asc' },
      include: { permisos: { include: { permiso: true } } },
    })
    res.json({ data: roles.map((rol) => ({
      id: rol.id,
      nombre: rol.nombre,
      descripcion: rol.descripcion,
      activo: rol.activo,
      permisos: rol.permisos.map((item) => item.permiso),
    })) })
  } catch (error) { next(error) }
})

rolesRouter.get('/permisos', async (_req, res, next) => {
  try {
    const permisos = await getPrismaClient().permiso.findMany({ orderBy: { codigo: 'asc' } })
    res.json({ data: permisos })
  } catch (error) { next(error) }
})

rolesRouter.post('/', async (req, res, next) => {
  try {
    const { nombre, descripcion } = req.body ?? {}
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 80 ||
      (descripcion != null && typeof descripcion !== 'string') ||
      (typeof descripcion === 'string' && descripcion.length > 500)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Ingresa un nombre de rol válido.' } })
      return
    }
    if (esDireccionGeneral([nombre.trim()])) {
      res.status(403).json({ error: { code: 'PROTECTED_ROLE', message: 'El rol Dirección general es reservado.' } })
      return
    }
    const rol = await getPrismaClient().rol.create({
      data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || null, activo: true },
    })
    res.status(201).json({ data: rol })
  } catch (error) {
    if (errorUnico(error)) {
      res.status(409).json({ error: { code: 'DUPLICATE_ROLE', message: 'Ya existe un rol con ese nombre.' } })
      return
    }
    next(error)
  }
})

rolesRouter.post('/permisos', async (req, res, next) => {
  try {
    const { codigo, nombre, descripcion } = req.body ?? {}
    if (typeof codigo !== 'string' || typeof nombre !== 'string' ||
      !/^[A-Z][A-Z0-9_]{2,79}$/.test(codigo.trim().toUpperCase()) ||
      !nombre.trim() || nombre.trim().length > 100 ||
      (descripcion != null && typeof descripcion !== 'string') ||
      (typeof descripcion === 'string' && descripcion.length > 500)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Código o nombre del permiso no válido.' } })
      return
    }
    const permiso = await getPrismaClient().permiso.create({
      data: { codigo: codigo.trim().toUpperCase(), nombre: nombre.trim(), descripcion: descripcion?.trim() || null },
    })
    res.status(201).json({ data: permiso })
  } catch (error) {
    if (errorUnico(error)) {
      res.status(409).json({ error: { code: 'DUPLICATE_PERMISSION', message: 'Ya existe ese código de permiso.' } })
      return
    }
    next(error)
  }
})

// Actualiza un rol existente. No se permite borrar, renombrar ni desactivar
// el rol que gobierna la administración de usuarios.
rolesRouter.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const { nombre, descripcion, activo } = req.body ?? {}
    if (!Number.isSafeInteger(id) || id < 1 ||
      typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 80 ||
      (descripcion != null && (typeof descripcion !== 'string' || descripcion.length > 500)) ||
      typeof activo !== 'boolean') {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa el nombre, la descripción y el estado del rol.' } })
      return
    }
    const prisma = getPrismaClient()
    const rol = await prisma.rol.findUnique({ where: { id } })
    if (!rol) {
      res.status(404).json({ error: { code: 'ROLE_NOT_FOUND', message: 'El rol no existe.' } })
      return
    }
    const actorId = req.session.userId
    const actor = actorId ? await getAuthenticatedUser(actorId) : null
    if (esDireccionGeneral([rol.nombre]) && (!actor || !esDireccionGeneral(actor.roles))) {
      res.status(403).json({ error: { code: 'PROTECTED_ROLE', message: 'Solo Dirección general puede modificar ese rol.' } })
      return
    }
    const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    const eraDireccion = normalizar(rol.nombre) === 'direccion general'
    const seraDireccion = normalizar(nombre) === 'direccion general'
    if ((eraDireccion && (!seraDireccion || !activo)) || (!eraDireccion && seraDireccion)) {
      res.status(403).json({ error: { code: 'PROTECTED_ROLE', message: 'No se puede renombrar, desactivar ni sustituir el rol institucional Dirección general.' } })
      return
    }
    const actualizado = await prisma.rol.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        descripcion: typeof descripcion === 'string' ? descripcion.trim() || null : null,
        activo,
      },
    })
    res.json({ data: actualizado, message: 'Rol actualizado correctamente.' })
  } catch (error) {
    if (errorUnico(error)) {
      res.status(409).json({ error: { code: 'DUPLICATE_ROLE', message: 'Ya existe un rol con ese nombre.' } })
      return
    }
    next(error)
  }
})

// Reemplazo completo y atómico de los permisos de un rol.
rolesRouter.put('/:id/permisos', async (req, res, next) => {
  try {
    const rolId = Number(req.params.id)
    const permisoIds: unknown = req.body?.permisoIds
    if (!Number.isSafeInteger(rolId) || rolId < 1 || !idsValidos(permisoIds)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Rol o lista de permisos no válidos.' } })
      return
    }

    const prisma = getPrismaClient()
    const actorId = req.session.userId
    const actor = actorId ? await getAuthenticatedUser(actorId) : null
    const actorEsDireccion = Boolean(actor && esDireccionGeneral(actor.roles))
    const resultado = await prisma.$transaction(async (tx) => {
      const rol = await tx.rol.findUnique({ where: { id: rolId } })
      if (!rol) return 'NOT_FOUND'
      // Solo Dirección general puede editar los permisos de su propio rol.
      if (esDireccionGeneral([rol.nombre]) && !actorEsDireccion) return 'PROTECTED_ROLE'
      const existentes = await tx.permiso.count({ where: { id: { in: permisoIds } } })
      if (existentes !== permisoIds.length) return 'INVALID_PERMISSIONS'

      await tx.rolPermiso.deleteMany({ where: { rolId } })
      if (permisoIds.length) {
        await tx.rolPermiso.createMany({ data: permisoIds.map((permisoId) => ({ rolId, permisoId })) })
      }
      return 'OK'
    })

    if (resultado === 'NOT_FOUND') {
      res.status(404).json({ error: { code: 'ROLE_NOT_FOUND', message: 'El rol no existe.' } })
      return
    }
    if (resultado === 'PROTECTED_ROLE') {
      res.status(403).json({ error: { code: 'PROTECTED_ROLE', message: 'No puedes modificar ese rol.' } })
      return
    }
    if (resultado === 'INVALID_PERMISSIONS') {
      res.status(400).json({ error: { code: 'INVALID_PERMISSIONS', message: 'Hay permisos que no existen.' } })
      return
    }
    res.json({ message: 'Permisos actualizados correctamente.' })
  } catch (error) { next(error) }
})
