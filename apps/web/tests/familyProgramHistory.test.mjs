import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterParticipations, orderParticipations, participationCategory, participationStateLabel, participationSummary } from '../src/features/families/services/familyProgramHistory.ts'

const fixtures = [
  { id: 5, fechaIngreso: null, estado: null },
  { id: 1, fechaIngreso: '2026-01-01T00:00:00.000Z', estado: 'FINALIZADO' },
  { id: 4, fechaIngreso: '2026-10-19T00:00:00.000Z', estado: 'ACTIVO' },
  { id: 3, fechaIngreso: '2026-10-19T00:00:00.000Z', estado: 'RETIRADO' },
  { id: 2, fechaIngreso: null, estado: 'LEGADO' },
]

test('ordena por fecha de ingreso descendente, deja fechas nulas al final y no altera el arreglo recibido', () => {
  const original = [...fixtures]
  assert.deepEqual(orderParticipations(fixtures).map(({ id }) => id), [4, 3, 1, 5, 2])
  assert.deepEqual(fixtures, original)
})

test('clasifica solo estados documentados y conserva nulos o estados heredados sin inventar su significado', () => {
  assert.equal(participationCategory('ACTIVO'), 'ACTIVOS')
  assert.equal(participationCategory('FINALIZADO'), 'ANTERIORES')
  assert.equal(participationCategory('RETIRADO'), 'ANTERIORES')
  assert.equal(participationCategory(null), 'OTROS')
  assert.equal(participationCategory('LEGADO'), 'OTROS')
  assert.equal(participationStateLabel(null), 'Sin estado definido')
  assert.equal(participationStateLabel('LEGADO'), 'LEGADO')
  assert.equal(participationStateLabel('FINALIZADO'), 'Finalizado')
})

test('contabiliza todas las asociaciones, incluidas anteriores y heredadas', () => {
  assert.deepEqual(participationSummary(fixtures), { total: 5, activos: 1, anteriores: 2, otros: 2 })
  assert.deepEqual(participationSummary([]), { total: 0, activos: 0, anteriores: 0, otros: 0 })
})

test('los filtros no eliminan el historial ni solicitan datos de otro expediente', () => {
  assert.deepEqual(filterParticipations(fixtures, 'ACTIVOS').map(({ id }) => id), [4])
  assert.deepEqual(filterParticipations(fixtures, 'ANTERIORES').map(({ id }) => id), [1, 3])
  assert.deepEqual(filterParticipations(fixtures, 'OTROS').map(({ id }) => id), [5, 2])
  assert.deepEqual(filterParticipations(fixtures, 'TODOS').map(({ id }) => id), [5, 1, 4, 3, 2])
  assert.equal(fixtures.length, 5)
})
