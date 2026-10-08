export type CommunityOption = {
  id: number
  nombre: string
  municipio: { id: number; nombre: string }
}

export type FamilyDetail = {
  id: number
  nombreReferencia: string
  comunidad: CommunityOption
  estado: string
  fechaIngreso: string | null
  observaciones: string | null
}

export type FamilyCreateInput = {
  nombreReferencia: string
  comunidadId: number
  fechaIngreso?: string
  observaciones?: string
}

export type FamilyListItem = {
  id: number
  nombreReferencia: string
  fechaIngreso: string | null
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

export type FamilyListResponse = {
  data: FamilyListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type FamilyListParams = {
  search?: string
  estado?: string
  page?: number
  limit?: number
}
