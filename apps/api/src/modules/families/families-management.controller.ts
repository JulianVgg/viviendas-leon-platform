import type { Request, Response } from 'express'
import { parseFamilyId } from './families.validation.js'
import { validIdempotencyKey, validateFamilyUpdate, validateMemberCreate, validateMemberState, validateMemberUpdate } from './families-management.validation.js'
import { createFamilyMember, FamilyManagementError, updateFamily, updateFamilyMember, updateFamilyMemberState } from './families-management.service.js'

function invalidId(res: Response, field = 'id') {
  return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El identificador no es válido.', details: [{ field, message: 'El identificador debe ser un entero positivo válido.' }] } })
}

function validationError(res: Response, details: Array<{ field: string; message: string }>) {
  return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos enviados.', details } })
}

function managementError(res: Response, error: unknown, operation: string) {
  if (error instanceof FamilyManagementError) return res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } })
  console.error(`Failed to ${operation}:`, error)
  return res.status(500).json({ error: { code: 'FAMILY_MANAGEMENT_ERROR', message: 'No fue posible completar la operación.' } })
}

export async function patchFamily(req: Request, res: Response) {
  const id = parseFamilyId(req.params.id)
  if (id === null) return invalidId(res)
  const result = validateFamilyUpdate(req.body)
  if (!result.data) return validationError(res, result.details)
  try {
    const family = await updateFamily(id, result.data, req.session.userId!)
    return res.json({ data: family })
  } catch (error) { return managementError(res, error, 'update family') }
}

export async function postFamilyMember(req: Request, res: Response) {
  const id = parseFamilyId(req.params.id)
  if (id === null) return invalidId(res)
  const key = req.get('Idempotency-Key')
  if (!validIdempotencyKey(key)) return validationError(res, [{ field: 'Idempotency-Key', message: 'Envía una clave UUID v4 válida.' }])
  const result = validateMemberCreate(req.body)
  if (!result.data) return validationError(res, result.details)
  try {
    const created = await createFamilyMember(id, result.data, req.session.userId!, key)
    if (created.replayed) res.setHeader('Idempotency-Replayed', 'true')
    return res.status(created.replayed ? 200 : 201).json({ data: created.member })
  } catch (error) { return managementError(res, error, 'create family member') }
}

export async function patchFamilyMember(req: Request, res: Response) {
  const id = parseFamilyId(req.params.id)
  const memberId = parseFamilyId(req.params.integranteId)
  if (id === null) return invalidId(res)
  if (memberId === null) return invalidId(res, 'integranteId')
  const result = validateMemberUpdate(req.body)
  if (!result.data) return validationError(res, result.details)
  try { return res.json({ data: await updateFamilyMember(id, memberId, result.data, req.session.userId!) }) }
  catch (error) { return managementError(res, error, 'update family member') }
}

export async function patchFamilyMemberState(req: Request, res: Response) {
  const id = parseFamilyId(req.params.id)
  const memberId = parseFamilyId(req.params.integranteId)
  if (id === null) return invalidId(res)
  if (memberId === null) return invalidId(res, 'integranteId')
  const result = validateMemberState(req.body)
  if (!result.data) return validationError(res, result.details)
  try { return res.json({ data: await updateFamilyMemberState(id, memberId, result.data, req.session.userId!) }) }
  catch (error) { return managementError(res, error, 'change family member state') }
}
