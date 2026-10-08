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
