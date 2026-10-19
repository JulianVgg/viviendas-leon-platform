import { Router } from 'express'
import { Prisma } from '../../generated/prisma/client.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { createCommunity, updateCommunity, changeCommunityState, listCommunitiesForAdmin, CommunityError } from './communities.service.js'
import { parseCommunityId, validateCommunityInput, validateCommunityState } from './communities.validation.js'

export const adminCommunitiesRouter = Router()

function handleError(error: unknown, res: import('express').Response, next: import('express').NextFunction) {
  if (error instanceof CommunityError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } })
    return
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    res.status(409).json({ error: { code: 'DUPLICATE_COMMUNITY', message: 'La comunidad ya existe en el municipio.' } })
    return
  }
  next(error)
}

function requestId(raw: unknown): number | null {
  return parseCommunityId(raw)
}

adminCommunitiesRouter.get('/administracion', requireAuth, requirePermission('PANTALLA_COMUNIDADES'), async (_req, res, next) => {
  try {
    res.json({ data: await listCommunitiesForAdmin() })
  } catch (error) { next(error) }
})

adminCommunitiesRouter.post('/', requireAuth, requirePermission('COMUNIDADES_WRITE'), async (req, res, next) => {
  const validation = validateCommunityInput(req.body)
  if (!validation.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos de la comunidad.', details: validation.details } })
    return
  }
  try {
    const created = await createCommunity(validation.data, req.session.userId!)
    res.status(201).location(`/api/v1/comunidades/administracion`).json({ data: created })
  } catch (error) { handleError(error, res, next) }
})

adminCommunitiesRouter.patch('/:id/estado', requireAuth, requirePermission('COMUNIDADES_WRITE'), async (req, res, next) => {
  const id = requestId(req.params.id)
  if (!id) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El identificador no es válido.' } })
    return
  }
  const validation = validateCommunityState(req.body)
  if (!validation.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa el estado de la comunidad.', details: validation.details } })
    return
  }
  try {
    res.json({ data: await changeCommunityState(id, validation.data.activo, req.session.userId!) })
  } catch (error) { handleError(error, res, next) }
})

adminCommunitiesRouter.patch('/:id', requireAuth, requirePermission('COMUNIDADES_WRITE'), async (req, res, next) => {
  const id = requestId(req.params.id)
  if (!id) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El identificador no es válido.' } })
    return
  }
  const validation = validateCommunityInput(req.body)
  if (!validation.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos de la comunidad.', details: validation.details } })
    return
  }
  try {
    res.json({ data: await updateCommunity(id, validation.data, req.session.userId!) })
  } catch (error) { handleError(error, res, next) }
})
