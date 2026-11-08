import type {
  IndicadoresAgricolas,
  IndicadoresVisitasCapacitaciones,
  OpcionesFiltrosDashboard,
  ResumenDashboard,
  ResumenFamiliasProgramas,
} from '../services/dashboardSummaryService'

/** Caché de navegación en memoria: solo durante la sesión SPA de la pestaña. */
export type DashboardReturnState = {
  userId: number
  scrollY: number
  meses: 3 | 6 | 12
  comunidadId?: number
  responsableId?: number
  resumen: ResumenDashboard | null
  familiasProgramas: ResumenFamiliasProgramas | null
  indicadoresOperativos: IndicadoresVisitasCapacitaciones | null
  agricultura: IndicadoresAgricolas | null
  opciones: OpcionesFiltrosDashboard | null
}

let retorno: DashboardReturnState | null = null
let posicionPendiente = false

export function guardarRetornoDashboard(datos: DashboardReturnState): void {
  retorno = datos
  posicionPendiente = true
}

export function obtenerRetornoDashboard(userId?: number): DashboardReturnState | null {
  return userId && retorno?.userId === userId ? retorno : null
}

export function consumirPosicionDashboard(userId?: number): number | null {
  if (!posicionPendiente || !userId || retorno?.userId !== userId) return null
  posicionPendiente = false
  return retorno.scrollY
}
