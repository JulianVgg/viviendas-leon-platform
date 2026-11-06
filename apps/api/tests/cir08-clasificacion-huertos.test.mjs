import test from 'node:test'
import assert from 'node:assert/strict'
import { validateGardenClassification, validateGardenInput } from '../dist/modules/agriculture/gardens.validation.js'

const valid = { tipo: 'FAMILIAR', entornoCultivo: 'MACROTUNEL', detalleEntorno: null,
  modalidadesProductivas: ['AGRICOLA', 'AGROFORESTAL'] }

test('CIR-08 distingue tipo, entorno y múltiples modalidades productivas', () => {
  assert.deepEqual(validateGardenClassification(valid).data, valid)
  assert.deepEqual(validateGardenInput({ familiaId: 1, estado: 'ACTIVO', ...valid }).data.modalidadesProductivas,
    ['AGRICOLA', 'AGROFORESTAL'])
})

test('CIR-08 deja sin clasificación los registros históricos y nuevas altas sin datos', () => {
  const parsed = validateGardenInput({ familiaId: 1, estado: 'ACTIVO' })
  assert.ok(parsed.data)
  assert.equal(parsed.data.entornoCultivo, null)
  assert.deepEqual(parsed.data.modalidadesProductivas, [])
})

test('CIR-08 impide clasificaciones inválidas y duplicados', () => {
  for (const modalidadesProductivas of [['AGRICOLA', 'AGRICOLA'], ['OTRA'], 'AGRICOLA', [12]]) {
    assert.equal(validateGardenClassification({ ...valid, modalidadesProductivas }).data, null)
  }
  assert.equal(validateGardenClassification({ ...valid, entornoCultivo: 'BODEGA' }).data, null)
  assert.equal(validateGardenClassification({ ...valid, tipo: 'INVERNADERO' }).data, null)
})

test('CIR-08 exige descripción para Otro y no acepta detalles incongruentes', () => {
  assert.equal(validateGardenClassification({ ...valid, entornoCultivo: 'OTRO' }).data, null)
  assert.equal(validateGardenClassification({ ...valid, detalleEntorno: '  Bodega  ' }).data, null)
  assert.equal(validateGardenClassification({ ...valid, entornoCultivo: 'OTRO', detalleEntorno: '  Camas elevadas  ' }).data.detalleEntorno, 'Camas elevadas')
})

test('CIR-08 no permite actualizaciones parciales silenciosas', () => {
  assert.equal(validateGardenClassification({ tipo: 'FAMILIAR' }).data, null)
  assert.deepEqual(validateGardenClassification(null).data, null)
})
