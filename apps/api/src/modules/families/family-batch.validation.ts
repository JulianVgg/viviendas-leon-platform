import { validateFamilyUpdate } from './families-management.validation.js'
import { validateParticipationCreate, validateParticipationUpdate } from './family-programs.validation.js'
import type { ValidationDetail } from './families.types.js'
import type { ParticipationCreateInput, ParticipationUpdateInput } from './family-programs.validation.js'

export const FAMILY_STATUSES = ['ACTIVA', 'PENDIENTE_VALIDACION', 'RETIRADA', 'EGRESADA'] as const
export type FamilyStatus = typeof FAMILY_STATUSES[number]
export type BatchProgramChange =
  | { action: 'create'; input: ParticipationCreateInput }
  | { action: 'update'; id: number; input: ParticipationUpdateInput }
export type BatchFamilyInput = {
  version: string
  changes: Omit<NonNullable<ReturnType<typeof validateFamilyUpdate>['data']>, 'version'> & { estado?: FamilyStatus }
  programs: BatchProgramChange[]
}

export function validateBatchFamilyUpdate(body: unknown): { data?: BatchFamilyInput; details: ValidationDetail[] } {
  const details: ValidationDetail[] = []
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { details: [{ field: 'body', message: 'Solicitud no válida.' }] }
  const input = body as Record<string, unknown>
  for (const field of Object.keys(input)) if (!['version', 'changes', 'programs'].includes(field)) details.push({ field, message: 'Campo no permitido.' })
  const changes = input.changes && typeof input.changes === 'object' && !Array.isArray(input.changes) ? input.changes as Record<string, unknown> : null
  if (!changes) details.push({ field: 'changes', message: 'Los cambios de la familia no son válidos.' })
  const { estado, ...familyFields } = changes ?? {}
  const familyValidation = validateFamilyUpdate({ ...familyFields, version: input.version }, true)
  // El validador general requiere por lo menos un campo, pero aquí también puede cambiar solo un programa.
  details.push(...familyValidation.details.filter(({ field, message }) => !(field === 'body' && message.includes('al menos un campo'))))
  if (estado !== undefined && !(FAMILY_STATUSES as readonly string[]).includes(estado as string)) details.push({ field: 'estado', message: 'Selecciona un estado válido.' })
  if (!Array.isArray(input.programs) || input.programs.length > 20) details.push({ field: 'programs', message: 'Se admiten como máximo 20 modificaciones de programas.' })
  const programs: BatchProgramChange[] = []
  const uniqueIds = new Set<number>()
  const uniquePrograms = new Set<number>()
  if (Array.isArray(input.programs) && input.programs.length <= 20) input.programs.forEach((entry, index) => {
    const prefix = `programs[${index}]`
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { details.push({ field: prefix, message: 'Programa no válido.' }); return }
    const row = entry as Record<string, unknown>
    if (row.action === 'create') {
      for (const field of Object.keys(row)) if (!['action', 'input'].includes(field)) details.push({ field: `${prefix}.${field}`, message: 'Campo no permitido.' })
      const result = validateParticipationCreate(row.input)
      details.push(...result.details.map(({ field, message }) => ({ field: `${prefix}.${field}`, message })))
      if (result.data) {
        if (uniquePrograms.has(result.data.programaId)) details.push({ field: prefix, message: 'Programa repetido.' })
        uniquePrograms.add(result.data.programaId)
        programs.push({ action: 'create', input: result.data })
      }
    } else if (row.action === 'update') {
      for (const field of Object.keys(row)) if (!['action', 'id', 'input'].includes(field)) details.push({ field: `${prefix}.${field}`, message: 'Campo no permitido.' })
      const id = row.id
      if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0 || id > 2147483647 || uniqueIds.has(id)) details.push({ field: `${prefix}.id`, message: 'Identificador no válido o repetido.' })
      else uniqueIds.add(id)
      const result = validateParticipationUpdate(row.input)
      details.push(...result.details.map(({ field, message }) => ({ field: `${prefix}.${field}`, message })))
      if (result.data && typeof id === 'number') programs.push({ action: 'update', id, input: result.data })
    } else details.push({ field: `${prefix}.action`, message: 'Operación no válida.' })
  })
  if (Object.keys(familyFields).length === 0 && estado === undefined && programs.length === 0) details.push({ field: 'body', message: 'No hay cambios para guardar.' })
  if (details.length || !familyValidation.data) return { details }
  const { version: _version, ...familyChanges } = familyValidation.data
  return { data: { version: _version, changes: { ...familyChanges, ...(estado !== undefined ? { estado: estado as FamilyStatus } : {}) }, programs }, details }
}
