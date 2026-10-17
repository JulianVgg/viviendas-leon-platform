

import { Router } from 'express'
import {
  login,
  logout,
  me,
  actualizarPassword,
} from './auth.controller.js'

import { requireAuth } from './auth.middleware.js'

export const authRouter = Router()

authRouter.post('/login', login)
authRouter.get('/me', requireAuth, me)
authRouter.post('/logout', requireAuth, logout)

// AUTH-04: Cambiar contraseña del usuario autenticado
authRouter.patch(
  '/password',
  requireAuth,
  actualizarPassword,
)


authRouter.patch(
  '/password',
  requireAuth,
  actualizarPassword,
)