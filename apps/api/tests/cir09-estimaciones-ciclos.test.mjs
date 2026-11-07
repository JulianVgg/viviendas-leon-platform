import { test } from 'node:test'
import assert from 'node:assert/strict'
import { estimacionDeCaptura } from '../dist/modules/agriculture/visit-estimate.js'

const crop = { cicloCultivoId: 6, production: true, units: 63, kg: 21.055, priceBasis: 'kg', priceQ: 12 }

test('solo muestra estimación del ciclo seleccionado y no genera venta', () => {
  const data = { crops: [crop, { ...crop, cicloCultivoId: 8, units: 9 }] }
  assert.deepEqual(estimacionDeCaptura(data, 6), {
    unidades: 63, kg: 21.055, precioReferenciaQ: 12, precioPor: 'kg', valorEstimadoQ: 252.66,
  })
  assert.equal(estimacionDeCaptura(data, 77), null)
})
test('capturas anteriores sin origenProduccion mantienen su estimación', () => {
  assert.equal(estimacionDeCaptura({ crops: [{ ...crop, priceBasis: 'unidad', priceQ: 1 }] }, 6)?.valorEstimadoQ, 63)
})
test('sin estimación, valores faltantes o ciclos duplicados no inventa importes', () => {
  assert.equal(estimacionDeCaptura({ crops: [{ ...crop, production: false }] }, 6), null)
  assert.equal(estimacionDeCaptura({ crops: [crop, crop] }, 6), null)
  assert.equal(estimacionDeCaptura({ crops: [{ ...crop, kg: null }] }, 6)?.valorEstimadoQ, null)
  assert.equal(estimacionDeCaptura(null, 6), null)
})
