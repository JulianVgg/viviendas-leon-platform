import { Router } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../auth/require-permission.middleware.js'

export const municipalitiesRouter = Router()
municipalitiesRouter.get('/', requireAuth, requirePermission('PANTALLA_COMUNIDADES'), async (_req, res, next) => {
  try {
    const records = await getPrismaClient().municipio.findMany({
      where: { activo: true },
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
      select: { id: true, nombre: true },
    })
    res.json({ data: records })
  } catch (error) { next(error) }
})
