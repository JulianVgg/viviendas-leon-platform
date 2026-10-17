import type { Request, Response, NextFunction } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { esDireccionGeneral } from '../auth/require-permission.middleware.js'

// Un administrador delegado puede gestionar usuarios, pero no crear cuentas
// de Dirección general ni editar/desactivar cuentas que tengan ese rol.
// Se aplica ANTES de las rutas mutadoras de usersRouter.
export async function protectDirectorAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      next()
      return
    }

    const actorId = req.session.userId
    const actor = actorId ? await getAuthenticatedUser(actorId) : null
    if (!actor) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesión.' } })
      return
    }
    if (esDireccionGeneral(actor.roles)) {
      next()
      return
    }

    const prisma = getPrismaClient()
    const rolSolicitado = req.body?.rolId
    if (rolSolicitado !== undefined) {
      const rolId = Number(rolSolicitado)
      if (!Number.isSafeInteger(rolId) || rolId <= 0) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Selecciona un rol válido.' } })
        return
      }
      const rol = await prisma.rol.findUnique({ where: { id: rolId }, select: { nombre: true } })
      if (rol && esDireccionGeneral([rol.nombre])) {
        res.status(403).json({ error: { code: 'PROTECTED_ROLE', message: 'Solo Dirección general puede asignar el rol Dirección general.' } })
        return
      }
    }

    // En /usuarios/:id y /usuarios/:id/estado, proteger a las cuentas de Dirección general.
    const partes = req.path.split('/').filter(Boolean)
    const objetivoId = Number(partes[0])
    if (Number.isSafeInteger(objetivoId) && objetivoId > 0) {
      const objetivo = await prisma.usuario.findUnique({
        where: { id: objetivoId },
        select: { roles: { select: { rol: { select: { nombre: true } } } } },
      })
      if (objetivo && esDireccionGeneral(objetivo.roles.map((r) => r.rol.nombre))) {
        res.status(403).json({ error: { code: 'PROTECTED_USER', message: 'Solo Dirección general puede modificar esa cuenta.' } })
        return
      }
    }

    next()
  } catch (error) {
    next(error)
  }
}
