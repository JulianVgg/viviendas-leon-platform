import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarPreguntaChat, validarHistorialChat, validarRespuestaChat } from '../dist/modules/ai/analysis.chat.rules.js'
import { consultarChatGemini, consultarChatOpenAI } from '../dist/modules/ai/analysis.chat.client.js'
import { responderChatInstitucional } from '../dist/modules/ai/analysis.chat.service.js'

const respuesta = { respuesta: 'Se registraron 23 visitas. Conviene revisar compromisos pendientes.',
  referencias: ['visitas.realizadas', 'alertas.compromisosPendientes'], limitaciones: [] }
const historia = [
  { rol: 'usuario', texto: '¿Cuántas visitas?' },
  { rol: 'asistente', texto: 'Hay 23 visitas realizadas.' },
]

test('Valida preguntas e historial con límites estrictos', () => {
  assert.equal(validarPreguntaChat('  ¿Qué hacer?  '), '¿Qué hacer?')
  for (const pregunta of ['', 'x', 'y'.repeat(601), null, {}, 'hola\u0001']) {
    assert.throws(() => validarPreguntaChat(pregunta), { code: 'INVALID_BODY' })
  }
  assert.deepEqual(validarHistorialChat(historia), historia)
  for (const valor of [Array(9).fill(historia[0]), [historia[0]],
    [{ rol: 'asistente', texto: 'inicio' }, historia[1]],
    [{ rol: 'usuario', texto: 'x', permiso: 'dirección' }, historia[1]],
    [{ rol: 'usuario', texto: 'x'.repeat(1801) }, historia[1]]]) {
    assert.throws(() => validarHistorialChat(valor), { code: 'INVALID_BODY' })
  }
})

test('Rechaza referencias inventadas y contenido con claves extra', () => {
  assert.deepEqual(validarRespuestaChat(respuesta), respuesta)
  assert.throws(() => validarRespuestaChat({ ...respuesta, referencias: ['usuarios.passwordHash'] }))
  assert.throws(() => validarRespuestaChat({ ...respuesta, comando: 'DROP TABLE familia' }))
  assert.throws(() => validarRespuestaChat({ ...respuesta, referencias: ['visitas.realizadas','visitas.realizadas'] }))
})

test('Gemini recibe solo contexto agregado y conversación limitada', async () => {
  let solicitud, cabecera
  const salida = await consultarChatGemini({ visitas: { realizadas: 23 } }, '¿Y ahora qué recomendamos?', historia, {
    modelo: 'gemini-3.5-flash-lite', apiKey: 'clave-ficticia',
    fetcher: async (url, opts) => {
      assert.ok(String(url).startsWith('https://generativelanguage.googleapis.com/'))
      cabecera = opts.headers
      solicitud = JSON.parse(opts.body)
      return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP',
        content: { parts: [{ text: JSON.stringify(respuesta) }] } }],
        usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 75 } }), { status: 200 })
    },
  })
  assert.equal(cabecera['x-goog-api-key'], 'clave-ficticia')
  assert.equal(solicitud.contents.length, 3)
  assert.equal(solicitud.contents[0].role, 'user')
  assert.equal(solicitud.contents[1].role, 'model')
  assert.match(solicitud.contents[2].parts[0].text, /realizadas.*23/)
  assert.match(solicitud.systemInstruction.parts[0].text, /No ejecutes acciones/)
  assert.equal(Object.hasOwn(solicitud.generationConfig, 'temperature'), false)
  assert.deepEqual(salida.chat, respuesta)
  assert.deepEqual(salida.tokens, { entrada: 150, salida: 75 })
})

test('Gemini no acepta respuesta inválida o cuota agotada', async () => {
  await assert.rejects(() => consultarChatGemini({}, 'Consulta válida', [], { modelo: 'gemini', apiKey: 'test',
    fetcher: async () => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP',
      content: { parts: [{ text: JSON.stringify({ ...respuesta, referencias: ['privado'] }) }] } }] }), { status: 200 }),
  }), { code: 'AI_INVALID_RESPONSE' })
  await assert.rejects(() => consultarChatGemini({}, 'Consulta válida', [], { modelo: 'gemini', apiKey: 'test',
    fetcher: async () => new Response('{}', { status: 429 }),
  }), { code: 'AI_LIMIT' })
})

test('OpenAI conserva store=false y valida salida estructurada', async () => {
  let body
  const salida = await consultarChatOpenAI({ familias: { registradas: 25 } }, '¿Qué falta?', [], {
    modelo: 'modelo-prueba', apiKey: 'test',
    fetcher: async (_url, opts) => {
      body = JSON.parse(opts.body)
      return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [
        { type: 'output_text', text: JSON.stringify(respuesta) } ] }] }), { status: 200 })
    },
  })
  assert.equal(body.store, false)
  assert.equal(body.text.format.type, 'json_schema')
  assert.deepEqual(salida.chat, respuesta)
})

test('Servicio respeta autorización, cupos y evita guardar historial', async () => {
  let vecesConsolidar = 0, vecesReservar = 0, finalEstado
  const usuario = { id: 42, roles: ['Dirección general'] }
  const deps = {
    consolidar: async () => { vecesConsolidar++; return { generadoEn: '2026-11-12T12:00:00.000Z', periodos: {}, filtros: {}, fuentes: ['MON-01'] } },
    reservar: async () => { vecesReservar++; return { id: 'uuid-prueba' } },
    finalizar: async (_id, estado) => { finalEstado = estado },
    consultarGemini: async () => ({ chat: respuesta, tokens: { entrada: 2, salida: 3 }, proveedorId: null }),
    consultarOpenAI: async () => { throw new Error('No debe usar OpenAI') },
  }
  await assert.rejects(() => responderChatInstitucional({ ...usuario, roles: ['Técnico de campo'] }, 6,
    '¿Qué pasa?', [], {}, { deps, env: { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'ficticia' } }), { code: 'FORBIDDEN' })
  assert.equal(vecesConsolidar, 0)
  const resultado = await responderChatInstitucional(usuario, 6, '¿Qué pasa?', historia, {},
    { deps, env: { AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'ficticia' } })
  assert.equal(resultado.resultado.respuesta, respuesta.respuesta)
  assert.equal(vecesConsolidar, 1)
  assert.equal(vecesReservar, 1)
  assert.equal(finalEstado, 'COMPLETADA')
})
