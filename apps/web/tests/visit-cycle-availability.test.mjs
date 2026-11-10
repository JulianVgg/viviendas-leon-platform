import test from 'node:test'
import assert from 'node:assert/strict'
import { isVisitCycleAvailable } from '../src/features/visits/services/visitCycleAvailability.ts'

const cycle = (fechaSiembra, fechaTrasplante) => ({
  estado: 'ACTIVO', fechaSiembra, fechaTrasplante, fechaFin: null,
  huerto: { familiaId: 4, estado: 'ACTIVO' }, cultivo: { activo: true },
})

test('CIR-06: Frijol #6 es evaluable el 5 de noviembre aunque trasplante en enero', () => {
  assert.equal(isVisitCycleAvailable(cycle('2026-11-04', '2027-01-12'), 4, '2026-11-05'), true)
})

test('CIR-06: Lechuga #4 es evaluable antes de su trasplante de diciembre', () => {
  assert.equal(isVisitCycleAvailable(cycle('2026-10-21', '2026-12-25'), 4, '2026-11-05'), true)
})

test('CIR-06: rechaza siembras futuras o cultivos sin fecha de inicio', () => {
  assert.equal(isVisitCycleAvailable(cycle('2026-11-06', '2027-01-12'), 4, '2026-11-05'), false)
  assert.equal(isVisitCycleAvailable(cycle(null, null), 4, '2026-11-05'), false)
  assert.equal(isVisitCycleAvailable(cycle(null, '2026-11-06'), 4, '2026-11-05'), false)
  assert.equal(isVisitCycleAvailable(cycle(null, '2026-11-05'), 4, '2026-11-05'), false)
})

test('CIR-06: respeta familia, huerto, cultivo, ciclo y fecha de finalización', () => {
  const valid = cycle('2026-10-21', '2026-12-25')
  assert.equal(isVisitCycleAvailable(valid, 5, '2026-11-05'), false)
  assert.equal(isVisitCycleAvailable({ ...valid, estado: 'FINALIZADO' }, 4, '2026-11-05'), false)
  assert.equal(isVisitCycleAvailable({ ...valid, huerto: { familiaId: 4, estado: 'INACTIVO' } }, 4, '2026-11-05'), false)
  assert.equal(isVisitCycleAvailable({ ...valid, cultivo: { activo: false } }, 4, '2026-11-05'), false)
  assert.equal(isVisitCycleAvailable({ ...valid, fechaFin: '2026-11-04' }, 4, '2026-11-05'), false)
})
