import type { CommunityOption } from '../types/family'
import type { FamilyProgramOption, FamilyWizardInput, IntegralFamilyInput, MemberDraft, ProgramDraft, WizardErrors } from '../types/familyIntegral'

export const memberSexOptions: readonly string[] = ['Masculino', 'Femenino']
export const memberRelationshipOptions: readonly string[] = ['Padre', 'Madre', 'Hijo', 'Hija', 'Abuela', 'Abuelo', 'Cuñado', 'Cuñada']

export const createMemberDraft = (localId: string): MemberDraft => ({ localId, nombreCompleto: '', fechaNacimiento: '', sexo: '', parentesco: '', telefono: '', observaciones: '' })
export const createProgramDraft = (localId: string): ProgramDraft => ({ localId, programaId: '', fechaIngreso: '', fechaSalida: '', observaciones: '' })

// Stable keys also identify errors, independent of a row's current array index.
export const memberField = (id: string, field: string) => `integrantes.${id}.${field}`
export const programField = (id: string, field: string) => `programas.${id}.${field}`

export function stepForField(field: string): number {
  if (field.startsWith('integrantes')) return 1
  if (field.startsWith('programas')) return 2
  return 0
}

export function mapServerErrors(details: Array<{ field: string; message: string }>, submitted: FamilyWizardInput): WizardErrors {
  return Object.fromEntries(details.map(({ field, message }) => {
    const match = /^(integrantes|programas)\[(\d+)\](?:\.(.+))?$/.exec(field)
    if (!match) return [field, message]
    const row = submitted[match[1] as 'integrantes' | 'programas'][Number(match[2])]
    return [row ? `${match[1]}.${row.localId}${match[3] ? `.${match[3]}` : ''}` : match[1], message]
  }))
}

export function validDate(value: string): boolean {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validateWizardStep(step: number, draft: FamilyWizardInput, communities: CommunityOption[], options: FamilyProgramOption[]): WizardErrors {
  const errors: WizardErrors = {}
  const checkDate = (field: string, value: string) => {
    if (!validDate(value)) errors[field] = 'Introduce una fecha existente en formato YYYY-MM-DD.'
  }
  if (step === 0) {
    if (!draft.nombreReferencia.trim() || draft.nombreReferencia.trim().length > 150) errors.nombreReferencia = 'Introduce un nombre de hasta 150 caracteres.'
    if (!communities.some(({ id }) => id === Number(draft.comunidadId))) errors.comunidadId = 'Selecciona una comunidad disponible.'
    checkDate('fechaIngreso', draft.fechaIngreso)
    if (!draft.fechaIngreso) errors.fechaIngreso = 'La fecha de ingreso es obligatoria.'
    if (draft.observaciones.trim().length > 2000) errors.observaciones = 'Las observaciones admiten hasta 2000 caracteres.'
  }
  if (step === 1) {
    if (!draft.integrantes.length) errors.integrantes = 'Agrega al menos un integrante.'
    draft.integrantes.forEach((row) => {
      if (!row.nombreCompleto.trim()) errors[memberField(row.localId, 'nombreCompleto')] = 'El nombre completo es obligatorio.'
      checkDate(memberField(row.localId, 'fechaNacimiento'), row.fechaNacimiento)
      if (!row.fechaNacimiento) errors[memberField(row.localId, 'fechaNacimiento')] = 'La fecha de nacimiento es obligatoria.'
      if (!memberSexOptions.includes(row.sexo)) errors[memberField(row.localId, 'sexo')] = 'Selecciona Masculino o Femenino.'
      if (!memberRelationshipOptions.includes(row.parentesco)) errors[memberField(row.localId, 'parentesco')] = 'Selecciona un parentesco disponible.'
    })
  }
  if (step === 2) {
    if (!options.length) errors.programas = 'No hay programas disponibles. Reintenta la consulta antes de continuar.'
    else if (!draft.programas.length) errors.programas = 'Selecciona al menos un programa.'
    const seen = new Set<number>()
    draft.programas.forEach((row) => {
      const id = Number(row.programaId)
      if (!options.some((option) => option.id === id)) errors[programField(row.localId, 'programaId')] = 'Selecciona un programa disponible.'
      else if (seen.has(id)) errors[programField(row.localId, 'programaId')] = 'Este programa ya está seleccionado.'
      seen.add(id)
      checkDate(programField(row.localId, 'fechaIngreso'), row.fechaIngreso)
      checkDate(programField(row.localId, 'fechaSalida'), row.fechaSalida)
      if (row.fechaIngreso && row.fechaSalida && validDate(row.fechaIngreso) && validDate(row.fechaSalida) && row.fechaSalida < row.fechaIngreso) errors[programField(row.localId, 'fechaSalida')] = 'La salida no puede ser anterior al ingreso.'
    })
  }
  return errors
}

export function buildIntegralPayload(draft: FamilyWizardInput): IntegralFamilyInput {
  const optional = (value: string) => value.trim() || null
  return {
    nombreReferencia: draft.nombreReferencia.trim(), comunidadId: Number(draft.comunidadId),
    fechaIngreso: optional(draft.fechaIngreso), observaciones: optional(draft.observaciones),
    integrantes: draft.integrantes.map((row) => ({
      nombreCompleto: row.nombreCompleto.trim(), fechaNacimiento: optional(row.fechaNacimiento), sexo: optional(row.sexo),
      parentesco: optional(row.parentesco), telefono: optional(row.telefono), observaciones: optional(row.observaciones),
    })),
    programas: draft.programas.map((row) => ({
      programaId: Number(row.programaId), fechaIngreso: optional(row.fechaIngreso), fechaSalida: optional(row.fechaSalida),
      estado: row.fechaSalida ? 'FINALIZADO' : 'ACTIVO', observaciones: optional(row.observaciones),
    })),
  }
}

export function integralErrorMessage(status?: number, posting = false): string {
  if (status === 400) return 'Revisa los campos indicados. Tus datos se conservan.'
  if (status === 401) return 'La sesión no es válida o ha expirado. Inicia sesión nuevamente antes de continuar.'
  if (status === 403) return 'No tienes permiso para realizar esta operación.'
  if (status === 404) return 'El servicio solicitado no está disponible. Verifica la ruta o contacta al administrador.'
  if (status && status >= 500) return 'El servidor no pudo completar la operación. Tus datos se conservan.'
  if (posting) return 'No se pudo confirmar el resultado del envío. El expediente podría haberse guardado. Verifica el listado antes de intentar otro registro para evitar duplicados.'
  return 'No fue posible consultar el catálogo. Comprueba la conexión y reintenta.'
}
