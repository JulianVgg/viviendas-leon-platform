import test from 'node:test'
import assert from 'node:assert/strict'
import { esSuscripcionPushCaducada } from '../dist/modules/notifications/push-sender.service.js'

test('NTF-11 elimina solo endpoints declarados vencidos por el proveedor', () => {
  assert.equal(esSuscripcionPushCaducada({ statusCode: 404 }), true)
  assert.equal(esSuscripcionPushCaducada({ statusCode: 410 }), true)
  for (const codigo of [400, 401, 403, 408, 429, 500, 503]) {
    assert.equal(esSuscripcionPushCaducada({ statusCode: codigo }), false)
  }
  assert.equal(esSuscripcionPushCaducada(null), false)
  assert.equal(esSuscripcionPushCaducada(new Error('Sin conexion')), false)
})
