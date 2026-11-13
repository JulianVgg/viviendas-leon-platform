import { AnalysisError } from './analysis.errors.js'
import { CHAT_SCHEMA, INSTRUCCIONES_CHAT, contenidoPreguntaChat, validarRespuestaChat,
  type MensajeChatIA, type RespuestaChatIA } from './analysis.chat.rules.js'
import type { TokensIA } from './analysis.client.js'

export type ResultadoChatProveedor = { chat: RespuestaChatIA; tokens: TokensIA; proveedorId: string | null }
export type OpcionesChatProveedor = { apiKey: string; modelo: string; timeoutMs?: number; fetcher?: typeof fetch }

function analizarSalida(texto: string): RespuestaChatIA {
  if (!texto || texto.length > 6_000) throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió una respuesta inválida.')
  try { return validarRespuestaChat(JSON.parse(texto)) }
  catch { throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió una respuesta inválida.') }
}
function token(valor: unknown): number {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0 ? valor : 0
}
function falloProveedor(estado: number): never {
  if (estado === 429) throw new AnalysisError('AI_LIMIT', 503, 'El proveedor alcanzó su límite. Prueba más tarde.')
  if (estado === 401 || estado === 403) throw new AnalysisError('AI_PROVIDER_AUTH', 503, 'El proveedor de IA no autorizó la solicitud.')
  if (estado === 404) throw new AnalysisError('AI_MODEL_UNAVAILABLE', 503, 'El modelo no está disponible.')
  throw new AnalysisError('AI_UNAVAILABLE', 503, 'No fue posible responder esta pregunta.')
}

export async function consultarChatGemini(
  contexto: object, pregunta: string, historial: MensajeChatIA[], opts: OpcionesChatProveedor,
): Promise<ResultadoChatProveedor> {
  const ultimo = contenidoPreguntaChat(contexto, pregunta)
  let respuesta: Response
  try {
    respuesta = await (opts.fetcher ?? fetch)(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.modelo)}:generateContent`,
      {
        method: 'POST',
        headers: { 'x-goog-api-key': opts.apiKey, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: INSTRUCCIONES_CHAT }] },
          contents: [
            ...historial.map(m => ({ role: m.rol === 'usuario' ? 'user' : 'model', parts: [{ text: m.texto }] })),
            { role: 'user', parts: [{ text: ultimo }] },
          ],
          generationConfig: { responseMimeType: 'application/json', responseJsonSchema: CHAT_SCHEMA, maxOutputTokens: 2400 },
        }),
      },
    )
  } catch {
    console.warn('[IA/Chat] No se pudo contactar al proveedor.')
    throw new AnalysisError('AI_UNAVAILABLE', 503, 'El asistente no está disponible.')
  }
  if (!respuesta.ok) {
    console.warn(`[IA/Chat] Gemini devolvió HTTP ${respuesta.status}`)
    falloProveedor(respuesta.status)
  }
  let datos: unknown
  try { datos = await respuesta.json() }
  catch { throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió una respuesta inválida.') }
  const obj = datos && typeof datos === 'object' ? datos as Record<string, unknown> : {}
  const candidatos = Array.isArray(obj.candidates) ? obj.candidates : []
  const candidato = candidatos[0] as { finishReason?: string; content?: { parts?: Array<{ text?: unknown }> } } | undefined
  if (!candidato || (candidato.finishReason && candidato.finishReason !== 'STOP')) {
    throw new AnalysisError('AI_INCOMPLETE', 502, 'La respuesta quedó incompleta.')
  }
  const texto = candidato.content?.parts?.map(p => typeof p.text === 'string' ? p.text : '').join('') ?? ''
  const uso = obj.usageMetadata && typeof obj.usageMetadata === 'object' ? obj.usageMetadata as Record<string, unknown> : {}
  return { chat: analizarSalida(texto), tokens: { entrada: token(uso.promptTokenCount), salida: token(uso.candidatesTokenCount) },
    proveedorId: typeof obj.responseId === 'string' ? obj.responseId.slice(0, 100) : null }
}

export async function consultarChatOpenAI(
  contexto: object, pregunta: string, historial: MensajeChatIA[], opts: OpcionesChatProveedor,
): Promise<ResultadoChatProveedor> {
  const ultimo = contenidoPreguntaChat(contexto, pregunta)
  let respuesta: Response
  try {
    respuesta = await (opts.fetcher ?? fetch)('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      body: JSON.stringify({
        model: opts.modelo, store: false, max_output_tokens: 2400, instructions: INSTRUCCIONES_CHAT,
        input: [...historial.map(m => ({ role: m.rol === 'usuario' ? 'user' : 'assistant', content: m.texto })),
          { role: 'user', content: ultimo }],
        text: { format: { type: 'json_schema', name: 'respuesta_institucional', strict: true, schema: CHAT_SCHEMA } },
      }),
    })
  } catch { throw new AnalysisError('AI_UNAVAILABLE', 503, 'El asistente no está disponible.') }
  if (!respuesta.ok) falloProveedor(respuesta.status)
  let datos: unknown
  try { datos = await respuesta.json() }
  catch { throw new AnalysisError('AI_INVALID_RESPONSE', 502, 'La IA devolvió una respuesta inválida.') }
  const obj = datos && typeof datos === 'object' ? datos as Record<string, unknown> : {}
  if (obj.status !== 'completed' || !Array.isArray(obj.output)) {
    throw new AnalysisError('AI_INCOMPLETE', 502, 'La respuesta quedó incompleta.')
  }
  const salidas = (obj.output as unknown[]).filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .filter(item => item.type === 'message').flatMap(item => Array.isArray(item.content) ? item.content : [])
  if (salidas.some(item => item && typeof item === 'object' && (item as { type?: unknown }).type === 'refusal')) {
    throw new AnalysisError('AI_REFUSAL', 502, 'La IA no pudo responder esa pregunta.')
  }
  const texto = salidas.filter((item): item is { type: 'output_text'; text: string } =>
    !!item && typeof item === 'object' && (item as { type?: unknown }).type === 'output_text' &&
    typeof (item as { text?: unknown }).text === 'string').map(item => item.text).join('')
  const uso = obj.usage && typeof obj.usage === 'object' ? obj.usage as Record<string, unknown> : {}
  return { chat: analizarSalida(texto), tokens: { entrada: token(uso.input_tokens), salida: token(uso.output_tokens) },
    proveedorId: typeof obj.id === 'string' ? obj.id.slice(0, 100) : null }
}
