
import type { Request, Response, NextFunction } from 'express'

import {
  validateCredentials,
  getAuthenticatedUser,
  cambiarPassword,
} from './auth.service.js'


export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { correo, password } = req.body ?? {}

    if (
      typeof correo !== 'string' ||
      typeof password !== 'string' ||
      !correo.trim() ||
      !password
    ) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Ingresa tu correo y contraseña.',
        },
      })
      return
    }

    const usuario = await validateCredentials(correo, password)

    if (!usuario) {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Correo o contraseña incorrectos.',
        },
      })
      return
    }

    req.session.regenerate((error) => {
      if (error) {
        next(error)
        return
      }

      req.session.userId = usuario.id

      req.session.save((saveError) => {
        if (saveError) {
          next(saveError)
          return
        }

        res.status(200).json({
          message: 'Inicio de sesión exitoso.',
          usuario,
        })
      })
    })
  } catch (error) {
    next(error)
  }
}

export async function me(
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
      req.session.destroy(() => {})
      res.clearCookie('viviendas_leon.sid', { path: '/' })
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sesión no válida.',
        },
      })
      return
    }

    res.status(200).json({ usuario })
  } catch (error) {
    next(error)
  }
}

export function logout(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.session.destroy((error) => {
    if (error) {
      next(error)
      return
    }

    res.clearCookie('viviendas_leon.sid', { path: '/' })

    res.status(200).json({
      message: 'Sesión cerrada correctamente.',
    })
  })
}



export async function actualizarPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const usuarioId = req.session.userId
    const { passwordActual, passwordNueva } = req.body ?? {}

    if (
      !usuarioId ||
      typeof passwordActual !== 'string' ||
      typeof passwordNueva !== 'string'
    ) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Debes proporcionar ambas contraseñas.',
        },
      })
      return
    }

    await cambiarPassword(
      usuarioId,
      passwordActual,
      passwordNueva,
    )

    res.status(200).json({
      message: 'Contraseña actualizada correctamente.',
    })
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        error: {
          code: 'PASSWORD_ERROR',
          message: error.message,
        },
      })
      return
    }

    next(error)
  }
}
