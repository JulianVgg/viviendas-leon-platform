import test from 'node:test'
import assert from 'node:assert/strict'
import { parseProductionId, validateProductionInput } from '../dist/modules/agriculture/production.validation.js'

const base = { cicloCultivoId: 5, fechaCosecha: '2026-10-25', cantidad: '12.750', unidadMedidaId: 3 }

test('AGR-05: valida la cosecha y conserva un decimal exacto como texto', () => {
  assert.deepEqual(validateProductionInput(base).data, { ...base, observaciones: null })
  assert.equal(validateProductionInput({ ...base, cantidad: '0.001' }).details.length, 0)
  assert.equal(validateProductionInput({ ...base, cantidad: '999999999.999' }).details.length, 0)
})

test('AGR-05: rechaza fechas inexistentes, identificadores incorrectos y campos extra', () => {
  assert.ok(validateProductionInput({ ...base, fechaCosecha: '2026-02-30' }).details.some(e => e.field === 'fechaCosecha'))
  assert.ok(validateProductionInput({ ...base, cicloCultivoId: '5' }).details.some(e => e.field === 'cicloCultivoId'))
  assert.ok(validateProductionInput({ ...base, unidadMedidaId: 0 }).details.some(e => e.field === 'unidadMedidaId'))
  assert.ok(validateProductionInput({ ...base, id: 10 }).details.some(e => e.field === 'id'))
  assert.equal(parseProductionId('8'), 8)
  assert.equal(parseProductionId('2147483648'), null)
})

test('AGR-05: no admite cantidad cero, negativa, excesiva ni con coma decimal', () => {
  for (const cantidad of ['0', '-5', '2,5', '1.2345', '1000000000', '1e10', '']) {
    assert.ok(validateProductionInput({ ...base, cantidad }).details.some(e => e.field === 'cantidad'))
  }
  assert.ok(validateProductionInput({ ...base, observaciones: 'x'.repeat(2001) }).details.some(e => e.field === 'observaciones'))
})
