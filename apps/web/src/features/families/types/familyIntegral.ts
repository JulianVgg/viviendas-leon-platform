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

export type IntegralFamilyRecord = FamilyDetail & {
  integrantes: Array<FamilyMemberInput & { id: number; activo: boolean }>
  programas: Array<FamilyProgramInput & { id: number; programa: { id: number; nombre: string } }>
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
