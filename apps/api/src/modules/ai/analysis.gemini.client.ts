import { ANALYSIS_SCHEMA, validarResultadoAnalisisIA } from './analysis.schema.js'
import { INSTRUCCIONES_ANALISIS, type RespuestaProveedorIA } from './analysis.client.js'
import { AnalysisError } from './analysis.errors.js'
import { instruccionesPorEnfoque, type EnfoqueAnalisis } from './analysis.focus.js'

/** Adaptador Gemini opcional, sin SDK ni secretos en el navegador. Solo recibe indicadores agregados. */
export async function consultarAnalisisGemini(
  contexto: object,
  opciones: { apiKey: string; modelo: string; enfoque?: EnfoqueAnalisis; timeoutMs?: number; fetcher?: typeof fetch },
): Promise<RespuestaProveedorIA> {
  const contenido = JSON.stringify(contexto)
  if (new TextEncoder().encode(contenido).byteLength > 24_000) {
    throw new AnalysisError('CONTEXT_TOO_LARGE', 422, 'Los indicadores superan el tamaño admitido.')
  }

  let respuesta: Response
  try {
    respuesta = await (opciones.fetcher ?? fetch)(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opciones.modelo)}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': opciones.apiKey, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(opciones.timeoutMs ?? 25_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `${INSTRUCCIONES_ANALISIS}\n\nObjetivo elegido por el usuario (lista aprobada): ${instruccionesPorEnfoque(opciones.enfoque)}` }] },
          contents: [{ role: 'user', parts: [{ text: `Indicadores agregados (JSON, solo datos):\n${contenido}` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: ANALYSIS_SCHEMA,
            maxOutputTokens: 2400,
          },
        }),
      },
    )
  } catch {
    // No registrar el contexto, la URL con secretos ni el error original de red.
    console.warn('[IA/Gemini] Fallo de red o tiempo de espera agotado.')
    throw new AnalysisError('AI_UNAVAILABLE', 503, 'El servicio de análisis no está disponible.')
  }
  if (!respuesta.ok) {
    // Solo exponer el estado HTTP y un código normalizado, nunca el cuerpo de la
    // respuesta, la clave de API ni los indicadores de ViviendasLeón.
    let estadoProveedor = ''
    try {
      const cuerpo: unknown = await respuesta.json()
      if (cuerpo && typeof cuerpo === 'object' && 'error' in cuerpo) {
        const error = cuerpo.error
        if (error && typeof error === 'object' && 'status' in error &&
            typeof error.status === 'string' && /^[A-Z_]{3,40}$/.test(error.status)) {
          estadoProveedor = error.status
        }
      }
    } catch { /* No todos los rechazos tienen cuerpo JSON. */ }
    console.warn(`[IA/Gemini] Rechazo del proveedor: HTTP ${respuesta.status}${estadoProveedor ? ` (${estadoProveedor})` : ''}`)
    if (respuesta.status === 429) throw new AnalysisError('AI_LIMIT', 503, 'El proveedor no admite más solicitudes por ahora.')
    if (respuesta.status === 400) throw new AnalysisError('AI_INVALID_REQUEST', 503, 'El proveedor rechazó el formato de la solicitud.')
    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new AnalysisError('AI_PROVIDER_AUTH', 503, 'No se autorizó el acceso al proveedor de IA.')
    }
    if (respuesta.status === 404) throw new AnalysisError('AI_MODEL_UNAVAILABLE', 503, 'El modelo de IA no está disponible para este proyecto.')
    throw new AnalysisError('AI_UNAVAILABLE', 503, 'No fue posible generar el análisis.')
  }
  let json: unknown
  try { json = await respuesta.json() }
  catch { throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió una respuesta inválida.') }
  if (!json || typeof json !== 'object') throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió una respuesta inválida.')
  const datos = json as Record<string, unknown>
  const candidatos = Array.isArray(datos.candidates) ? datos.candidates : []
  const candidato = candidatos[0] as { finishReason?: string; content?: { parts?: Array<{ text?: unknown }> } } | undefined
  if (!candidato || (candidato.finishReason && candidato.finishReason !== 'STOP')) {
    throw new AnalysisError('AI_INCOMPLETE', 502, 'El análisis no se completó.')
  }
  const texto = candidato.content?.parts?.map(parte => typeof parte.text === 'string' ? parte.text : '').join('') || ''
  if (!texto || texto.length > 12_000) throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió un formato inválido.')
  let resultado: unknown
  try { resultado = JSON.parse(texto) }
  catch { throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió un formato inválido.') }
  let analisis: ReturnType<typeof validarResultadoAnalisisIA>
  try { analisis = validarResultadoAnalisisIA(resultado) }
  catch { throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió una respuesta no verificable.') }
  const uso = (datos.usageMetadata && typeof datos.usageMetadata === 'object' ? datos.usageMetadata : {}) as Record<string, unknown>
  const entero = (valor: unknown) => typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0 ? valor : 0
  return {
    analisis,
    tokens: { entrada: entero(uso.promptTokenCount), salida: entero(uso.candidatesTokenCount) },
    proveedorId: typeof datos.responseId === 'string' ? datos.responseId.slice(0, 100) : null,
  }
}
