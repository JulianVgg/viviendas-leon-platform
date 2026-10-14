import { Router } from 'express'
import type { RequestHandler } from 'express'
import { createIntegralFamily, findIntegralFamily, IntegralFamilyValidationError, listFamilyProgramOptions } from './families-integral.service.js'
import { validateIntegralFamilyInput } from './families-integral.validation.js'
import { parseFamilyId } from './families.validation.js'

export const integralFamiliesRouter = Router()

// Fail closed, even when the flag is accidentally enabled in production.
const requireIntegralEnvironment: RequestHandler = (_req, res, next) => {
  if (!['development', 'qa'].includes(process.env.NODE_ENV ?? '') || process.env.ENABLE_FAMILY_INTEGRAL_API !== 'true') {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'La ruta solicitada no está disponible.' } })
  }
  next()
}

integralFamiliesRouter.post('/registro-integral', requireIntegralEnvironment, async (req, res) => {
  const result = validateIntegralFamilyInput(req.body)
  if (!result.data) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos del expediente.', details: result.details } })
  try {
    const record = await createIntegralFamily(result.data)
    return res.status(201).location(`/api/v1/familias/${record.id}/expediente`).json({ data: record })
  } catch (error) {
    if (error instanceof IntegralFamilyValidationError) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message, details: error.details } })
    console.error('Failed to create integral family:', error)
    return res.status(500).json({ error: { code: 'FAMILY_INTEGRAL_CREATE_ERROR', message: 'No fue posible guardar el expediente.' } })
  }
})

integralFamiliesRouter.get('/opciones/programas', requireIntegralEnvironment, async (_req, res) => {
  try {
    return res.json({ data: await listFamilyProgramOptions() })
  } catch (error) {
    console.error('Failed to list family program options:', error)
    return res.status(500).json({ error: { code: 'FAMILY_PROGRAM_OPTIONS_ERROR', message: 'No fue posible consultar los programas.' } })
  }
})

integralFamiliesRouter.get('/:id/expediente', requireIntegralEnvironment, async (req, res) => {
  const id = parseFamilyId(req.params.id)
  if (id === null) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El identificador no es válido.', details: [{ field: 'id', message: 'El identificador debe ser un entero positivo válido.' }] } })
  try {
    const record = await findIntegralFamily(id)
    if (!record) return res.status(404).json({ error: { code: 'FAMILY_NOT_FOUND', message: 'La familia solicitada no existe.' } })
    return res.json({ data: record })
  } catch (error) {
    console.error('Failed to get integral family:', error)
    return res.status(500).json({ error: { code: 'FAMILY_INTEGRAL_DETAIL_ERROR', message: 'No fue posible consultar el expediente.' } })
  }
})
