import test from 'node:test'
import assert from 'node:assert/strict'
import { etiquetaValidacion, colorValidacion, resumenAccion } from '../src/features/reports/services/semesterReviewPresentation.ts'

test('CIR-15: estado validado se presenta como éxito', () => {
  assert.equal(etiquetaValidacion('VALIDADO'), 'Validado')
  assert.equal(colorValidacion('VALIDADO'), 'success')
})
test('CIR-15: cambios posteriores se muestran como alerta', () => {
  assert.equal(etiquetaValidacion('CAMBIOS_POSTERIORES'), 'Cambios posteriores')
  assert.equal(colorValidacion('CAMBIOS_POSTERIORES'), 'error')
})
test('CIR-15: eventos tienen descripción legible', () => {
  assert.equal(resumenAccion('REAPERTURA'), 'Revisión reabierta')
})
