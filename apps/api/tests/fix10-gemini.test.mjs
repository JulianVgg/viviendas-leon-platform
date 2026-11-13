import { test } from 'node:test'
import assert from 'node:assert/strict'
import { consultarAnalisisGemini } from '../dist/modules/ai/analysis.gemini.client.js'

const valid = { resumen: 'Sin cambios relevantes.', hallazgos: [], riesgos: [], recomendaciones: [], limitaciones: [] }

test('Gemini obtiene y valida indicadores JSON sin guardar información personal', async () => {
  let endpoint = ''
  let request
  const result = await consultarAnalisisGemini({ visitas: 3 }, {
    apiKey: 'testing-secret', modelo: 'gemini-2.5-flash-lite',
    fetcher: async (url, options) => {
      endpoint = String(url)
      request = JSON.parse(options.body)
      assert.equal(options.headers['x-goog-api-key'], 'testing-secret')
      return new Response(JSON.stringify({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(valid) }] } }],
        usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 40 },
        responseId: 'safe-1',
      }), { status: 200 })
    },
  })
  assert.match(endpoint, /generateContent$/)
  assert.equal(request.generationConfig.responseMimeType, 'application/json')
  assert.equal(request.contents[0].parts[0].text.includes('visitas'), true)
  assert.deepEqual(result.analisis, valid)
  assert.deepEqual(result.tokens, { entrada: 120, salida: 40 })
})

test('Gemini rechaza datos incompletos o no verificables', async () => {
  await assert.rejects(() => consultarAnalisisGemini({}, {
    apiKey: 'test', modelo: 'gemini-2.5-flash-lite',
    fetcher: async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"resumen":"hola"}' }] } }] }), { status: 200 }),
  }), { code: 'AI_INVALID_RESPONSE' })
})

test('Gemini distingue cuotas del proveedor', async () => {
  await assert.rejects(() => consultarAnalisisGemini({}, {
    apiKey: 'test', modelo: 'gemini-2.5-flash-lite',
    fetcher: async () => new Response('{}', { status: 429 }),
  }), { code: 'AI_LIMIT' })
})
