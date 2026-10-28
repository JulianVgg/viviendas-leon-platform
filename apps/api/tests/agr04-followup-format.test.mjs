import assert from 'node:assert/strict'
import test from 'node:test'
import { buildEvaluationObservations, parseEvaluationObservations } from '../dist/modules/agriculture/followup-format.js'

test('AGR-04: conserva cantidad observada y observaciones especificas', () => {
  const stored = buildEvaluationObservations(43, 'Crecimiento adecuado.\nDos hojas amarillentas.')
  assert.equal(stored, 'Plantas observadas: 43.\nCrecimiento adecuado.\nDos hojas amarillentas.')
  assert.deepEqual(parseEvaluationObservations(stored), {
    cantidadPlantasObservadas: 43,
    observaciones: 'Crecimiento adecuado.\nDos hojas amarillentas.',
  })
})

test('AGR-04: compatible con evaluaciones existentes y observaciones opcionales', () => {
  assert.deepEqual(parseEvaluationObservations('Plantas observadas: 12.'), {
    cantidadPlantasObservadas: 12, observaciones: null,
  })
  assert.deepEqual(parseEvaluationObservations(buildEvaluationObservations(null, 'Floracion inicial')), {
    cantidadPlantasObservadas: null, observaciones: 'Floracion inicial',
  })
  assert.deepEqual(parseEvaluationObservations(null), {
    cantidadPlantasObservadas: null, observaciones: null,
  })
  assert.equal(buildEvaluationObservations(null, undefined), null)
})
