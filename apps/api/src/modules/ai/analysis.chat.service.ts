import type { AuthenticatedUser } from '../auth/auth.service.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import { validarParametrosContextoIA } from './indicator-context.rules.js'
import { consolidarIndicadoresIA } from './indicator-context.service.js'
import type { FiltrosMon05 } from '../dashboard/mon05-filters.js'
import { AnalysisError } from './analysis.errors.js'
import { validarPreguntaChat, validarHistorialChat, type MensajeChatIA } from './analysis.chat.rules.js'
import { consultarChatGemini, consultarChatOpenAI } from './analysis.chat.client.js'
import { finalizarSolicitudAnalisis, limiteEntero, reservarCupoAnalisis } from './analysis.quota.js'

/** Inyección para pruebas. Todas las consultas institucionales se agregan antes de llamar al proveedor. */
export type DependenciasChatIA = {
  consolidar: typeof consolidarIndicadoresIA
  consultarGemini: typeof consultarChatGemini
  consultarOpenAI: typeof consultarChatOpenAI
  reservar: typeof reservarCupoAnalisis
  finalizar: typeof finalizarSolicitudAnalisis
}
const dependencias: DependenciasChatIA = {
  consolidar: consolidarIndicadoresIA, consultarGemini: consultarChatGemini,
  consultarOpenAI: consultarChatOpenAI, reservar: reservarCupoAnalisis, finalizar: finalizarSolicitudAnalisis,
}

export async function responderChatInstitucional(
  usuario: AuthenticatedUser,
  meses: number,
  pregunta: unknown,
  historial: unknown,
  filtros: FiltrosMon05 = {},
  opts: { deps?: DependenciasChatIA; env?: NodeJS.ProcessEnv; ahora?: Date } = {},
) {
  if (!puedeEditarPerfilCompleto(usuario.roles)) throw new AnalysisError('FORBIDDEN', 403, 'No autorizado.')
  try { validarParametrosContextoIA(meses, filtros) }
  catch { throw new AnalysisError('INVALID_FILTERS', 400, 'El período o los filtros no son válidos.') }
  const preguntaValidada = validarPreguntaChat(pregunta)
  const historialValidado: MensajeChatIA[] = validarHistorialChat(historial)
  const env = opts.env ?? process.env
  const proveedor = env.AI_PROVIDER?.trim().toLowerCase() || 'openai'
  if (proveedor !== 'openai' && proveedor !== 'gemini') {
    throw new AnalysisError('AI_CONFIG', 503, 'Proveedor no válido.')
  }
  const apiKey = (proveedor === 'gemini' ? env.GEMINI_API_KEY : env.OPENAI_API_KEY)?.trim()
  if (!apiKey) throw new AnalysisError('AI_NOT_CONFIGURED', 503, 'El asistente no está configurado.')
  const modelo = (proveedor === 'gemini' ? env.GEMINI_ANALYSIS_MODEL : env.OPENAI_ANALYSIS_MODEL)?.trim()
    || (proveedor === 'gemini' ? 'gemini-2.5-flash-lite' : 'gpt-5.6-luna')
  if (!/^[a-zA-Z0-9_.-]{2,100}$/.test(modelo)) throw new AnalysisError('AI_CONFIG', 503, 'Modelo no válido.')
  const limites = { usuario: limiteEntero(env.AI_DAILY_USER_LIMIT, 3, 20), global: limiteEntero(env.AI_DAILY_GLOBAL_LIMIT, 30, 200) }
  const deps = opts.deps ?? dependencias
  const contexto = await deps.consolidar(usuario, meses, filtros, undefined, opts.ahora)
  const reserva = await deps.reservar(usuario.id, modelo, limites)
  try {
    const consultar = proveedor === 'gemini' ? deps.consultarGemini : deps.consultarOpenAI
    const resultado = await consultar(contexto, preguntaValidada, historialValidado, { apiKey, modelo })
    await deps.finalizar(reserva.id, 'COMPLETADA', {
      tokensEntrada: resultado.tokens.entrada, tokensSalida: resultado.tokens.salida, proveedorId: resultado.proveedorId,
    })
    return { resultado: resultado.chat, metadata: { generadoEn: contexto.generadoEn, modelo,
      periodos: contexto.periodos, filtros: contexto.filtros, indicadoresPermitidos: contexto.fuentes } }
  } catch (error) {
    try { await deps.finalizar(reserva.id, 'FALLIDA') } catch { /* Se conserva el error original. */ }
    if (error instanceof AnalysisError) throw error
    throw new AnalysisError('AI_UNAVAILABLE', 503, 'El asistente no está disponible.')
  }
}
