import type { Request, Response, NextFunction } from 'express'
import { getAuthenticatedUser } from './auth.service.js'

// Comprueba exclusivamente el rol ACTIVO y REAL de la sesión, no el selector
// de rol simulado. El rol institucional existente en PostgreSQL se llama
// «Dirección general» (confirmado en la consulta de roles del proyecto).
function esDireccionGeneral(rol: string): boolean {
  return rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'direccion general'
}

export async function requireDirectora(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.session.userId
    if (!id) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Debes iniciar sesión.' } })
      return
    }
    const usuario = await getAuthenticatedUser(id)
    if (!usuario) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Tu sesión no es válida.' } })
      return
    }
    if (!usuario.roles.some(esDireccionGeneral)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Solo Dirección general puede administrar usuarios, roles y permisos.' } })
      return
    }
    next()
  } catch (error) {
    next(error)
  }
}
