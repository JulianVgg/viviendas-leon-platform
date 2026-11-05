import test from 'node:test'
import assert from 'node:assert/strict'
import { valorEstimadoCapturaQ } from '../src/features/visits/services/visitProduction.ts'

test('CIR-06: una estimación de visita no crea ingresos ni cosechas', () => {
  const captura = { production: true, priceBasis: 'kg', priceQ: 5, kg: 3.25, units: null }
  assert.equal(valorEstimadoCapturaQ(captura), 16.25)
  assert.equal(valorEstimadoCapturaQ({ ...captura, kg: null }), null)
  assert.equal(valorEstimadoCapturaQ({ ...captura, priceQ: null }), null)
  assert.equal(valorEstimadoCapturaQ({ ...captura, production: false }), null)
  assert.equal(valorEstimadoCapturaQ({ ...captura, priceQ: -1 }), null)
})
