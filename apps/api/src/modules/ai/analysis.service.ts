import type { AuthenticatedUser } from '../auth/auth.service.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import { validarParametrosContextoIA } from './indicator-context.rules.js'
import { consolidarIndicadoresIA } from './indicator-context.service.js'
import type { FiltrosMon05 } from '../dashboard/mon05-filters.js'
import { consultarAnalisisOpenAI } from './analysis.client.js'
import { consultarAnalisisGemini } from './analysis.gemini.client.js'
import { AnalysisError } from './analysis.errors.js'
import type { EnfoqueAnalisis } from './analysis.focus.js'
import { finalizarSolicitudAnalisis, limiteEntero, reservarCupoAnalisis } from './analysis.quota.js'

/** Inyección de dependencias para probar sin red, credenciales ni conexión a PostgreSQL. */
export type DependenciasAnalisisIA = {
  consolidar: typeof consolidarIndicadoresIA
  consultar: typeof consultarAnalisisOpenAI
  reservar: typeof reservarCupoAnalisis
  finalizar: typeof finalizarSolicitudAnalisis
}

const dependencias: DependenciasAnalisisIA = {
  consolidar: consolidarIndicadoresIA,
  consultar: consultarAnalisisOpenAI,
  reservar: reservarCupoAnalisis,
  finalizar: finalizarSolicitudAnalisis,
}

export async function generarAnalisisIA(
  usuario: AuthenticatedUser,
  meses: number,
  filtros: FiltrosMon05 = {},
  opts: { deps?: DependenciasAnalisisIA; env?: NodeJS.ProcessEnv; ahora?: Date; enfoque?: EnfoqueAnalisis } = {},
) {
  if (!puedeEditarPerfilCompleto(usuario.roles)) {
    throw new AnalysisError('FORBIDDEN', 403, 'No autorizado para análisis institucional.')
  }
  try { validarParametrosContextoIA(meses, filtros) }
  catch { throw new AnalysisError('INVALID_FILTERS', 400, 'El período o los filtros no son válidos.') }
  const env = opts.env ?? process.env
  const proveedor = env.AI_PROVIDER?.trim().toLowerCase() || 'openai'
  if (proveedor !== 'openai' && proveedor !== 'gemini') {
    throw new AnalysisError('AI_CONFIG', 503, 'Proveedor de análisis no válido.')
  }
  const apiKey = (proveedor === 'gemini' ? env.GEMINI_API_KEY : env.OPENAI_API_KEY)?.trim()
  if (!apiKey) throw new AnalysisError('AI_NOT_CONFIGURED', 503, 'El análisis asistido aún no está configurado.')
  const modelo = (proveedor === 'gemini' ? env.GEMINI_ANALYSIS_MODEL : env.OPENAI_ANALYSIS_MODEL)?.trim()
    || (proveedor === 'gemini' ? 'gemini-2.5-flash-lite' : 'gpt-5.6-luna')
  if (!/^[a-zA-Z0-9_.-]{2,100}$/.test(modelo)) {
    throw new AnalysisError('AI_CONFIG', 503, 'Modelo de análisis no válido.')
  }
  const limites = {
    usuario: limiteEntero(env.AI_DAILY_USER_LIMIT, 3, 20),
    global: limiteEntero(env.AI_DAILY_GLOBAL_LIMIT, 30, 200),
  }
  const deps = opts.deps ?? dependencias
  // Consultar y sanitizar ANTES de reservar cupo. Nunca se envía el objeto usuario.
  const contexto = await deps.consolidar(usuario, meses, filtros, undefined, opts.ahora)
  const reserva = await deps.reservar(usuario.id, modelo, limites)
  try {
    // Pruebas con proveedor inyectado; en producción se selecciona por configuración.
    const consultar = opts.deps?.consultar ?? (proveedor === 'gemini' ? consultarAnalisisGemini : deps.consultar)
    const resultado = await consultar(contexto, { apiKey, modelo, enfoque: opts.enfoque ?? 'resumen' })
    await deps.finalizar(reserva.id, 'COMPLETADA', {
      tokensEntrada: resultado.tokens.entrada, tokensSalida: resultado.tokens.salida,
      proveedorId: resultado.proveedorId,
    })
    return {
      resultado: resultado.analisis,
      metadata: { version: 'AI-01.2/v1', generadoEn: contexto.generadoEn,
        periodos: contexto.periodos, filtros: contexto.filtros, modelo,
        indicadoresPermitidos: contexto.fuentes },
    }
  } catch (error) {
    try { await deps.finalizar(reserva.id, 'FALLIDA') }
    catch { /* No revelar la causa de almacenamiento ni ocultar el fallo original. */ }
    if (error instanceof AnalysisError) throw error
    throw new AnalysisError('AI_UNAVAILABLE', 503, 'No fue posible completar el análisis.')
  }
}
