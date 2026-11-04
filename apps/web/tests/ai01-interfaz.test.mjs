import test from 'node:test'
import assert from 'node:assert/strict'
import { construirSolicitudAnalisis, solicitarAnalisisIA, ErrorAnalisisIA, mensajeErrorAnalisis } from '../src/features/dashboard/services/aiAnalysisService.ts'
import { ETIQUETAS_INDICADORES_IA, nombreIndicadorIA } from '../src/features/dashboard/lib/aiIndicatorLabels.ts'

test('AI-01.3 envía solo los filtros que permite AI-01.2', () => {
  assert.deepEqual(construirSolicitudAnalisis(6, {}), { meses: 6 })
  assert.deepEqual(construirSolicitudAnalisis(3, { comunidadId: 2, responsableId: 7 }), { meses: 3, comunidadId: 2, responsableId: 7 })
  assert.throws(() => construirSolicitudAnalisis(9, {}))
  assert.throws(() => construirSolicitudAnalisis(6, { comunidadId: -1 }))
  assert.throws(() => construirSolicitudAnalisis(6, { responsableId: 1.5 }))
})

test('AI-01.3 usa el endpoint protegido sin enviar datos personales ni prompts', async () => {
  const anterior = globalThis.fetch
  let solicitudes = 0
  try {
    globalThis.fetch = async (url, opciones) => {
      solicitudes++
      assert.equal(url, '/api/v1/dashboard/analisis')
      assert.equal(opciones.method, 'POST')
      assert.equal(opciones.credentials, 'same-origin')
      assert.equal(opciones.cache, 'no-store')
      assert.equal(opciones.headers['Content-Type'], 'application/json')
      assert.deepEqual(JSON.parse(opciones.body), { meses: 12, comunidadId: 5 })
      return new Response(JSON.stringify({ resultado: { resumen: 'Análisis', hallazgos: [], riesgos: [], recomendaciones: [], limitaciones: [] }, metadata: { generadoEn: '2026-11-04T11:00:00Z' } }), { status: 200 })
    }
    const data = await solicitarAnalisisIA(12, { comunidadId: 5 })
    assert.equal(data.resultado.resumen, 'Análisis')
    assert.equal(solicitudes, 1)
  } finally { globalThis.fetch = anterior }
})

test('AI-01.3 muestra la falta de clave como estado controlado, sin datos falsos', async () => {
  const anterior = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'AI_NOT_CONFIGURED', message: 'No configurado' } }), { status: 503 })
    await assert.rejects(solicitarAnalisisIA(6), e => e instanceof ErrorAnalisisIA && e.codigo === 'AI_NOT_CONFIGURED' && /no está configurado/i.test(e.message))
    assert.match(mensajeErrorAnalisis('AI_DAILY_LIMIT', 429), /límite diario/i)
    assert.match(mensajeErrorAnalisis('FORBIDDEN', 403), /permiso/i)
  } finally { globalThis.fetch = anterior }
})

test('AI-01.3 propaga abortos para evitar resultados de filtros antiguos', async () => {
  const anterior = globalThis.fetch
  try {
    globalThis.fetch = async (_url, opciones) => {
      assert.equal(opciones.signal.aborted, true)
      throw new DOMException('Aborted', 'AbortError')
    }
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(solicitarAnalisisIA(6, {}, controller.signal), { name: 'AbortError' })
  } finally { globalThis.fetch = anterior }
})

test('AI-01.3 traduce referencias del contrato de la API a nombres visibles', () => {
  assert.equal(nombreIndicadorIA('agricultura.produccionConfirmada.kg'), 'Producción confirmada (kg)')
  assert.equal(nombreIndicadorIA('alertas.compromisosVencidos'), 'Compromisos vencidos')
  assert.ok(Object.keys(ETIQUETAS_INDICADORES_IA).length >= 20)
  assert.equal(nombreIndicadorIA('nombre.persona'), 'Indicador no disponible')
})
