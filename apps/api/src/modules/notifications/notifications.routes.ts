import { Router, type Request, type Response, type NextFunction } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  contarNoLeidas, listarNotificaciones, marcarComoLeida, marcarTodasComoLeidas,
} from './notifications.service.js'
import { parseListarNotificacionesQuery, parseNotificacionId } from './notifications.validation.js'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

function errorValidacion(res: Response, mensaje: string) {
  res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: mensaje } })
}

// Las operaciones PATCH requieren una petición AJAX desde el cliente de la PWA.
function requireAjax(req: Request, res: Response, next: NextFunction) {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    res.status(403).json({ error: {
      code: 'FORBIDDEN', message: 'La solicitud debe realizarse desde la aplicación.',
    } })
    return
  }
  next()
}

// GET /api/v1/notificaciones?estado=no_leidas&pagina=1&limite=20
notificationsRouter.get('/', async (req, res, next) => {
  try {
    const filtros = parseListarNotificacionesQuery(req.query)
    if (!filtros) {
      errorValidacion(res, 'Usa estado=todas|leidas|no_leidas, pagina de 1 a 10000 y limite de 1 a 100.')
      return
    }
    res.json(await listarNotificaciones(req.session.userId!, filtros))
  } catch (error) { next(error) }
})

// GET /api/v1/notificaciones/contador
notificationsRouter.get('/contador', async (req, res, next) => {
  try {
    res.json(await contarNoLeidas(req.session.userId!))
  } catch (error) { next(error) }
})

// PATCH /api/v1/notificaciones/leer-todas
notificationsRouter.patch('/leer-todas', requireAjax, async (req, res, next) => {
  try {
    res.json(await marcarTodasComoLeidas(req.session.userId!))
  } catch (error) { next(error) }
})

// PATCH /api/v1/notificaciones/:id/leer
notificationsRouter.patch('/:id/leer', requireAjax, async (req, res, next) => {
  try {
    const id = parseNotificacionId(req.params.id)
    if (id === null) {
      errorValidacion(res, 'El identificador de la notificación debe ser un entero válido.')
      return
    }
    const notificacion = await marcarComoLeida(req.session.userId!, id)
    if (!notificacion) {
      // Mismo resultado para un ID inexistente o perteneciente a otro usuario.
      res.status(404).json({ error: {
        code: 'NOT_FOUND', message: 'Notificación no encontrada.',
      } })
      return
    }
    res.json({ id: notificacion.id, leida: true, fechaLectura: notificacion.fechaLectura })
  } catch (error) { next(error) }
})
