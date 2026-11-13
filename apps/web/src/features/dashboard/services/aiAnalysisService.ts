import type { FiltrosDashboard } from '../lib/dashboardFilters'

export type MesesAnalisis = 3 | 6 | 12
export type EnfoqueAnalisis = 'resumen' | 'prioridades' | 'mejoras' | 'fortalezas' | 'plan'
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
export function construirSolicitudAnalisis(meses: MesesAnalisis, filtros: FiltrosDashboard = {}, enfoque: EnfoqueAnalisis = 'resumen') {
  if (![3, 6, 12].includes(meses)) throw new Error('Período inválido.')
  if (!['resumen', 'prioridades', 'mejoras', 'fortalezas', 'plan'].includes(enfoque)) throw new Error('Consulta no válida.')
  const solicitud: { meses: MesesAnalisis; enfoque: EnfoqueAnalisis; comunidadId?: number; responsableId?: number } = { meses, enfoque }
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
  meses: MesesAnalisis, filtros: FiltrosDashboard = {}, signal?: AbortSignal, enfoque: EnfoqueAnalisis = 'resumen',
): Promise<RespuestaAnalisisIA> {
  const response = await fetch('/api/v1/dashboard/analisis', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(construirSolicitudAnalisis(meses, filtros, enfoque)),
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

/** Conversación limitada a los indicadores institucionales; nunca se envían datos del navegador sobre familias. */
export type MensajeHistorialIA = { rol: 'usuario' | 'asistente'; texto: string }
export type RespuestaChatInstitucional = {
  resultado: { respuesta: string; referencias: string[]; limitaciones: string[] }
  metadata: { generadoEn: string; modelo: string; indicadoresPermitidos: string[] }
}

export async function preguntarAlAsistenteIA(
  meses: MesesAnalisis, pregunta: string, historial: MensajeHistorialIA[], signal?: AbortSignal,
): Promise<RespuestaChatInstitucional> {
  const texto = pregunta.trim()
  if (texto.length < 3 || texto.length > 600) {
    throw new ErrorAnalisisIA('INVALID_BODY', 400, 'Escribe una pregunta de hasta 600 caracteres.')
  }
  const response = await fetch('/api/v1/dashboard/analisis/chat', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ meses, pregunta: texto, historial: historial.slice(-8) }),
  })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const codigo = body && typeof body === 'object' && 'error' in body && body.error &&
      typeof body.error === 'object' && 'code' in body.error && typeof body.error.code === 'string'
      ? body.error.code : 'AI_UNAVAILABLE'
    throw new ErrorAnalisisIA(codigo, response.status,
      codigo === 'INVALID_BODY' ? 'La pregunta o el historial no son válidos.' : mensajeErrorAnalisis(codigo, response.status))
  }
  const datos: unknown = await response.json().catch(() => null)
  if (!datos || typeof datos !== 'object' || !('resultado' in datos) || !('metadata' in datos) ||
      !datos.resultado || typeof datos.resultado !== 'object' ||
      !('respuesta' in datos.resultado) || typeof datos.resultado.respuesta !== 'string' ||
      !('referencias' in datos.resultado) || !Array.isArray(datos.resultado.referencias)) {
    throw new ErrorAnalisisIA('INVALID_RESPONSE', 502, mensajeErrorAnalisis('INVALID_RESPONSE', 502))
  }
  return datos as RespuestaChatInstitucional
}
