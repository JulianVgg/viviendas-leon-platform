import { Router } from 'express'
import { createIntegralFamily, findIntegralFamily, IntegralFamilyValidationError, listFamilyProgramOptions } from './families-integral.service.js'
import { validateIntegralFamilyInput } from './families-integral.validation.js'
import { parseFamilyId } from './families.validation.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requireFamilyWrite } from './families.authorization.js'

export const integralFamiliesRouter = Router()

integralFamiliesRouter.post('/registro-integral', requireAuth, requireFamilyWrite, async (req, res) => {
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

integralFamiliesRouter.get('/opciones/programas', requireAuth, async (_req, res) => {
  try {
    return res.json({ data: await listFamilyProgramOptions() })
  } catch (error) {
    console.error('Failed to list family program options:', error)
    return res.status(500).json({ error: { code: 'FAMILY_PROGRAM_OPTIONS_ERROR', message: 'No fue posible consultar los programas.' } })
  }
})

integralFamiliesRouter.get('/:id/expediente', requireAuth, async (req, res) => {
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
