import { Router } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { puedeEditarPerfilCompleto } from './profile.permissions.js'

export const profileRouter = Router()
profileRouter.use(requireAuth)

// Solo el usuario de la sesión puede modificar estos cuatro campos.
profileRouter.patch('/', async (req, res, next) => {
  try {
    const body: unknown = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Envía los datos del perfil.' } })
      return
    }

    const datos = body as Record<string, unknown>
    const id = req.session.userId!
    const usuarioActual = await getAuthenticatedUser(id)
    if (!usuarioActual) { res.status(401).json({ error: { message: 'Sesión inválida.' } }); return }
    const privilegiado = puedeEditarPerfilCompleto(usuarioActual.roles)
    const camposPermitidos = privilegiado
      ? new Set(['nombre', 'apellido', 'correo', 'telefono']) : new Set(['telefono'])
    if (Object.keys(datos).some(campo => !camposPermitidos.has(campo)) || !Object.keys(datos).length) {
      res.status(403).json({ error: { code: 'FORBIDDEN_FIELD', message: 'No tienes permiso para modificar esos datos.' } })
      return
    }
    if ((datos.telefono != null && typeof datos.telefono !== 'string') ||
        (privilegiado && (typeof datos.nombre !== 'string' || typeof datos.correo !== 'string' ||
          (datos.apellido != null && typeof datos.apellido !== 'string')))) {
      res.status(400).json({ error: { message: 'Revisa los datos ingresados.' } })
      return
    }
    const telefono = typeof datos.telefono === 'string' ? datos.telefono.trim() : ''
    if (telefono.length > 30) { res.status(400).json({ error: { message: 'Teléfono demasiado largo.' } }); return }
    const data: { telefono: string | null; nombre?: string; apellido?: string | null; correo?: string } = {
      telefono: telefono || null,
    }
    if (privilegiado) {
      const nombre = (datos.nombre as string).trim()
      const apellido = typeof datos.apellido === 'string' ? datos.apellido.trim() : ''
      const correo = (datos.correo as string).trim().toLowerCase()
      if (!nombre || nombre.length > 100 || apellido.length > 100 || correo.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        res.status(400).json({ error: { message: 'Revisa el nombre y el correo.' } }); return
      }
      data.nombre = nombre
      data.apellido = apellido || null
      data.correo = correo
    }
    await getPrismaClient().usuario.update({ where: { id }, data })

    const usuario = await getAuthenticatedUser(id)
    res.json({ message: 'Perfil actualizado.', usuario })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      res.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'El correo ya está registrado.' } })
      return
    }
    next(error)
  }
})
