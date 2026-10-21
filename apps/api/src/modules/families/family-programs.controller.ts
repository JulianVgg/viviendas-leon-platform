import type { Request, Response } from 'express'
import { parseFamilyId } from './families.validation.js'
import { createFamilyParticipation, FamilyProgramError, isDuplicateFamilyParticipation, updateFamilyParticipation } from './family-programs.service.js'
import { validParticipationIdempotencyKey, validateParticipationCreate, validateParticipationUpdate } from './family-programs.validation.js'

function invalidId(res: Response, field: string) {
  res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El identificador no es válido.', details: [{ field, message: 'El identificador debe ser un entero positivo.' }] } })
}
function fail(res: Response, error: unknown) {
  if (error instanceof FamilyProgramError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } })
    return
  }
  if (isDuplicateFamilyParticipation(error)) {
    res.status(409).json({ error: { code: 'DUPLICATE_PARTICIPATION', message: 'La familia ya está asociada a este programa.' } })
    return
  }
  console.error('Error administrando participación de programa:', error)
  res.status(500).json({ error: { code: 'FAMILY_PROGRAM_ERROR', message: 'No fue posible guardar la participación.' } })
}

export async function postFamilyProgram(req: Request, res: Response) {
  const familyId = parseFamilyId(req.params.id)
  if (familyId === null) return invalidId(res, 'id')
  const key = req.get('Idempotency-Key')
  if (!validParticipationIdempotencyKey(key)) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Envía Idempotency-Key con un UUID v4 válido.' } })
    return
  }
  const validation = validateParticipationCreate(req.body)
  if (!validation.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos de participación.', details: validation.details } })
    return
  }
  try {
    const result = await createFamilyParticipation(familyId, validation.data, req.session.userId!, key)
    if (result.replayed) res.setHeader('Idempotency-Replayed', 'true')
    res.status(result.replayed ? 200 : 201).json({ data: result.participation })
  } catch (error) { fail(res, error) }
}

export async function patchFamilyProgram(req: Request, res: Response) {
  const familyId = parseFamilyId(req.params.id)
  const participationId = parseFamilyId(req.params.participacionId)
  if (familyId === null) return invalidId(res, 'id')
  if (participationId === null) return invalidId(res, 'participacionId')
  const validation = validateParticipationUpdate(req.body)
  if (!validation.data) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos de participación.', details: validation.details } })
    return
  }
  try {
    res.json({ data: await updateFamilyParticipation(familyId, participationId, validation.data, req.session.userId!) })
  } catch (error) { fail(res, error) }
}
