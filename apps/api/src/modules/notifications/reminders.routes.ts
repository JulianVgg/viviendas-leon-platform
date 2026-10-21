import { Router, type Request, type Response } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { consultarPreferencias, guardarPreferencias, parsePreferencias } from './reminders.service.js'

export const remindersRouter = Router()
remindersRouter.use(requireAuth)
remindersRouter.get('/preferencias', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'private, no-store')
    res.json(await consultarPreferencias(req.session.userId!))
  } catch (error) { console.error('Error consultando preferencias:', error); res.status(503).json({ error: 'No se pudieron cargar las preferencias.' }) }
})
remindersRouter.put('/preferencias', async (req: Request, res: Response) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
  const opciones = parsePreferencias(req.body?.anticipaciones)
  if (!opciones) { res.status(400).json({ error: 'Selecciona opciones válidas, sin duplicados (máximo tres).' }); return }
  try {
    res.setHeader('Cache-Control', 'private, no-store')
    res.json(await guardarPreferencias(req.session.userId!, opciones))
  } catch (error) { console.error('Error guardando preferencias:', error); res.status(503).json({ error: 'No se pudieron actualizar las preferencias.' }) }
})
