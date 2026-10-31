import test from 'node:test'
import assert from 'node:assert/strict'
import { detectarAvisoNuevo } from '../src/features/notifications/utils/notificationToastRules.ts'

test('el primer sondeo establece referencia sin anunciar notificaciones antiguas', () => {
  assert.deepEqual(detectarAvisoNuevo(null,[{id: 21},{id: 20}]),{ultimoId:21,nuevo:null})
})
test('solo muestra la notificación nueva con mayor id y no repite avisos', () => {
  const resultado = detectarAvisoNuevo(21,[{id:23,titulo:'Nueva'},{id:22,titulo:'Anterior'},{id:21}])
  assert.equal(resultado.nuevo.id, 23)
  assert.equal(resultado.ultimoId,23)
  assert.equal(detectarAvisoNuevo(resultado.ultimoId,[{id:23},{id:22}]).nuevo, null)
})
test('si se leen todas, mantiene el máximo ID conocido y detecta las futuras', () => {
  assert.deepEqual(detectarAvisoNuevo(23,[]),{ultimoId:23,nuevo:null})
  assert.equal(detectarAvisoNuevo(23,[{id:24}]).nuevo.id,24)
})
