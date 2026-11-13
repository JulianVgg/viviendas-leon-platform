// CIR-14: reglas puras para filtros y nombre del archivo (sin red ni React).
export type FiltrosReporte = { anio: number; semestre: 1 | 2; comunidadId?: number; familiaId?: number; desde?: string; hasta?: string }
export type OpcionesReporte = {
  comunidades: Array<{ id: number; nombre: string }>
  familias: Array<{ id: number; nombreReferencia: string; comunidadId: number }>
}

export function querySemestral(filtros: FiltrosReporte): string {
  const params = new URLSearchParams({ anio: String(filtros.anio), semestre: String(filtros.semestre) })
  if (filtros.desde && filtros.hasta) { params.set('desde', filtros.desde); params.set('hasta', filtros.hasta) }
  if (filtros.comunidadId) params.set('comunidadId', String(filtros.comunidadId))
  if (filtros.familiaId) params.set('familiaId', String(filtros.familiaId))
  return params.toString()
}

export function familiasDeComunidad(opciones: OpcionesReporte, comunidadId?: number) {
  return opciones.familias.filter(familia => !comunidadId || familia.comunidadId === comunidadId)
}

export function nombreArchivoReporte(filtros: FiltrosReporte, vista: 'agricola' | 'ventas-cultivo' | 'ventas-detalle' = 'agricola') {
  const alcance = filtros.familiaId ? `_F${filtros.familiaId}` : filtros.comunidadId ? `_C${filtros.comunidadId}` : ''
  const periodo = filtros.desde && filtros.hasta
    ? `${filtros.desde}_${filtros.hasta}` : `${filtros.anio}_S${filtros.semestre}`
  return `Producciones_Agricolas_${periodo}${alcance}${vista === 'agricola' ? '' : `_${vista}`}.xlsx`
}


// CIR-16: comparación con Dashboard usando exactamente las mismas fechas y comunidad.
// El enlace no concede permisos: Reportes mantiene sus controles en API.
export type EnlaceDashboard = { desde: string; hasta: string; comunidadId?: number }

export function construirEnlaceReportesDashboard(filtros: EnlaceDashboard): string {
  const params = new URLSearchParams({ modo: 'rango', desde: filtros.desde, hasta: filtros.hasta })
  if (filtros.comunidadId) params.set('comunidadId', String(filtros.comunidadId))
  return `/reportes/reportes?${params.toString()}`
}

export function leerEnlaceReportesDashboard(query: string): EnlaceDashboard | null {
  const params = new URLSearchParams(query)
  if (params.get('modo') !== 'rango') return null
  const desde = params.get('desde') ?? ''
  const hasta = params.get('hasta') ?? ''
  const fechaValida = (valor: string) => {
    if (!/^20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(valor)) return false
    const fecha = new Date(`${valor}T00:00:00Z`)
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor
  }
  if (!fechaValida(desde) || !fechaValida(hasta)) return null
  const dias = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000
  if (dias < 0 || dias > 730) return null
  const comunidad = params.get('comunidadId')
  const comunidadId = comunidad && /^[1-9]\d{0,8}$/.test(comunidad) ? Number(comunidad) : undefined
  return { desde, hasta, ...(comunidadId ? { comunidadId } : {}) }
}
