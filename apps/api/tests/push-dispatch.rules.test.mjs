import test from 'node:test'
import assert from 'node:assert/strict'
import { estadoTrasFalloPush, payloadPushMinimo } from '../dist/modules/notifications/push-dispatch.rules.js'

test('NTF-12 reintenta fallos temporales con backoff y límite', () => {
  const ahora = new Date('2026-10-28T18:00:00Z')
  for (let i = 0; i < 4; i++) {
    const r = estadoTrasFalloPush(503, i, ahora)
    assert.equal(r.estado, 'PENDIENTE')
    assert.equal(r.proximoIntento?.getTime(), ahora.getTime() + 2 ** i * 60_000)
  }
  assert.equal(estadoTrasFalloPush(503, 4, ahora).estado, 'ERROR')
})

test('NTF-12 no reintenta rechazos permanentes y sí errores de red', () => {
  assert.equal(estadoTrasFalloPush(403, 0, new Date()).estado, 'ERROR')
  assert.equal(estadoTrasFalloPush(null, 0, new Date()).estado, 'PENDIENTE')
  assert.equal(estadoTrasFalloPush(429, 0, new Date()).estado, 'PENDIENTE')
})

test('NTF-12 transmite solamente identificador y ruta', () => {
  const resultado = JSON.parse(payloadPushMinimo(13, '/notificaciones'))
  assert.deepEqual(resultado, { version: 1, notificacionId: 13, url: '/notificaciones' })
  assert.throws(() => payloadPushMinimo(-1, '/notificaciones'))
})
