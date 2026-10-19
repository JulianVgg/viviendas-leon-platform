export type AdminMunicipality = {
  id: number
  nombre: string
  activo: boolean
  comunidadesCount: number
  comunidadesActivasCount: number
}

export type MunicipalityFormData = { nombre: string }
