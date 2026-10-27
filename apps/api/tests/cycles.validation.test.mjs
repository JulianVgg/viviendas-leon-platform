import test from 'node:test'
import assert from 'node:assert/strict'
import { validateCycleInput, parseCycleId } from '../dist/modules/agriculture/cycles.validation.js'

const base = { huertoId: 2, cultivoId: 3, fechaSiembra: '2026-10-10', cantidadPlantas: 45 }
test('AGR-03: crea entrada válida sin requerir ambas fechas', () => {
  assert.deepEqual(validateCycleInput(base).data, {
    ...base, fechaTrasplante: null, observaciones: null,
  })
  assert.equal(validateCycleInput({ huertoId: 2, cultivoId: 3, fechaTrasplante: '2026-10-20' }).details.length, 0)
})
test('AGR-03: rechaza fechas inexistentes, trasplantes anteriores y ciclos sin fecha', () => {
  assert.ok(validateCycleInput({ ...base, fechaSiembra: '2026-02-30' }).details.length)
  assert.ok(validateCycleInput({ ...base, fechaTrasplante: '2026-10-09' }).details.some(x => x.field === 'fechaTrasplante'))
  assert.ok(validateCycleInput({ huertoId: 2, cultivoId: 3 }).details.some(x => x.field === 'fechaSiembra'))
})
test('AGR-03: rechaza datos extra, IDs inválidos y cantidades erróneas', () => {
  assert.ok(validateCycleInput({ ...base, id: 9, estado: 'FINALIZADO' }).details.length)
  assert.ok(validateCycleInput({ ...base, cantidadPlantas: 0 }).details.some(x => x.field === 'cantidadPlantas'))
  assert.ok(validateCycleInput({ ...base, cultivoId: '3' }).details.some(x => x.field === 'cultivoId'))
  assert.equal(parseCycleId('1'), 1)
  assert.equal(parseCycleId('2147483648'), null)
})
