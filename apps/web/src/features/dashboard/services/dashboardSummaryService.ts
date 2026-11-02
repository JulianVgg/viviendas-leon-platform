import { agregarFiltrosDashboard, type FiltrosDashboard } from '../lib/dashboardFilters'
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

export async function consultarDashboard(meses: 3 | 6 | 12, signal?: AbortSignal, filtros: FiltrosDashboard = {}): Promise<ResumenDashboard> {
  const response = await fetch(`/api/v1/dashboard/resumen?${agregarFiltrosDashboard(new URLSearchParams({ meses: String(meses) }), filtros)}`, {
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

export async function consultarFamiliasProgramas(signal?: AbortSignal, filtros: FiltrosDashboard = {}): Promise<ResumenFamiliasProgramas> {
  const response = await fetch(`/api/v1/dashboard/resumen/familias-programas?${agregarFiltrosDashboard(new URLSearchParams(), filtros)}`, {
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
export async function consultarDetalleIndicador(tipo: TipoDetalleIndicador, meses: 3|6|12, pagina = 1, signal?: AbortSignal, filtros: FiltrosDashboard = {}): Promise<DetalleIndicador> {
  const p = agregarFiltrosDashboard(new URLSearchParams({tipo, meses: String(meses), pagina: String(pagina), limite: '10'}), filtros)
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
export async function consultarIndicadoresVisitasCapacitaciones(meses: 3|6|12, signal?: AbortSignal, filtros: FiltrosDashboard = {}): Promise<IndicadoresVisitasCapacitaciones> {
  const r = await fetch(`/api/v1/dashboard/resumen/visitas-capacitaciones?${agregarFiltrosDashboard(new URLSearchParams({ meses: String(meses) }), filtros)}`,
    {credentials:'same-origin',cache:'no-store',signal,headers:{Accept:'application/json'}})
  if (!r.ok) throw new Error('No se pudieron consultar las actividades.')
  return await r.json() as IndicadoresVisitasCapacitaciones
}

export type IndicadoresAgricolas = {
  alcance: 'INSTITUCIONAL'
  periodo: { meses:number; desde:string; hasta:string }
  indicadores: {
    ciclosRegistrados:number; ciclosActivos:number; ciclosFinalizados:number
    variedadesActivas:number; familiasConSiembras:number; plantasActivas:number
    registrosProduccion:number; produccionKg:number; produccionUnidades:number; unidadesNoComparables:number
  }
  visitasConProduccion:number
  porCultivo:Array<{id:number;nombre:string;ciclos:number;activos:number;plantas:number;kg:number;unidades:number}>
  porComunidad:Array<{nombre:string;familias:number;ciclosActivos:number}>
  produccionMensual:Array<{mes:string;kg:number;unidades:number;registros:number}>
}
export async function consultarIndicadoresAgricolas(meses: 3|6|12, signal?: AbortSignal, filtros: FiltrosDashboard = {}): Promise<IndicadoresAgricolas> {
  const response = await fetch(`/api/v1/dashboard/resumen/agricultura-produccion?${agregarFiltrosDashboard(new URLSearchParams({ meses: String(meses) }), filtros)}`,
    {credentials:'same-origin',cache:'no-store',signal,headers:{Accept:'application/json'}})
  if (!response.ok) throw new Error('No se pudieron consultar los indicadores agrícolas.')
  return (await response.json()) as IndicadoresAgricolas
}

export type OpcionesFiltrosDashboard = {
  comunidades: Array<{id: number; nombre: string}>
  responsables: Array<{id: number; nombre: string}>
}
export async function consultarOpcionesFiltrosDashboard(signal?: AbortSignal): Promise<OpcionesFiltrosDashboard> {
  const r = await fetch('/api/v1/dashboard/resumen/filtros', { credentials:'same-origin', cache:'no-store', signal })
  if (!r.ok) throw new Error('No se pudieron cargar los filtros.')
  return await r.json() as OpcionesFiltrosDashboard
}

// MON-06: alertas y compromisos actuales, independientes del período estadístico.
export type RegistroAlerta = {
  id: string
  tipo: 'VISITA' | 'COMPROMISO'
  titulo: string
  fecha: string | null
  estado: 'VENCIDA' | 'PENDIENTE'
  comunidad: string
  familia?: string
  responsable: string
  revisionProximaVisita?: boolean
  destino: string
}
export type ResumenAlertas = {
  fechaHoy: string
  indicadores: { visitasVencidas: number; compromisosPendientes: number; compromisosVencidos: number }
  visitas: RegistroAlerta[]
  compromisos: RegistroAlerta[]
}
export type TipoListaAlertas = 'visitas' | 'compromisos'
export type SituacionListaAlertas = 'todas' | 'vencidas'
export type DetalleAlertas = {
  tipo: TipoListaAlertas
  situacion: SituacionListaAlertas
  pagina: number
  limite: number
  total: number
  totalPaginas: number
  registros: RegistroAlerta[]
}
export async function consultarResumenAlertas(signal?: AbortSignal, filtros: FiltrosDashboard = {}): Promise<ResumenAlertas | null> {
  const parametros = agregarFiltrosDashboard(new URLSearchParams(), filtros)
  const r = await fetch(`/api/v1/dashboard/resumen/alertas?${parametros}`, {
    credentials: 'same-origin', cache: 'no-store', signal, headers: { Accept: 'application/json' },
  })
  if (r.status === 403) return null // Usuario sin acceso operativo; no mostrar indicadores técnicos.
  if (!r.ok) throw new Error('No se pudieron consultar las alertas.')
  return (await r.json()) as ResumenAlertas
}
export async function consultarDetalleAlertas(
  tipo: TipoListaAlertas, situacion: SituacionListaAlertas, pagina: number, signal?: AbortSignal,
  filtros: FiltrosDashboard = {},
): Promise<DetalleAlertas> {
  const parametros = agregarFiltrosDashboard(new URLSearchParams({ tipo, situacion, pagina: String(pagina), limite: '10' }), filtros)
  const r = await fetch(`/api/v1/dashboard/resumen/alertas/detalle?${parametros}`, {
    credentials: 'same-origin', cache: 'no-store', signal, headers: { Accept: 'application/json' },
  })
  if (!r.ok) throw new Error('No se pudo consultar el detalle de las alertas.')
  return (await r.json()) as DetalleAlertas
}
