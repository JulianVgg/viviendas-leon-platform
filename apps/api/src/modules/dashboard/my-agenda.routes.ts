import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { obtenerMiAgenda } from './my-agenda.service.js'

export const miAgendaRouter = Router()
miAgendaRouter.use(requireAuth)

miAgendaRouter.get('/', async (req: Request, res: Response) => {
  try {
    const user = await getAuthenticatedUser(req.session.userId!)
    if (!user) { res.status(401).json({ error: 'Sesión inválida.' }); return }
    const agenda = await obtenerMiAgenda(user)
    res.setHeader('Cache-Control', 'private, no-store')
    res.json(agenda)
  } catch (error) {
    console.error('[NTF-06] Error cargando agenda personal:', error)
    res.status(503).json({ error: 'No se pudo consultar la agenda personal.' })
  }
})
