import test from 'node:test'
import assert from 'node:assert/strict'
import { validateInstitutionalRate, equivalenciaUsd } from '../dist/modules/reports/institutional-rate.rules.js'
import { validateGardenInput, validateGardenClassification } from '../dist/modules/agriculture/gardens.validation.js'

const garden = {
  familiaId: 12, nombre: null, tipo: 'FAMILIAR', entornoCultivo: 'MACROTUNEL',
  detalleEntorno: null, modalidadesProductivas: ['AGRICOLA', 'PECUARIO', 'AGROPECUARIO', 'AGROINDUSTRIA'],
  fechaInicio: '2026-11-20', estado: 'ACTIVO', observaciones: null,
}

test('tasa institucional: valores válidos y rechazo de entradas peligrosas', () => {
  assert.equal(validateInstitutionalRate('7.6'), '7.6')
  assert.equal(validateInstitutionalRate('7.600000'), '7.600000')
  for (const invalid of ['0', '0.000001', '101', '-7.6', '7,6', '1e2', 7.6, '7.1234567', '']) {
    assert.equal(validateInstitutionalRate(invalid), null, String(invalid))
  }
})

test('equivalencia exacta: Q 6,910.10 / 7.6 = USD 909.22', () => {
  assert.equal(equivalenciaUsd('6910.10', '0.00', '7.6'), '909.22')
  assert.equal(equivalenciaUsd('760.00', '20.00', '7.6'), '120.00')
  assert.equal(equivalenciaUsd('0.00', '12.50', '7.6'), '12.50')
  assert.equal(equivalenciaUsd('0.04', '0.00', '8.0'), '0.01')
  assert.throws(() => equivalenciaUsd('1.2', '0.00', '7.6'))
})

test('nuevas modalidades se admiten y Comunitario no se puede crear', () => {
  assert.deepEqual(validateGardenInput(garden).details, [])
  assert.ok(validateGardenInput({ ...garden, tipo: 'COMUNITARIO' }).details.some(item => item.field === 'tipo'))
  assert.ok(validateGardenInput({ ...garden, tipo: null }).details.some(item => item.field === 'tipo'))
  assert.ok(validateGardenInput({ ...garden, modalidadesProductivas: ['INVENTADA'] }).details.some(item => item.field === 'modalidadesProductivas'))
  // Las clasificaciones comunitarias históricas siguen editables.
  assert.equal(validateGardenClassification({ tipo: 'COMUNITARIO', entornoCultivo: 'MIXTO', detalleEntorno: null, modalidadesProductivas: [] }).details.length, 0)
})
