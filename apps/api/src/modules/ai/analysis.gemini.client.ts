import { diagnosticarResultadoAnalisisIA, GEMINI_ANALYSIS_SCHEMA, validarResultadoAnalisisIA } from './analysis.schema.js'
import { INSTRUCCIONES_ANALISIS, type RespuestaProveedorIA } from './analysis.client.js'
import { AnalysisError } from './analysis.errors.js'
import { instruccionesPorEnfoque, type EnfoqueAnalisis } from './analysis.focus.js'

const MAX_INTENTOS = 2
const HTTP_REINTENTABLES = new Set([408, 500, 502, 503, 504])

function falloGemini(status: number): never {
  if (status === 429) throw new AnalysisError('AI_LIMIT', 503, 'El proveedor no admite más solicitudes por ahora.')
  if (status === 400) throw new AnalysisError('AI_INVALID_REQUEST', 503, 'El proveedor rechazó el formato de la solicitud.')
  if (status === 401 || status === 403) {
    throw new AnalysisError('AI_PROVIDER_AUTH', 503, 'No se autorizó el acceso al proveedor de IA.')
  }
  if (status === 404) throw new AnalysisError('AI_MODEL_UNAVAILABLE', 503, 'El modelo de IA no está disponible para este proyecto.')
  throw new AnalysisError('AI_UNAVAILABLE', 503, 'No fue posible generar el análisis.')
}

function estadoSeguroProveedor(valor: unknown): string {
  if (!valor || typeof valor !== 'object' || !('error' in valor)) return ''
  const error = valor.error
  if (!error || typeof error !== 'object' || !('status' in error)) return ''
  return typeof error.status === 'string' && /^[A-Z_]{3,40}$/.test(error.status) ? error.status : ''
}

function extraerResultado(datos: unknown): RespuestaProveedorIA {
  if (!datos || typeof datos !== 'object') throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió una respuesta inválida.')
  const cuerpo = datos as Record<string, unknown>
  const candidatos = Array.isArray(cuerpo.candidates) ? cuerpo.candidates : []
  const candidato = candidatos[0] as { finishReason?: string; content?: { parts?: Array<{ text?: unknown }> } } | undefined
  // No reintentar rechazos de seguridad, solo salidas interrumpidas por tamaño.
  if (!candidato || (candidato.finishReason && candidato.finishReason !== 'STOP')) {
    if (candidato?.finishReason === 'MAX_TOKENS') {
      throw new AnalysisError('AI_INCOMPLETE', 502, 'El análisis se interrumpió por longitud.')
    }
    throw new AnalysisError('AI_REFUSAL', 502, 'El análisis no se completó.')
  }
  const texto = candidato.content?.parts?.map(p => typeof p.text === 'string' ? p.text : '').join('') || ''
  if (!texto || texto.length > 12_000) {
    throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió un formato inválido.')
  }
  let resultado: unknown
  try { resultado = JSON.parse(texto) }
  catch { throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió un formato inválido.') }
  const motivo = diagnosticarResultadoAnalisisIA(resultado)
  if (motivo) {
    // Categoría fija de validación, nunca contenido, nombres ni valores de indicadores.
    console.warn(`[IA/Gemini] Contrato de análisis rechazado: ${motivo}`)
    throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió una respuesta no verificable.')
  }
  const uso = (cuerpo.usageMetadata && typeof cuerpo.usageMetadata === 'object' ? cuerpo.usageMetadata : {}) as Record<string, unknown>
  const entero = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : 0
  return {
    analisis: validarResultadoAnalisisIA(resultado),
    tokens: { entrada: entero(uso.promptTokenCount), salida: entero(uso.candidatesTokenCount) },
    proveedorId: typeof cuerpo.responseId === 'string' ? cuerpo.responseId.slice(0, 100) : null,
  }
}

/** Gemini: un reintento acotado, con contrato estricto. No persiste contenido de prompts ni respuestas. */
export async function consultarAnalisisGemini(
  contexto: object,
  opciones: { apiKey: string; modelo: string; enfoque?: EnfoqueAnalisis; timeoutMs?: number; fetcher?: typeof fetch },
): Promise<RespuestaProveedorIA> {
  const contenido = JSON.stringify(contexto)
  if (new TextEncoder().encode(contenido).byteLength > 24_000) {
    throw new AnalysisError('CONTEXT_TOO_LARGE', 422, 'Los indicadores superan el tamaño admitido.')
  }

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    const reintento = intento > 0
    const instrucciones = `${INSTRUCCIONES_ANALISIS}\n\nObjetivo elegido por el usuario (lista aprobada): ${instruccionesPorEnfoque(opciones.enfoque)}` +
      (reintento ? '\n\nCorrige el formato: respeta todas las longitudes, usa las referencias exactas del esquema y no agregues campos adicionales.' : '')
    let respuesta: Response
    try {
      respuesta = await (opciones.fetcher ?? fetch)(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opciones.modelo)}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': opciones.apiKey, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(opciones.timeoutMs ?? 25_000),
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: instrucciones }] },
            contents: [{ role: 'user', parts: [{ text: `Indicadores agregados (JSON, solo datos):\n${contenido}` }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              responseJsonSchema: GEMINI_ANALYSIS_SCHEMA,
              maxOutputTokens: 3200,
            },
          }),
        },
      )
    } catch {
      // Ni el error original de fetch ni la URL con credenciales se registran.
      console.warn('[IA/Gemini] Error de conexión o tiempo de espera agotado.')
      if (!reintento) { await new Promise(resolve => setTimeout(resolve, 350)); continue }
      throw new AnalysisError('AI_UNAVAILABLE', 503, 'El servicio de análisis no está disponible.')
    }
    if (!respuesta.ok) {
      let estado = ''
      try { estado = estadoSeguroProveedor(await respuesta.json()) } catch { /* cuerpo opcional */ }
      console.warn(`[IA/Gemini] Proveedor HTTP ${respuesta.status}${estado ? ` (${estado})` : ''}`)
      if (HTTP_REINTENTABLES.has(respuesta.status) && !reintento) {
        await new Promise(resolve => setTimeout(resolve, 350))
        continue
      }
      falloGemini(respuesta.status)
    }
    let json: unknown
    try { json = await respuesta.json() }
    catch {
      if (!reintento) { console.warn('[IA/Gemini] JSON del proveedor incompleto.'); continue }
      throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió una respuesta inválida.')
    }
    try { return extraerResultado(json) }
    catch (error) {
      if (error instanceof AnalysisError &&
          (error.code === 'AI_INVALID_RESPONSE' || error.code === 'AI_INCOMPLETE') && !reintento) {
        console.warn(`[IA/Gemini] Se reintentará salida: ${error.code}`)
        continue
      }
      throw error
    }
  }
  throw new AnalysisError('AI_UNAVAILABLE', 503, 'No fue posible generar el análisis.')
}
