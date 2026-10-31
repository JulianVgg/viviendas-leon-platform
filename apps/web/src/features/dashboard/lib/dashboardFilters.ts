export type FiltrosDashboard = { comunidadId?: number; responsableId?: number }

// Mantener un único serializador para todas las consultas y los detalles paginados.
export function agregarFiltrosDashboard(params: URLSearchParams, filtros: FiltrosDashboard = {}): URLSearchParams {
  if (filtros.comunidadId && Number.isSafeInteger(filtros.comunidadId) && filtros.comunidadId > 0) params.set('comunidadId', String(filtros.comunidadId))
  if (filtros.responsableId && Number.isSafeInteger(filtros.responsableId) && filtros.responsableId > 0) params.set('responsableId', String(filtros.responsableId))
  return params
}

export const filtrosVacios = (f: FiltrosDashboard) => !f.comunidadId && !f.responsableId
