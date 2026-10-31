export type ResumenDashboard = {
  alcance: 'INSTITUCIONAL' | 'PERSONAL'
  periodo: { meses: number; desde: string; hasta: string }
  indicadores: {
    familias: number | null
    huertosActivos: number | null
    ciclosActivos: number | null
    visitasRealizadas: number
    capacitaciones: number
    visitasVencidas: number
  }
  actividadMensual: Array<{ mes: string; etiqueta: string; visitas: number; capacitaciones: number }>
  programas: Array<{ id: number; nombre: string; familias: number }>
}

export async function consultarDashboard(meses: 3 | 6 | 12, signal?: AbortSignal): Promise<ResumenDashboard> {
  const response = await fetch(`/api/v1/dashboard/resumen?meses=${meses}`, {
    credentials: 'same-origin', cache: 'no-store', signal, headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(response.status === 401 ? 'Inicia sesión para consultar el dashboard.' : 'No se pudieron cargar los indicadores.')
  return (await response.json()) as ResumenDashboard
}

export type ResumenFamiliasProgramas = {
  totalFamilias: number
  familiasConPrograma: number
  familiasSinPrograma: number
  porcentajeCobertura: number
  programas: Array<{ id: number; nombre: string; estado: string; familias: number; porcentaje: number }>
  comunidades: Array<{ nombre: string; total: number; conPrograma: number }>
}

export async function consultarFamiliasProgramas(signal?: AbortSignal): Promise<ResumenFamiliasProgramas> {
  const response = await fetch('/api/v1/dashboard/resumen/familias-programas', {
    credentials: 'same-origin', cache: 'no-store', signal, headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('No se pudo consultar la participación por programa.')
  return (await response.json()) as ResumenFamiliasProgramas
}

export type TipoDetalleIndicador = 'familias' | 'huertos' | 'ciclos' | 'visitas' | 'capacitaciones' | 'vencidas'
export type DetalleIndicador = {
  tipo: TipoDetalleIndicador
  pagina: number
  limite: number
  total: number
  totalPaginas: number
  registros: Array<{ id: number; titulo: string; subtitulo: string; fecha?: string; estado?: string }>
}
export async function consultarDetalleIndicador(tipo: TipoDetalleIndicador, meses: 3|6|12, pagina = 1, signal?: AbortSignal): Promise<DetalleIndicador> {
  const p = new URLSearchParams({tipo, meses: String(meses), pagina: String(pagina), limite: '10'})
  const r = await fetch(`/api/v1/dashboard/resumen/detalle?${p}`, {credentials: 'same-origin',cache:'no-store',signal})
  if (!r.ok) throw new Error('No se pudo cargar el detalle.')
  return await r.json() as DetalleIndicador
}
export type IndicadoresVisitasCapacitaciones = {
  alcance: 'PERSONAL' | 'INSTITUCIONAL'
  periodo: { meses: number; desde: string; hasta: string }
  visitas: { realizadas: number; programadas: number; vencidas: number; reprogramadas: number }
  capacitaciones: { realizadas: number; programadas: number; otras: number }
  porResponsable: Array<{ id: string; nombre: string; visitas: number; capacitaciones: number }>
}
export async function consultarIndicadoresVisitasCapacitaciones(meses: 3|6|12, signal?: AbortSignal): Promise<IndicadoresVisitasCapacitaciones> {
  const r = await fetch(`/api/v1/dashboard/resumen/visitas-capacitaciones?meses=${meses}`,
    {credentials:'same-origin',cache:'no-store',signal,headers:{Accept:'application/json'}})
  if (!r.ok) throw new Error('No se pudieron consultar las actividades.')
  return await r.json() as IndicadoresVisitasCapacitaciones
}
