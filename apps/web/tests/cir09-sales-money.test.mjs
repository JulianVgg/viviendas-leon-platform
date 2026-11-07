import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSalePreview } from '../src/features/agriculture/services/salesMoney.ts'

test('CIR-09: vista previa coincide con el redondeo decimal del backend', () => {
  assert.equal(calculateSalePreview('0.1', '0.2'), '0.02')
  assert.equal(calculateSalePreview('2.500', '12.25'), '30.63')
  assert.equal(calculateSalePreview('10', '1.005'), '10.05')
})
test('CIR-09: no acepta formatos inválidos ni importes nulos', () => {
  assert.equal(calculateSalePreview('1.2345', '2'), null)
  assert.equal(calculateSalePreview('2', '-1'), null)
  assert.equal(calculateSalePreview('0.001', '0.0001'), null)
})
