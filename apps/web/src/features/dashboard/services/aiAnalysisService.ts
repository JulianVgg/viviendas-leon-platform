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
  if (codigo === 'AI_RATE_LIMIT') return 'Demasiadas consultas recientes. Inténtalo en unos minutos.'
  if (codigo === 'AI_INVALID_REQUEST') return 'El proveedor de IA rechazó el formato de la consulta.'
  if (codigo === 'AI_MODEL_UNAVAILABLE') return 'El modelo de IA no está disponible para este proyecto.'
  if (codigo === 'AI_PROVIDER_AUTH') return 'El proveedor de IA no autorizó la consulta.'
  if (codigo === 'AI_LIMIT') return 'Gemini alcanzó su límite. Inténtalo más tarde.'
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
export type IntercambioIA = { pregunta: string; respuesta: string; referencias: string[]; limitaciones: string[] }
export type ConversacionIA = { id: string; titulo: string; actualizadoEn: string; intercambios: IntercambioIA[] }
export type AccionIA =
  | { tipo: 'agendar_visita'; familiaId: number; responsableId: number; fecha: string; turno: 'MANANA' | 'TARDE' }
  | { tipo: 'reprogramar_visita'; visitaId: number; fecha: string; motivo: string }
  | { tipo: 'reporte_semestral'; anio: number; semestre: 1 | 2 }
  | { tipo: 'actualizar_compromiso'; compromisoId: string; estado: 'CUMPLIDO' | 'NO_CUMPLIDO' }
  | { tipo: 'crear_evento'; titulo: string; fecha: string; inicio: string; fin: string; participantesIds: number[] }
export type CatalogoIA = { familias: {id:number;nombreReferencia:string}[]; tecnicos:{id:number;nombre:string}[]; participantes:{id:number;nombre:string}[]; compromisos:{id:string;texto:string;visitaOrigen:{familiaId:number}}[]; huertos:{id:number;nombre:string|null;familiaId:number}[]; visitas:{id:number;familiaId:number;usuarioResponsableId:number;fecha:string}[] }
const baseIA='/api/v1/dashboard/analisis'
async function apiIA<T>(url:string, init?:RequestInit):Promise<T> {
  const r=await fetch(url,{...init,credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest',...init?.headers}})
  if(!r.ok){const b=await r.json().catch(()=>null);throw new Error(typeof b?.error==='string'?b.error:b?.error?.message ?? `No fue posible completar la operación (HTTP ${r.status}).`)}
  if(r.status===204)return undefined as T
  return r.json() as Promise<T>
}
export const listarConversacionesIA=async(signal?:AbortSignal)=>(await apiIA<{data:Omit<ConversacionIA,'intercambios'>[]}>(`${baseIA}/conversaciones`,{signal})).data
export const leerConversacionIA=async(id:string,signal?:AbortSignal)=>(await apiIA<{data:ConversacionIA}>(`${baseIA}/conversaciones/${encodeURIComponent(id)}`,{signal})).data
export const eliminarConversacionIA=(id:string)=>apiIA<void>(`${baseIA}/conversaciones/${encodeURIComponent(id)}`,{method:'DELETE'})
export const catalogoAsistenteIA=async(signal?:AbortSignal)=>(await apiIA<{data:CatalogoIA}>(`${baseIA}/catalogo`,{signal})).data
export async function ejecutarAccionIA(a:AccionIA, operacionId:string):Promise<string>{
  // Nunca se evalúa código generado ni se permite una URL elegida por el modelo.
  if(a.tipo==='agendar_visita'){
    const r=await apiIA<{visitId:number}>('/api/v1/visitas/agenda/asignar',{method:'POST',body:JSON.stringify({operationId:operacionId,kind:'visits.create.v1',responsableId:a.responsableId,payload:{familyId:a.familiaId,date:a.fecha,status:'PROGRAMADA',timeSlot:a.turno,crops:[],commitments:[],reviews:[]}})})
    return `Visita #${r.visitId} programada.`
  }
  if(a.tipo==='reprogramar_visita'){
    await apiIA(`/api/v1/visitas/agenda/${a.visitaId}`,{method:'PATCH',body:JSON.stringify({date:a.fecha,reason:a.motivo})});return 'Visita reprogramada.'
  }
  if(a.tipo==='actualizar_compromiso'){
    await apiIA(`/api/v1/visitas/seguimientos/${encodeURIComponent(a.compromisoId)}/estado`,{method:'PATCH',body:JSON.stringify({estado:a.estado})});return 'Compromiso actualizado.'
  }
  if(a.tipo==='crear_evento'){
    const r=await apiIA<{id:number}>('/api/v1/calendario',{method:'POST',headers:{'X-Operation-Id':operacionId},body:JSON.stringify({categoria:'OTRO',titulo:a.titulo,fechaInicio:a.fecha,todoElDia:false,horaInicio:a.inicio,horaFin:a.fin,participantesIds:a.participantesIds})});return `Actividad #${r.id} creada.`
  }
  if(a.tipo==='reporte_semestral'){
    const q=new URLSearchParams({anio:String(a.anio),semestre:String(a.semestre)})
    const r=await fetch(`/api/v1/reportes/produccion-semestral.xlsx?${q}`,{credentials:'same-origin',cache:'no-store'})
    if(!r.ok)throw new Error('No se pudo generar el reporte semestral.')
    const url=URL.createObjectURL(await r.blob());const link=document.createElement('a');link.href=url;link.download=`Produccion-${a.anio}-S${a.semestre}.xlsx`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
    return 'Reporte semestral descargado.'
  }
  throw new Error('Acción no permitida.')
}
export type RespuestaChatInstitucional = {
  resultado: { respuesta: string; referencias: string[]; limitaciones: string[] }
  metadata: { generadoEn: string; modelo: string; indicadoresPermitidos: string[] }
  conversacionId: string
  intercambios: IntercambioIA[]
  accion: AccionIA | null
}

export async function preguntarAlAsistenteIA(
  meses: MesesAnalisis, pregunta: string, conversacionId: string | null, signal?: AbortSignal,
): Promise<RespuestaChatInstitucional> {
  const texto = pregunta.trim()
  if (texto.length < 3 || texto.length > 4000) {
    throw new ErrorAnalisisIA('INVALID_BODY', 400, 'Escribe una pregunta de hasta 4000 caracteres.')
  }
  const response = await fetch('/api/v1/dashboard/analisis/chat', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With':'XMLHttpRequest' },
    body: JSON.stringify({ meses, pregunta: texto, conversacionId }),
  })
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const codigo = body && typeof body === 'object' && 'error' in body && body.error &&
      typeof body.error === 'object' && 'code' in body.error && typeof body.error.code === 'string'
      ? body.error.code : 'AI_UNAVAILABLE'
    throw new ErrorAnalisisIA(codigo, response.status,
      codigo === 'CHAT_CONFLICT' ? 'La conversación cambió en otra pestaña. Vuelve a abrirla.' : codigo === 'INVALID_BODY' ? 'La pregunta o el historial no son válidos.' : mensajeErrorAnalisis(codigo, response.status))
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

/** La cuota real se calcula en el backend con zona horaria de Guatemala. */
export type CuotaIA = { limite: number; utilizadas: number; disponibles: number; reinicio: string }
export async function consultarCuotaIA(signal?: AbortSignal): Promise<CuotaIA> {
  const respuesta = await fetch('/api/v1/dashboard/analisis/cuota', {
    credentials: 'same-origin', cache: 'no-store', signal, headers: { Accept: 'application/json' },
  })
  if (!respuesta.ok) throw new Error('No se pudo consultar la disponibilidad del asistente.')
  return respuesta.json() as Promise<CuotaIA>
}
