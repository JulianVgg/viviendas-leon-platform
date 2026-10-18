
import type { Request, Response, NextFunction } from 'express'
import { getAuthenticatedUser } from './auth.service.js'

export async function requirePasswordChangeCompleted(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.session.userId

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesión.',
        },
      })
      return
    }

    const usuario = await getAuthenticatedUser(userId)

    if (!usuario) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Tu sesión no es válida.',
        },
      })
      return
    }

    if (usuario.debeCambiarPassword) {
      res.status(403).json({
        error: {
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Debes establecer tu contraseña personal antes de continuar.',
        },
      })
      return
    }

    next()
  } catch (error) {
    next(error)
  }
}
