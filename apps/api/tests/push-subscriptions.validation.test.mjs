import test from 'node:test'
import assert from 'node:assert/strict'
import { validarSuscripcionPush } from '../dist/modules/notifications/push-subscriptions.service.js'

const p256dh = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url')
const auth = Buffer.alloc(16, 2).toString('base64url')
const valido = (endpoint = 'https://fcm.googleapis.com/fcm/send/token-valido') => ({
  subscription: { endpoint, keys: { p256dh, auth } },
  navegador: 'Chrome',
})

test('NTF-11 acepta un endpoint confiable con claves Web Push válidas', () => {
  assert.deepEqual(validarSuscripcionPush(valido()), {
    endpoint: 'https://fcm.googleapis.com/fcm/send/token-valido',
    p256dh, auth, navegador: 'Chrome',
  })
})

test('NTF-11 rechaza endpoints ajenos o inseguros', () => {
  for (const endpoint of [
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://localhost:3000/api',
    'https://fcm.googleapis.com.ejemplo.com/fcm/send/abc',
    'https://web.push.apple.com@ejemplo.com/send/abc',
  ]) {
    assert.equal(validarSuscripcionPush(valido(endpoint)), null)
  }
})

test('NTF-11 rechaza claves o formatos inválidos', () => {
  assert.equal(validarSuscripcionPush({}), null)
  assert.equal(validarSuscripcionPush({ ...valido(), navegador: 7 }), null)
  assert.equal(validarSuscripcionPush({
    ...valido(), subscription: { ...valido().subscription, keys: { p256dh: 'corta', auth } },
  }), null)
})
