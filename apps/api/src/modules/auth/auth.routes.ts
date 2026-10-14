
import { Router } from 'express'
import { login, logout, me } from './auth.controller.js'
import { requireAuth } from './auth.middleware.js'

export const authRouter = Router()

authRouter.post('/login', login)
authRouter.get('/me', requireAuth, me)
authRouter.post('/logout', requireAuth, logout)
