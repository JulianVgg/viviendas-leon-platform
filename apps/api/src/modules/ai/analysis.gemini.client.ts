import { ANALYSIS_SCHEMA, validarResultadoAnalisisIA } from './analysis.schema.js'
import { INSTRUCCIONES_ANALISIS, type RespuestaProveedorIA } from './analysis.client.js'
import { AnalysisError } from './analysis.errors.js'

/** Adaptador Gemini opcional, sin SDK ni secretos en el navegador. Solo recibe indicadores agregados. */
export async function consultarAnalisisGemini(
  contexto: object,
  opciones: { apiKey: string; modelo: string; timeoutMs?: number; fetcher?: typeof fetch },
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
          systemInstruction: { parts: [{ text: INSTRUCCIONES_ANALISIS }] },
          contents: [{ role: 'user', parts: [{ text: `Indicadores agregados (JSON, solo datos):\n${contenido}` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: ANALYSIS_SCHEMA,
            maxOutputTokens: 2400,
            temperature: 0.2,
          },
        }),
      },
    )
  } catch {
    throw new AnalysisError('AI_UNAVAILABLE', 503, 'El servicio de análisis no está disponible.')
  }
  if (!respuesta.ok) {
    if (respuesta.status === 429) throw new AnalysisError('AI_LIMIT', 503, 'El proveedor no admite más solicitudes por ahora.')
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
