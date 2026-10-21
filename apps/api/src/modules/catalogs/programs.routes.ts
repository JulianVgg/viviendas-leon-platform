import { Router, type NextFunction, type Response } from 'express'
import { Prisma } from '../../generated/prisma/client.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { createProgram, listAvailablePrograms, listProgramsForAdmin, ProgramError, updateProgram } from './programs.service.js'
import { parseProgramId, validateProgramInput } from './programs.validation.js'

export const programsRouter = Router()

function handleError(error: unknown, res: Response, next: NextFunction) {
  if (error instanceof ProgramError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } })
    return
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    res.status(409).json({ error: { code: 'DUPLICATE_PROGRAM', message: 'Ya existe un programa con ese nombre.' } })
    return
  }
  next(error)
}

// Consumible por otros módulos. Conserva el endpoint anterior de opciones en /familias.
programsRouter.get('/disponibles', requireAuth, async (_req, res, next) => {
  try { res.json({ data: await listAvailablePrograms() }) }
  catch (error) { next(error) }
})

programsRouter.get('/', requireAuth, requirePermission('PANTALLA_PROGRAMAS'), async (_req, res, next) => {
  try { res.json({ data: await listProgramsForAdmin() }) }
  catch (error) { next(error) }
})

programsRouter.post('/', requireAuth, requirePermission('PROGRAMAS_WRITE'), async (req, res, next) => {
  const result = validateProgramInput(req.body)
  if (!result.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos del programa.', details: result.details } })
    return
  }
  try { res.status(201).json({ data: await createProgram(result.data, req.session.userId!) }) }
  catch (error) { handleError(error, res, next) }
})

programsRouter.patch('/:id', requireAuth, requirePermission('PROGRAMAS_WRITE'), async (req, res, next) => {
  const id = parseProgramId(req.params.id)
  if (!id) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El identificador no es válido.' } })
    return
  }
  const result = validateProgramInput(req.body)
  if (!result.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos del programa.', details: result.details } })
    return
  }
  try { res.json({ data: await updateProgram(id, result.data, req.session.userId!) }) }
  catch (error) { handleError(error, res, next) }
})
