import test from 'node:test'
import assert from 'node:assert/strict'
import { buildFamilyVisitCoverage } from '../src/features/visits/services/familyVisitCoverage.ts'

const garden = {
  id: 10, familiaId: 5, estado: 'ACTIVO',
  familia: { nombreReferencia: 'Familia López', estado: 'ACTIVA', comunidad: { nombre: 'Paxub' } },
}

test('cita vencida conserva su id para abrir reprogramación, sin crear otra visita', () => {
  const planning = [{ familyId: 5, lastCompleted: null, scheduled: [
    { id: 34, date: '2026-11-19', responsibleUserId: 2, responsibleName: 'Técnico' },
  ] }]
  const [result] = buildFamilyVisitCoverage([garden, { ...garden, id: 11 }], planning, [], '2026-11-20')
  assert.equal(result.status, 'vencida')
  assert.equal(result.overdueVisitId, 34)
  assert.equal(result.overdueResponsibleUserId, 2)
})

test('cita futura se marca agendada y no activa reprogramación', () => {
  const planning = [{ familyId: 5, lastCompleted: null, scheduled: [
    { id: 35, date: '2026-11-27', responsibleUserId: 2, responsibleName: 'Técnico' },
  ] }]
  const [result] = buildFamilyVisitCoverage([garden], planning, [], '2026-11-20')
  assert.equal(result.status, 'agendada')
  assert.equal(result.overdueVisitId, null)
})

test('una cita vencida tiene prioridad sobre una futura programada automáticamente', () => {
  const planning = [{ familyId: 5, lastCompleted: null, scheduled: [
    { id: 36, date: '2026-11-20', responsibleUserId: 2, responsibleName: 'Técnico' },
    { id: 37, date: '2026-11-27', responsibleUserId: 2, responsibleName: 'Técnico' },
  ] }]
  const [result] = buildFamilyVisitCoverage([garden], planning, [], '2026-11-21')
  assert.equal(result.status, 'vencida')
  assert.equal(result.overdueVisitId, 36)
  assert.equal(result.scheduledDate, '2026-11-27')
})
