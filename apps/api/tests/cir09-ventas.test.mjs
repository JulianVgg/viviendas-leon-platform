import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSaleInput, validSaleDate } from '../dist/modules/agriculture/sales.validation.js'
import { availableToSell, guatemalaToday, officialCurrency, saleMoney } from '../dist/modules/agriculture/sales.rules.js'

const input = { registroProduccionId: 10, fechaVenta: '2026-11-05', cantidad: '2.500',
  unidadMedidaId: 4, monedaId: 3, precioUnitario: '12.25' }

test('CIR-09: venta válida mantiene precios y cantidades como texto decimal', () => {
  assert.deepEqual(validateSaleInput(input).data, { ...input, observaciones: null })
  assert.equal(validateSaleInput({ ...input, observaciones: 'Entrega de tomate' }).data.observaciones, 'Entrega de tomate')
})
test('CIR-09: rechaza campos extra, IDs inválidos y fechas inexistentes', () => {
  for (const extra of [{ id: 1 }, { origenProduccion: 'ESTIMACION_VISITA' }, { total: 100 }]) {
    assert.ok(validateSaleInput({ ...input, ...extra }).details.length)
  }
  for (const field of ['registroProduccionId', 'unidadMedidaId', 'monedaId']) {
    assert.ok(validateSaleInput({ ...input, [field]: '1' }).details.some(e => e.field === field))
  }
  assert.equal(validSaleDate('2026-02-30'), false)
  assert.equal(validSaleDate('2026-02-28'), true)
})
test('CIR-09: cantidad positiva sin notación científica y precio con cuatro decimales', () => {
  for (const value of ['-1', '0', '1,5', '5e2', '1.2345', '1000000000', '', 5]) {
    assert.ok(validateSaleInput({ ...input, cantidad: value }).details.some(e => e.field === 'cantidad'))
  }
  for (const value of ['-1', '0', '1,5', '5e2', '1.23456', '1000000000', '', 5]) {
    assert.ok(validateSaleInput({ ...input, precioUnitario: value }).details.some(e => e.field === 'precioUnitario'))
  }
  assert.equal(validateSaleInput({ ...input, precioUnitario: '0.0001' }).details.length, 0)
})
test('CIR-09: limita observaciones a 500 caracteres y 100 palabras', () => {
  assert.ok(validateSaleInput({ ...input, observaciones: 'a'.repeat(501) }).details.some(e => e.field === 'observaciones'))
  assert.ok(validateSaleInput({ ...input, observaciones: Array(101).fill('a').join(' ') }).details.length)
  assert.equal(validateSaleInput({ ...input, observaciones: ' '.repeat(6) }).data.observaciones, null)
})
test('CIR-09: evita vender más de lo cosechado', () => {
  const unit = { codigo: 'KG', nombre: 'Kilogramo', abreviatura: 'kg' }
  assert.equal(availableToSell('10.000', '8.200', '1.800', unit).error, null)
  assert.match(availableToSell('10.000', '8.200', '1.801', unit).error, /disponible/)
  assert.match(availableToSell('10.000', '11', '1', unit).error, /superan/)
})
test('CIR-09: unidades y manojos requieren conteos enteros', () => {
  assert.match(availableToSell('10', '2', '1.5', { codigo: 'UNIDAD', abreviatura: 'u' }).error, /enteros/)
  assert.equal(availableToSell('10', '2', '8', { codigo: 'MANOJO', abreviatura: 'manojo' }).error, null)
  assert.match(availableToSell('10', '2', '8', { codigo: 'LITRO', abreviatura: 'l' }).error, /compatible/)
})
test('CIR-09: cálculo monetario usa precisión decimal', () => {
  assert.equal(saleMoney('0.1', '0.2'), '0.02')
  assert.equal(saleMoney('2.500', '12.25'), '30.63')
  assert.equal(saleMoney('10', '1.005'), '10.05')
  assert.equal(saleMoney('0.001', '0.0001'), '0.00')
})
test('CIR-09: solo monedas oficiales y activas, sin tasa de cambio automática', () => {
  assert.equal(officialCurrency({ codigo: 'GTQ', activo: true }), true)
  assert.equal(officialCurrency({ codigo: 'USD', activo: true }), true)
  assert.equal(officialCurrency({ codigo: 'SYN', activo: true }), false)
  assert.equal(officialCurrency({ codigo: 'USD', activo: false }), false)
})
test('CIR-09: fecha local de Guatemala respeta cambio de día', () => {
  assert.equal(guatemalaToday(new Date('2026-11-07T03:00:00Z')), '2026-11-06')
})
