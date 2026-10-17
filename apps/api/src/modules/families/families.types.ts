export type FamilyCreateInput = {
  nombreReferencia: string
  comunidadId: number
  fechaIngreso: Date | null
  observaciones: string | null
}

export type ValidationDetail = { field: string; message: string }

export type FamilyUpdateInput = Partial<FamilyCreateInput> & { version: string }

export type FamilyMemberCreateInput = {
  nombreCompleto: string
  fechaNacimiento: Date
  sexo: string
  parentesco: string
  telefono: string | null
  observaciones: string | null
}

export type FamilyMemberUpdateInput = Partial<{
  nombreCompleto: string
  fechaNacimiento: Date | null
  sexo: string | null
  parentesco: string | null
  telefono: string | null
  observaciones: string | null
}> & { version: string }

export type FamilyMemberStateInput = { activo: boolean; version: string }

export type FamilyListFilters = {
  search?: string
  estado?: string
  comunidadId?: number
  programaId?: number
  page: number
  limit: number
}

export type FamilyListItem = {
  id: number
  nombreReferencia: string
  fechaIngreso: Date | null
  estado: string
  comunidad: {
    id: number
    nombre: string
  }
  programas: Array<{
    id: number
    nombre: string
    estado: string | null
  }>
  integrantes: number
}
