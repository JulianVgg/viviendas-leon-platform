import type { FamilyCreateInput } from './families.types.js'

export type FamilyMemberInput = {
  nombreCompleto: string
  fechaNacimiento: Date | null
  sexo: string | null
  parentesco: string | null
  telefono: string | null
  observaciones: string | null
}

export type FamilyProgramInput = {
  programaId: number
  fechaIngreso: Date | null
  fechaSalida: Date | null
  estado: string | null
  observaciones: string | null
}

export type IntegralFamilyInput = FamilyCreateInput & {
  integrantes: FamilyMemberInput[]
  programas: FamilyProgramInput[]
}

/** JSON contract: dates use the same UTC ISO serialization as the basic API. */
export type IntegralFamilyRecord = {
  id: number
  nombreReferencia: string
  fechaIngreso: string | null
  estado: string
  observaciones: string | null
  comunidad: { id: number; nombre: string; municipio: { id: number; nombre: string } }
  integrantes: Array<Omit<FamilyMemberInput, 'fechaNacimiento'> & {
    id: number
    fechaNacimiento: string | null
    activo: boolean
  }>
  programas: Array<Omit<FamilyProgramInput, 'fechaIngreso' | 'fechaSalida'> & {
    id: number
    programa: { id: number; nombre: string }
    fechaIngreso: string | null
    fechaSalida: string | null
  }>
}

export type FamilyProgramOption = {
  id: number
  nombre: string
  descripcion: string | null
  estado: string
}
