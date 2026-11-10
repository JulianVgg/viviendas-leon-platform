import { Router } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { officialCommunityFilter } from './official-communities.js'

export const communitiesRouter = Router()

communitiesRouter.get('/', async (_req, res) => {
  try {
    const communities = await getPrismaClient().comunidad.findMany({
      where: { activo: true, ...officialCommunityFilter },
      orderBy: [{ municipio: { nombre: 'asc' } }, { nombre: 'asc' }, { id: 'asc' }],
      select: { id: true, nombre: true, municipio: { select: { id: true, nombre: true } } },
    })
    return res.json({ data: communities })
  } catch (error) {
    console.error('Failed to list communities:', error)
    return res.status(500).json({ error: { code: 'COMMUNITY_LIST_ERROR', message: 'No fue posible consultar las comunidades.' } })
  }
})
