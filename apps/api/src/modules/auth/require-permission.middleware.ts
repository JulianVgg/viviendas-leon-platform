import type { Request, Response, NextFunction } from 'express'
import { getAuthenticatedUser } from './auth.service.js'


export function esDireccionGeneral(roles: string[]): boolean {
  return roles.some((rol) =>
    rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'direccion general',
  )
}

export function requirePermission(codigo: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.session.userId
      if (!userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesión.' } })
        return
      }

      // No se confía en roles o permisos enviados por el navegador.
      const usuario = await getAuthenticatedUser(userId)
      if (!usuario) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sesión no válida.' } })
        return
      }
      if (!esDireccionGeneral(usuario.roles) && !usuario.permisos.includes(codigo)) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Tu rol no tiene permiso para realizar esta operación.',
          },
        })
        return
      }
      next()
    } catch (error) {
      next(error)
    }
  }
}
