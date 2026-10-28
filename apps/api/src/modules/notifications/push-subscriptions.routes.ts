import { Router, type Request, type Response, type NextFunction } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import {
  validarSuscripcionPush,
  registrarSuscripcionPush,
  listarSuscripcionesPush,
  eliminarSuscripcionPush,
} from './push-subscriptions.service.js'
import { enviarPruebaPush } from './push-sender.service.js'

export const pushSubscriptionsRouter = Router()
pushSubscriptionsRouter.use(requireAuth)

// Mantener la misma protección para escrituras que utiliza el módulo de notificaciones.
function requireAjax(req: Request, res: Response, next: NextFunction) {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Solicitud no permitida.' } })
    return
  }
  next()
}

// GET /api/v1/notificaciones/push/clave-publica
pushSubscriptionsRouter.get('/clave-publica', (_req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  if (!publicKey || !process.env.VAPID_PRIVATE_KEY) {
    res.status(503).json({
      error: { code: 'PUSH_NOT_CONFIGURED', message: 'Las notificaciones push no están configuradas.' },
    })
    return
  }
  res.json({ publicKey })
})

// GET /api/v1/notificaciones/push/suscripciones
pushSubscriptionsRouter.get('/suscripciones', async (req, res, next) => {
  try {
    const dispositivos = await listarSuscripcionesPush(req.session.userId!)
    res.json({ dispositivos })
  } catch (error) { next(error) }
})

// POST /api/v1/notificaciones/push/prueba
// Enviar solo a los dispositivos del usuario autenticado, sin aceptar destinatarios.
pushSubscriptionsRouter.post('/prueba', requireAjax, async (req, res, next) => {
  try {
    const resultado = await enviarPruebaPush(req.session.userId!)
    if (resultado.estado === 'sin_configuracion') {
      res.status(503).json({ error: {
        code: 'PUSH_NOT_CONFIGURED', message: 'Falta configurar VAPID en este servidor.',
      } })
      return
    }
    if (resultado.estado === 'limite') {
      res.setHeader('Retry-After', String(resultado.esperaSegundos))
      res.status(429).json({ error: {
        code: 'RATE_LIMIT', message: `Espera ${resultado.esperaSegundos} segundos antes de volver a probar.`,
      } })
      return
    }
    if (resultado.estado === 'sin_dispositivos') {
      res.status(409).json({ error: {
        code: 'NO_DEVICES', message: 'No tienes dispositivos registrados.',
      } })
      return
    }
    // 'aceptadas' significa aceptación por el proveedor push, no visualización garantizada.
    res.status(200).json(resultado)
  } catch (error) { next(error) }
})

// POST /api/v1/notificaciones/push/suscripciones
pushSubscriptionsRouter.post('/suscripciones', requireAjax, async (req, res, next) => {
  try {
    if (!req.is('application/json')) {
      res.status(415).json({
        error: { code: 'INVALID_CONTENT_TYPE', message: 'Se requiere JSON.' },
      })
      return
    }
    const datos = validarSuscripcionPush(req.body)
    if (!datos) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'La suscripción push no es válida o no es compatible.' },
      })
      return
    }
    const resultado = await registrarSuscripcionPush(req.session.userId!, datos)
    if (resultado.estado === 'conflicto') {
      res.status(409).json({
        error: { code: 'SUBSCRIPTION_CONFLICT', message: 'Este dispositivo ya está asociado a otra cuenta o se registró simultáneamente.' },
      })
      return
    }
    if (resultado.estado === 'limite') {
      res.status(409).json({
        error: { code: 'DEVICE_LIMIT', message: 'Se alcanzó el límite de dispositivos registrados.' },
      })
      return
    }
    res.status(201).json({ dispositivo: resultado.dispositivo })
  } catch (error) { next(error) }
})

// DELETE /api/v1/notificaciones/push/suscripciones/:id
pushSubscriptionsRouter.delete('/suscripciones/:id', requireAjax, async (req, res, next) => {
  try {
    const valor = req.params.id
    const id = Number(valor)
    if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor) ||
      !Number.isSafeInteger(id) || id > 2147483647) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Identificador de dispositivo inválido.' },
      })
      return
    }
    const resultado = await eliminarSuscripcionPush(req.session.userId!, id)
    if (resultado.count === 0) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Dispositivo no encontrado.' },
      })
      return
    }
    res.json({ eliminado: true })
  } catch (error) { next(error) }
})
