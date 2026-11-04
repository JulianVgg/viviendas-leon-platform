import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  consultarPreferenciasEnvioPush, guardarPreferenciasEnvioPush,
} from '../src/features/notifications/services/pushService.ts'

const original = globalThis.fetch
afterEach(() => { globalThis.fetch = original })

test('NTF-12 consulta preferencias del usuario autenticado sin pasar un ID', async () => {
  const preferencias = { habilitadas: true, silencioInicio: null, silencioFin: null }
  globalThis.fetch = async (url, opciones) => {
    assert.equal(url, '/api/v1/notificaciones/push/preferencias')
    assert.equal(opciones.credentials, 'same-origin')
    assert.equal(opciones.cache, 'no-store')
    return { ok: true, json: async () => preferencias }
  }
  assert.deepEqual(await consultarPreferenciasEnvioPush(), preferencias)
})

test('NTF-12 guarda horarios por PUT, JSON y cabecera antifalsificación', async () => {
  const preferencias = { habilitadas: false, silencioInicio: '22:00', silencioFin: '07:00' }
  globalThis.fetch = async (url, opciones) => {
    assert.equal(url, '/api/v1/notificaciones/push/preferencias')
    assert.equal(opciones.method, 'PUT')
    assert.equal(opciones.headers['X-Requested-With'], 'XMLHttpRequest')
    assert.equal(opciones.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(opciones.body), preferencias)
    return { ok: true, json: async () => preferencias }
  }
  assert.deepEqual(await guardarPreferenciasEnvioPush(preferencias), preferencias)
})
