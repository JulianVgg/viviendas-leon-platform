import test from 'node:test'
import assert from 'node:assert/strict'
import { convertSaleTotal, validateExchangeRateInput, validIsoDate } from '../src/modules/agriculture/exchange-rates.rules.ts'

const today = '2026-11-07'
const tasa = { fecha: '2026-11-05', quetzalesPorDolar: '7.750000', fuente: 'Fuente de prueba', referencia: 'Documento interno de prueba' }

test('CIR-10: permite registrar una tasa histórica con fuente y referencia', () => {
  assert.deepEqual(validateExchangeRateInput(tasa, today).data, tasa)
})
test('CIR-10: rechaza tasas nulas, negativas, aproximaciones y valores extra', () => {
  for (const value of ['0', '0.000000', '-7', '7,75', '7.1234567', '5e3', '', 5]) {
    assert.ok(validateExchangeRateInput({ ...tasa, quetzalesPorDolar: value }, today).details.some(d => d.field === 'quetzalesPorDolar'))
  }
  assert.ok(validateExchangeRateInput({ ...tasa, aprox: true }, today).details.some(d => d.field === 'aprox'))
})
test('CIR-10: valida fecha real no futura', () => {
  assert.equal(validIsoDate('2026-02-30'), false)
  assert.equal(validIsoDate('2026-02-28'), true)
  assert.ok(validateExchangeRateInput({ ...tasa, fecha: '2026-11-08' }, today).details.some(d => d.field === 'fecha'))
})
test('CIR-10: exige fuente y referencia verificables', () => {
  assert.ok(validateExchangeRateInput({ ...tasa, fuente: '' }, today).details.some(d => d.field === 'fuente'))
  assert.ok(validateExchangeRateInput({ ...tasa, referencia: '  ' }, today).details.some(d => d.field === 'referencia'))
})
test('CIR-10: 77.50 GTQ a tasa 7.750000 equivale a 10.00 USD', () => {
  assert.deepEqual(convertSaleTotal('77.50', 'GTQ', '7.750000'), { totalGTQ: '77.50', totalUSD: '10.00' })
})
test('CIR-10: 10.00 USD a tasa 7.750000 equivale a 77.50 GTQ', () => {
  assert.deepEqual(convertSaleTotal('10.00', 'USD', '7.750000'), { totalGTQ: '77.50', totalUSD: '10.00' })
})
test('CIR-10: HALF_UP exacto en equivalencias y sin Number', () => {
  assert.deepEqual(convertSaleTotal('0.01', 'USD', '7.500000'), { totalGTQ: '0.08', totalUSD: '0.01' })
  assert.deepEqual(convertSaleTotal('0.01', 'GTQ', '2.000000'), { totalGTQ: '0.01', totalUSD: '0.01' })
})
test('CIR-10: sin moneda válida o tasa verificada no se inventan importes', () => {
  assert.equal(convertSaleTotal('10.00', 'GTQ', '0'), null)
  assert.equal(convertSaleTotal('10.00', 'EUR', '7.75'), null)
  assert.equal(convertSaleTotal('10.0', 'USD', '7.75'), null)
})
