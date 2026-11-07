import type { Request, Response, NextFunction } from 'express'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { esDireccionGeneral } from '../auth/require-permission.middleware.js'

// El técnico que puede registrar producción necesita consultar únicamente los
// catálogos y cosechas para seleccionar cantidades en visitas.
export async function requireProductionRead(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.session.userId) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sesión requerida.' } }); return }
    const user = await getAuthenticatedUser(req.session.userId)
    if (!user) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sesión no válida.' } }); return }
    if (!esDireccionGeneral(user.roles) &&
      !user.permisos.some(p => p === 'PANTALLA_PRODUCCION' || p === 'PRODUCCION_WRITE')) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Sin acceso a cosechas y ventas.' } }); return
    }
    next()
  } catch (cause) { next(cause) }
}
