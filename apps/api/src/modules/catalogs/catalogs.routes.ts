import { Router } from 'express'
import { getPrismaClient } from '../../config/prisma.js'

export const communitiesRouter = Router()

communitiesRouter.get('/', async (_req, res) => {
  try {
    const communities = await getPrismaClient().comunidad.findMany({
      where: { activo: true, municipio: { activo: true } },
      orderBy: [{ municipio: { nombre: 'asc' } }, { nombre: 'asc' }, { id: 'asc' }],
      select: { id: true, nombre: true, municipio: { select: { id: true, nombre: true } } },
    })
    return res.json({ data: communities })
  } catch (error) {
    console.error('Failed to list communities:', error)
    return res.status(500).json({ error: { code: 'COMMUNITY_LIST_ERROR', message: 'No fue posible consultar las comunidades.' } })
  }
})
