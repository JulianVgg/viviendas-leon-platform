import type { FamilyDetail } from './family'

export type FamilyMemberInput = {
  nombreCompleto: string
  fechaNacimiento: string | null
  sexo: string | null
  parentesco: string | null
  telefono: string | null
  observaciones: string | null
}

export type FamilyProgramInput = {
  programaId: number
  fechaIngreso: string | null
  fechaSalida: string | null
  estado: string | null
  observaciones: string | null
}

export type IntegralFamilyInput = {
  nombreReferencia: string
  comunidadId: number
  fechaIngreso: string | null
  observaciones: string | null
  integrantes: FamilyMemberInput[]
  programas: FamilyProgramInput[]
}

export type FamilyProgramOption = { id: number; nombre: string; descripcion: string | null; estado: string }
export type FamilyParticipationRecord = FamilyProgramInput & { id: number; version: string; programa: { id: number; nombre: string } }
export type FamilyParticipationCreateInput = FamilyProgramInput
export type FamilyParticipationUpdateInput = Partial<Omit<FamilyProgramInput, 'programaId'>> & { version: string }

export type IntegralFamilyRecord = FamilyDetail & {
  version: string
  integrantes: Array<FamilyMemberInput & { id: number; version: string; activo: boolean }>
  programas: FamilyParticipationRecord[]
}

export type MemberDraft = { localId: string } & { [K in keyof FamilyMemberInput]: string }
export type ProgramDraft = {
  localId: string
  programaId: string
  fechaIngreso: string
  fechaSalida: string
  observaciones: string
}
export type FamilyWizardInput = {
  nombreReferencia: string
  comunidadId: string
  fechaIngreso: string
  observaciones: string
  integrantes: MemberDraft[]
  programas: ProgramDraft[]
}
export type WizardErrors = Record<string, string>

export type FamilyUpdateInput = {
  version: string
  nombreReferencia?: string
  comunidadId?: number
  fechaIngreso?: string | null
  observaciones?: string | null
}

export type FamilyMemberRecord = IntegralFamilyRecord['integrantes'][number]
export type FamilyMemberUpdateInput = Partial<FamilyMemberInput> & { version: string }
