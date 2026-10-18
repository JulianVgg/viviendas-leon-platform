import type { RequestHandler } from 'express'
import { getAuthenticatedUser, type AuthenticatedUser } from '../auth/auth.service.js'
import { esDireccionGeneral } from '../auth/require-permission.middleware.js'

export const FAMILY_WRITE_PERMISSION = 'FAMILIAS_WRITE'

export function createFamilyPermissionGuard(
  codes: readonly string[],
  message: string,
  getUser: (id: number) => Promise<AuthenticatedUser | null> = getAuthenticatedUser,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = await getUser(req.session.userId!)
      if (!user || (!esDireccionGeneral(user.roles) && !codes.some((code) => user.permisos.includes(code)))) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message } })
      }
      next()
    } catch (error) { next(error) }
  }
}

// There is no persisted assignment/scope model for field staff. Deny by
// default instead of inferring authorization from RoleContext or role names.
export const requireFamilyWrite = createFamilyPermissionGuard([FAMILY_WRITE_PERMISSION], 'No tienes permiso para modificar familias e integrantes.')
