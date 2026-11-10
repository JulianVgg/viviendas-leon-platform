import type { CommunityOption } from '../types/family'
import type { FamilyMemberInput, FamilyMemberRecord, FamilyMemberUpdateInput, FamilyUpdateInput, IntegralFamilyRecord } from '../types/familyIntegral'
import { memberRelationshipOptions, memberSexOptions, validDate } from './familyWizard.ts'
import { MAX_FAMILY_NAME, MAX_MEMBER_NAME, MAX_NOTES, validName, validOtherRole, validPhone } from './familyFieldRules.ts'

export type FamilyEditDraft = { nombreReferencia: string; comunidadId: string; fechaIngreso: string; observaciones: string }
export type FamilyEditErrors = Partial<Record<keyof FamilyEditDraft, string>>
export type MemberEditDraft = { nombreCompleto: string; fechaNacimiento: string; sexo: string; parentesco: string; telefono: string; observaciones: string }
export type MemberEditErrors = Partial<Record<keyof MemberEditDraft, string>>

export function familyDraftFrom(family: IntegralFamilyRecord): FamilyEditDraft {
  return { nombreReferencia: family.nombreReferencia, comunidadId: String(family.comunidad.id), fechaIngreso: family.fechaIngreso?.slice(0, 10) ?? '', observaciones: family.observaciones ?? '' }
}

export function validateFamilyDraft(draft: FamilyEditDraft, communities: CommunityOption[]) {
  const errors: FamilyEditErrors = {}
  const name = draft.nombreReferencia.trim()
  if (!validName(name, MAX_FAMILY_NAME)) errors.nombreReferencia = 'Escribe un nombre válido de hasta 150 caracteres, sin números.'
  if (!communities.some(({ id }) => id === Number(draft.comunidadId))) errors.comunidadId = 'Selecciona una comunidad activa.'
  if (draft.fechaIngreso && !validDate(draft.fechaIngreso)) errors.fechaIngreso = 'Introduce una fecha válida.'
  if (draft.observaciones.trim().length > MAX_NOTES) errors.observaciones = 'Las observaciones admiten hasta 2000 caracteres.'
  return errors
}

export function buildFamilyUpdate(family: IntegralFamilyRecord, draft: FamilyEditDraft, initial: FamilyEditDraft): FamilyUpdateInput {
  return {
    version: family.version,
    ...(draft.nombreReferencia !== initial.nombreReferencia && { nombreReferencia: draft.nombreReferencia.trim() }),
    ...(draft.comunidadId !== initial.comunidadId && { comunidadId: Number(draft.comunidadId) }),
    ...(draft.fechaIngreso !== initial.fechaIngreso && { fechaIngreso: draft.fechaIngreso || null }),
    ...(draft.observaciones !== initial.observaciones && { observaciones: draft.observaciones.trim() || null }),
  }
}

export function memberDraftFrom(member?: FamilyMemberRecord): MemberEditDraft {
  return member ? { nombreCompleto: member.nombreCompleto, fechaNacimiento: member.fechaNacimiento?.slice(0, 10) ?? '', sexo: member.sexo ?? '', parentesco: member.parentesco ?? '', telefono: member.telefono ?? '', observaciones: member.observaciones ?? '' } : { nombreCompleto: '', fechaNacimiento: '', sexo: '', parentesco: '', telefono: '', observaciones: '' }
}

export function validateMemberDraft(draft: MemberEditDraft, isNew: boolean) {
  const errors: MemberEditErrors = {}
  if (!validName(draft.nombreCompleto, MAX_MEMBER_NAME)) errors.nombreCompleto = 'Escribe un nombre válido de hasta 150 caracteres, sin números.'
  if (isNew && !draft.fechaNacimiento) errors.fechaNacimiento = 'La fecha de nacimiento es obligatoria.'
  if (draft.fechaNacimiento && !validDate(draft.fechaNacimiento)) errors.fechaNacimiento = 'Introduce una fecha válida.'
  if (draft.fechaNacimiento && validDate(draft.fechaNacimiento) && draft.fechaNacimiento > new Date().toISOString().slice(0, 10)) errors.fechaNacimiento = 'La fecha de nacimiento no puede ser futura.'
  if (isNew && !memberSexOptions.includes(draft.sexo)) errors.sexo = 'Selecciona el sexo.'
  if (draft.sexo && !memberSexOptions.includes(draft.sexo)) errors.sexo = 'Selecciona una opción válida.'
  if (isNew && !draft.parentesco.trim()) errors.parentesco = 'Selecciona un rol.'
  if (draft.parentesco === 'Otro' || (draft.parentesco && !memberRelationshipOptions.includes(draft.parentesco) && !validOtherRole(draft.parentesco))) errors.parentesco = 'Especifica un rol válido de hasta 60 caracteres.'
  if (!validPhone(draft.telefono)) errors.telefono = 'Usa un teléfono válido (mínimo 8 dígitos).'
  if (draft.observaciones.trim().length > MAX_NOTES) errors.observaciones = 'Las observaciones admiten hasta 2000 caracteres.'
  return errors
}

export function buildMemberCreate(draft: MemberEditDraft): FamilyMemberInput {
  return { nombreCompleto: draft.nombreCompleto.trim(), fechaNacimiento: draft.fechaNacimiento, sexo: draft.sexo, parentesco: draft.parentesco, telefono: draft.telefono.trim() || null, observaciones: draft.observaciones.trim() || null }
}

export function buildMemberUpdate(member: FamilyMemberRecord, draft: MemberEditDraft, initial: MemberEditDraft): FamilyMemberUpdateInput {
  const changes = Object.fromEntries(Object.entries(draft).filter(([key, value]) => value !== initial[key as keyof MemberEditDraft]).map(([key, value]) => [key, value || null]))
  return { version: member.version, ...changes }
}
