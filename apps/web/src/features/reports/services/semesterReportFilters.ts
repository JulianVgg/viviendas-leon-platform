// CIR-14: reglas puras para filtros y nombre del archivo (sin red ni React).
export type FiltrosReporte = { anio: number; semestre: 1 | 2; comunidadId?: number; familiaId?: number }
export type OpcionesReporte = {
  comunidades: Array<{ id: number; nombre: string }>
  familias: Array<{ id: number; nombreReferencia: string; comunidadId: number }>
}

export function querySemestral(filtros: FiltrosReporte): string {
  const params = new URLSearchParams({ anio: String(filtros.anio), semestre: String(filtros.semestre) })
  if (filtros.comunidadId) params.set('comunidadId', String(filtros.comunidadId))
  if (filtros.familiaId) params.set('familiaId', String(filtros.familiaId))
  return params.toString()
}

export function familiasDeComunidad(opciones: OpcionesReporte, comunidadId?: number) {
  return opciones.familias.filter(familia => !comunidadId || familia.comunidadId === comunidadId)
}

export function nombreArchivoReporte(filtros: FiltrosReporte) {
  const alcance = filtros.familiaId ? `_F${filtros.familiaId}` : filtros.comunidadId ? `_C${filtros.comunidadId}` : ''
  return `Producciones_Agricolas_${filtros.anio}_S${filtros.semestre}${alcance}.xlsx`
}
