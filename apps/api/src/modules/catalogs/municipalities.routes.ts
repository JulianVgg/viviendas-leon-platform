import { Router } from 'express'
import { Prisma } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { MunicipalityError, listMunicipalitiesForAdmin, createMunicipality, updateMunicipality, changeMunicipalityState } from './municipalities.service.js'
import { parseMunicipalityId, validateMunicipalityInput, validateMunicipalityState } from './municipalities.validation.js'

export const municipalitiesRouter = Router()

function handleError(error: unknown, res: import('express').Response, next: import('express').NextFunction) {
  if (error instanceof MunicipalityError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } })
    return
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    res.status(409).json({ error: { code: 'DUPLICATE_MUNICIPALITY', message: 'El municipio ya existe.' } })
    return
  }
  next(error)
}

// Conserva la consulta original de municipios activos que consume FAM-06.
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

municipalitiesRouter.get('/administracion', requireAuth, requirePermission('PANTALLA_MUNICIPIOS'), async (_req, res, next) => {
  try { res.json({ data: await listMunicipalitiesForAdmin() }) }
  catch (error) { next(error) }
})

municipalitiesRouter.post('/', requireAuth, requirePermission('MUNICIPIOS_WRITE'), async (req, res, next) => {
  const validation = validateMunicipalityInput(req.body)
  if (!validation.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos del municipio.', details: validation.details } })
    return
  }
  try {
    const created = await createMunicipality(validation.data, req.session.userId!)
    res.status(201).json({ data: created })
  } catch (error) { handleError(error, res, next) }
})

municipalitiesRouter.patch('/:id/estado', requireAuth, requirePermission('MUNICIPIOS_WRITE'), async (req, res, next) => {
  const id = parseMunicipalityId(req.params.id)
  if (!id) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El identificador no es válido.' } })
    return
  }
  const validation = validateMunicipalityState(req.body)
  if (!validation.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa el estado del municipio.', details: validation.details } })
    return
  }
  try { res.json({ data: await changeMunicipalityState(id, validation.data.activo, req.session.userId!) }) }
  catch (error) { handleError(error, res, next) }
})

municipalitiesRouter.patch('/:id', requireAuth, requirePermission('MUNICIPIOS_WRITE'), async (req, res, next) => {
  const id = parseMunicipalityId(req.params.id)
  if (!id) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El identificador no es válido.' } })
    return
  }
  const validation = validateMunicipalityInput(req.body)
  if (!validation.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos del municipio.', details: validation.details } })
    return
  }
  try { res.json({ data: await updateMunicipality(id, validation.data, req.session.userId!) }) }
  catch (error) { handleError(error, res, next) }
})
