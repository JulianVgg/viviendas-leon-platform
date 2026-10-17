import { Router } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { requireAuth } from '../auth/auth.middleware.js'

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
    const camposPermitidos = new Set(['nombre', 'apellido', 'correo', 'telefono'])
    if (Object.keys(datos).some((campo) => !camposPermitidos.has(campo))) {
      res.status(400).json({ error: { code: 'FORBIDDEN_FIELD', message: 'Solo puedes modificar nombre, apellido, correo y teléfono.' } })
      return
    }

    if (typeof datos.nombre !== 'string' || typeof datos.correo !== 'string' ||
      (datos.apellido != null && typeof datos.apellido !== 'string') ||
      (datos.telefono != null && typeof datos.telefono !== 'string')) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos ingresados.' } })
      return
    }

    const nombre = datos.nombre.trim()
    const apellido = typeof datos.apellido === 'string' ? datos.apellido.trim() : ''
    const telefono = typeof datos.telefono === 'string' ? datos.telefono.trim() : ''
    const correo = datos.correo.trim().toLowerCase()

    if (!nombre || nombre.length > 100 || apellido.length > 100 || telefono.length > 30 ||
      correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Verifica el nombre, correo y longitudes de los campos.' } })
      return
    }

    const id = req.session.userId
    if (!id) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesión.' } })
      return
    }

    await getPrismaClient().usuario.update({
      where: { id },
      data: {
        nombre,
        apellido: apellido || null,
        telefono: telefono || null,
        correo,
      },
    })

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
