export type MunicipalityOption = { id: number; nombre: string }

export type AdminCommunity = {
  id: number
  nombre: string
  activo: boolean
  municipio: MunicipalityOption & { activo: boolean }
  familiasCount: number
  capacitacionesCount: number
}

export type CommunityFormData = { nombre: string; municipioId: number }
