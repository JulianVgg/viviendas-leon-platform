
import type { Request, Response, NextFunction } from 'express'
import { getAuthenticatedUser } from './auth.service.js'

export async function requireAuth(
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

    next()
  } catch (error) {
    next(error)
  }
}
