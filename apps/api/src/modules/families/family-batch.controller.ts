import type { Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import { parseFamilyId } from './families.validation.js'
import { FamilyManagementError } from './families-management.service.js'
import { saveFamilyBatch } from './family-batch.service.js'
import { validateBatchFamilyUpdate } from './family-batch.validation.js'
import { validIdempotencyKey } from './families-management.validation.js'

export async function patchFamilyBatch(req: Request, res: Response) {
  const id = parseFamilyId(req.params.id)
  if (!id) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Familia no válida.' } })
  const key = req.get('Idempotency-Key') ?? randomUUID()
  if (!validIdempotencyKey(key)) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Clave de solicitud no válida.' } })
  const valid = validateBatchFamilyUpdate(req.body)
  if (!valid.data) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos.', details: valid.details } })
  try {
    const record = await saveFamilyBatch(id, valid.data, req.session.userId!, key)
    res.setHeader('Cache-Control', 'private, no-store')
    return res.json({ data: record })
  } catch (error) {
    if (error instanceof FamilyManagementError) return res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } })
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') return res.status(409).json({ error: { code: 'DUPLICATE_PARTICIPATION', message: 'El programa ya está asociado a esta familia.' } })
    console.error('Error guardando expediente familiar:', error)
    return res.status(500).json({ error: { code: 'FAMILY_BATCH_ERROR', message: 'No se pudo guardar el expediente. Consulta los registros de la API.' } })
  }
}
