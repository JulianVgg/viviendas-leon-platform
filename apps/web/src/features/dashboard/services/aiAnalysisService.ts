import type { FiltrosDashboard } from '../lib/dashboardFilters'

export type MesesAnalisis = 3 | 6 | 12
export type ReferenciaIndicadorIA = string
export type ElementoAnalisisIA = { titulo: string; descripcion: string; indicadores: ReferenciaIndicadorIA[] }
export type RecomendacionIA = { accion: string; justificacion: string; indicadores: ReferenciaIndicadorIA[] }
export type ResultadoAnalisisIA = {
  resumen: string
  hallazgos: ElementoAnalisisIA[]
  riesgos: ElementoAnalisisIA[]
  recomendaciones: RecomendacionIA[]
  limitaciones: string[]
}
export type RespuestaAnalisisIA = {
  resultado: ResultadoAnalisisIA
  metadata: {
    version: string
    generadoEn: string
    modelo: string
    periodos: Record<string, unknown>
    filtros: { meses: number; comunidad: string; responsable: string }
    indicadoresPermitidos: string[]
  }
}

export class ErrorAnalisisIA extends Error {
  readonly codigo: string
  readonly estadoHttp: number
  constructor(codigo: string, estadoHttp: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorAnalisisIA'
    this.codigo = codigo
    this.estadoHttp = estadoHttp
  }
}

/** Los únicos parámetros aceptados por AI-01.2; nunca enviamos métricas, prompts ni datos personales. */
export function construirSolicitudAnalisis(meses: MesesAnalisis, filtros: FiltrosDashboard = {}) {
  if (![3, 6, 12].includes(meses)) throw new Error('Período inválido.')
  const solicitud: { meses: MesesAnalisis; comunidadId?: number; responsableId?: number } = { meses }
  if (filtros.comunidadId !== undefined) {
    if (!Number.isSafeInteger(filtros.comunidadId) || filtros.comunidadId < 1) throw new Error('Comunidad inválida.')
    solicitud.comunidadId = filtros.comunidadId
  }
  if (filtros.responsableId !== undefined) {
    if (!Number.isSafeInteger(filtros.responsableId) || filtros.responsableId < 1) throw new Error('Responsable inválido.')
    solicitud.responsableId = filtros.responsableId
  }
  return solicitud
}

export function mensajeErrorAnalisis(codigo: string, status: number): string {
  if (codigo === 'AI_NOT_CONFIGURED') return 'El análisis asistido aún no está configurado. Puedes continuar consultando los indicadores.'
  if (codigo === 'AI_DAILY_LIMIT' || status === 429) return 'Se alcanzó el límite diario de análisis. Inténtalo otro día.'
  if (status === 401) return 'Tu sesión ha finalizado. Inicia sesión nuevamente.'
  if (status === 403) return 'No tienes permiso para generar análisis institucionales.'
  if (status === 400) return 'Los filtros seleccionados no son válidos.'
  if (status === 502) return 'El servicio devolvió una respuesta inválida. Inténtalo de nuevo.'
  return 'No fue posible generar el análisis. Los indicadores continúan disponibles.'
}

export async function solicitarAnalisisIA(
  meses: MesesAnalisis, filtros: FiltrosDashboard = {}, signal?: AbortSignal,
): Promise<RespuestaAnalisisIA> {
  const response = await fetch('/api/v1/dashboard/analisis', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(construirSolicitudAnalisis(meses, filtros)),
  })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const codigo = body && typeof body === 'object' && 'error' in body && body.error && typeof body.error === 'object' &&
      'code' in body.error && typeof body.error.code === 'string' ? body.error.code : 'AI_UNAVAILABLE'
    throw new ErrorAnalisisIA(codigo, response.status, mensajeErrorAnalisis(codigo, response.status))
  }
  const data: unknown = await response.json().catch(() => null)
  if (!data || typeof data !== 'object' || !('resultado' in data) || !('metadata' in data) ||
    !data.resultado || !data.metadata || typeof data.resultado !== 'object' || typeof data.metadata !== 'object') {
    throw new ErrorAnalisisIA('INVALID_RESPONSE', 502, mensajeErrorAnalisis('INVALID_RESPONSE', 502))
  }
  return data as RespuestaAnalisisIA
}
