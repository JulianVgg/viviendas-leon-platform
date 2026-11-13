import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFamilyVisitCoverage, filterFamilyVisitCoverage } from '../src/features/visits/services/familyVisitCoverage.ts'

const today = '2026-11-13'
const garden = (familyId, name, community = 'Ciénaga Grande', active = true) => ({
  id: familyId * 10, familiaId: familyId, estado: active ? 'ACTIVO' : 'INACTIVO',
  familia: { nombreReferencia: name, estado: 'ACTIVA', comunidad: { nombre: community } },
})
const visit = (familyId, date, status) => ({ familyId, date, status })

test('una familia con varios huertos se contabiliza una sola vez y excluye huertos inactivos', () => {
  const rows = buildFamilyVisitCoverage([
    garden(1, 'Ana'), {...garden(1, 'Ana'), id: 999}, garden(2, 'Berta', 'Paxub', false),
  ], [], [], today)
  assert.deepEqual(rows.map(v => v.familyId), [1])
})

test('distingue vencida, por agendar, agendada y visitada según registros reales de 8 días', () => {
  const gardens = [garden(1, 'Ana'), garden(2, 'Berta'), garden(3, 'Carla'), garden(4, 'Diana')]
  const planning = [
    { familyId: 1, lastCompleted: null, scheduled: [{ id: 1, date: '2026-11-12' }] },
    { familyId: 2, lastCompleted: '2026-11-05', scheduled: [] },
    { familyId: 3, lastCompleted: null, scheduled: [{ id: 3, date: '2026-11-15' }] },
    { familyId: 4, lastCompleted: '2026-11-06', scheduled: [] },
  ]
  const rows = buildFamilyVisitCoverage(gardens, planning, [], today)
  assert.deepEqual(Object.fromEntries(rows.map(v => [v.familyId, v.status])), {
    2: 'pendiente', 1: 'vencida', 3: 'agendada', 4: 'realizada',
  })
  assert.equal(rows.find(v => v.familyId === 3).scheduledDate, '2026-11-15')
})

test('las visitas locales cuentan y las canceladas no sustituyen una cita real', () => {
  const rows = buildFamilyVisitCoverage([garden(1, 'Ana'), garden(2, 'Berta')], [], [
    visit(1, '2026-11-12', 'REALIZADA'), visit(2, '2026-11-14', 'CANCELADA'),
  ], today)
  assert.equal(rows.find(v => v.familyId === 1).status, 'realizada')
  assert.equal(rows.find(v => v.familyId === 2).status, 'pendiente')
})

test('filtra pendientes y vencidas, estados específicos y búsqueda sin tildes', () => {
  const rows = buildFamilyVisitCoverage([
    garden(1, 'María Xocop', 'Ciénaga Grande'), garden(2, 'Juan', 'Paxub'),
  ], [{ familyId: 1, lastCompleted: null, scheduled: [{ id: 1, date: '2026-11-12' }] }], [], today)
  assert.equal(filterFamilyVisitCoverage(rows, 'faltan', '').length, 2)
  assert.equal(filterFamilyVisitCoverage(rows, 'vencida', '').length, 1)
  assert.equal(filterFamilyVisitCoverage(rows, 'pendiente', '').length, 1)
  assert.equal(filterFamilyVisitCoverage(rows, 'todas', 'cienaga').length, 1)
  assert.equal(filterFamilyVisitCoverage(rows, 'todas', 'MARIA').length, 1)
})
