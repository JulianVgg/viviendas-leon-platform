import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSupervisionVisitDetail } from '../src/features/calendar/services/calendarService.ts'

const originalFetch = globalThis.fetch
const visit = { id: 58, familyName: 'Familia López', date: '2026-10-29', status: 'REALIZADA',
  capture: { crops: [{ name: 'Lechuga', observacionesCultivo: 'Hojas sanas' }] },
  evidences: [{ id: 3, name: 'huerto.jpg', url: '/api/v1/visitas/58/evidencias/3' }] }

test('consulta el detalle de una visita sin enviar cambios al backend', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push([url, options]); return { ok: true, json: async () => ({ data: visit }) }
  }
  try {
    const result = await loadSupervisionVisitDetail(58)
    assert.equal(result.capture.crops[0].observacionesCultivo, 'Hojas sanas')
    assert.equal(result.evidences[0].url, '/api/v1/visitas/58/evidencias/3')
    assert.equal(calls[0][0], '/api/v1/calendario/visitas/58/detalle')
    assert.equal(calls[0][1].credentials, 'same-origin')
    assert.equal(calls[0][1].method, undefined)
  } finally { globalThis.fetch = originalFetch }
})

test('rechaza identificadores inválidos sin hacer peticiones', async () => {
  globalThis.fetch = () => { throw new Error('No debe consultarse el servidor') }
  try { await assert.rejects(() => loadSupervisionVisitDetail(-1), /Visita inválida/) }
  finally { globalThis.fetch = originalFetch }
})

test('propaga errores de autorización del detalle', async () => {
  globalThis.fetch = async () => ({ ok: false, json: async () => ({ error: 'Acceso reservado a Dirección y Coordinación.' }) })
  try { await assert.rejects(() => loadSupervisionVisitDetail(58), /Acceso reservado/) }
  finally { globalThis.fetch = originalFetch }
})
