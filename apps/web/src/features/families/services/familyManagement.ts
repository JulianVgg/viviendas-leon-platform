import type { CommunityOption } from '../types/family'
import type { FamilyMemberInput, FamilyMemberRecord, FamilyMemberUpdateInput, FamilyUpdateInput, IntegralFamilyRecord } from '../types/familyIntegral'
import { memberRelationshipOptions, memberSexOptions } from './familyWizard.ts'

export type FamilyEditDraft = { nombreReferencia: string; comunidadId: string; fechaIngreso: string; observaciones: string }
export type FamilyEditErrors = Partial<Record<keyof FamilyEditDraft, string>>
export type MemberEditDraft = { nombreCompleto: string; fechaNacimiento: string; sexo: string; parentesco: string; telefono: string; observaciones: string }
export type MemberEditErrors = Partial<Record<keyof MemberEditDraft, string>>

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function familyDraftFrom(family: IntegralFamilyRecord): FamilyEditDraft {
  return { nombreReferencia: family.nombreReferencia, comunidadId: String(family.comunidad.id), fechaIngreso: family.fechaIngreso?.slice(0, 10) ?? '', observaciones: family.observaciones ?? '' }
}

export function validateFamilyDraft(draft: FamilyEditDraft, communities: CommunityOption[]) {
  const errors: FamilyEditErrors = {}
  const name = draft.nombreReferencia.trim()
  if (!name || name.length > 150) errors.nombreReferencia = 'El nombre es obligatorio y admite hasta 150 caracteres.'
  if (!communities.some(({ id }) => id === Number(draft.comunidadId))) errors.comunidadId = 'Selecciona una comunidad activa.'
  if (draft.fechaIngreso && !validDate(draft.fechaIngreso)) errors.fechaIngreso = 'Introduce una fecha válida.'
  if (draft.observaciones.trim().length > 2000) errors.observaciones = 'Las observaciones admiten hasta 2000 caracteres.'
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
  if (!draft.nombreCompleto.trim() || draft.nombreCompleto.trim().length > 150) errors.nombreCompleto = 'El nombre es obligatorio y admite hasta 150 caracteres.'
  if (isNew && !draft.fechaNacimiento) errors.fechaNacimiento = 'La fecha de nacimiento es obligatoria.'
  if (draft.fechaNacimiento && !validDate(draft.fechaNacimiento)) errors.fechaNacimiento = 'Introduce una fecha válida.'
  if (isNew && !memberSexOptions.includes(draft.sexo)) errors.sexo = 'Selecciona el sexo.'
  if (draft.sexo && !memberSexOptions.includes(draft.sexo)) errors.sexo = 'Selecciona una opción válida.'
  if (isNew && !memberRelationshipOptions.includes(draft.parentesco)) errors.parentesco = 'Selecciona el parentesco.'
  if (draft.parentesco && !memberRelationshipOptions.includes(draft.parentesco)) errors.parentesco = 'Selecciona una opción válida.'
  if (draft.telefono.trim().length > 30) errors.telefono = 'El teléfono admite hasta 30 caracteres.'
  if (draft.observaciones.trim().length > 2000) errors.observaciones = 'Las observaciones admiten hasta 2000 caracteres.'
  return errors
}

export function buildMemberCreate(draft: MemberEditDraft): FamilyMemberInput {
  return { nombreCompleto: draft.nombreCompleto.trim(), fechaNacimiento: draft.fechaNacimiento, sexo: draft.sexo, parentesco: draft.parentesco, telefono: draft.telefono.trim() || null, observaciones: draft.observaciones.trim() || null }
}

export function buildMemberUpdate(member: FamilyMemberRecord, draft: MemberEditDraft, initial: MemberEditDraft): FamilyMemberUpdateInput {
  const changes = Object.fromEntries(Object.entries(draft).filter(([key, value]) => value !== initial[key as keyof MemberEditDraft]).map(([key, value]) => [key, value || null]))
  return { version: member.version, ...changes }
}
