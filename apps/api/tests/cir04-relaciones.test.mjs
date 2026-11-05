import test from 'node:test'
import assert from 'node:assert/strict'
import { duplicatePlantingFilter, visitCycleProblem } from '../dist/modules/agriculture/cycles.relations.js'

const d = (date) => date ? new Date(`${date}T00:00:00.000Z`) : null
const cycle = () => ({
  estado: 'ACTIVO', fechaSiembra: d('2026-10-10'), fechaTrasplante: d('2026-10-20'), fechaFin: null,
  huerto: { familiaId: 7, estado: 'ACTIVO' }, cultivo: { nombre: 'Tomate', activo: true },
})
const input = () => ({ familiaId: 7, fechaVisita: '2026-10-21', nombreCultivo: 'Tomate' })

test('CIR-04: clave duplicada usa huerto, cultivo y ambas fechas', () => {
  assert.deepEqual(duplicatePlantingFilter({ huertoId: 4, cultivoId: 12, fechaSiembra: '2026-10-10', fechaTrasplante: null }), {
    huertoId: 4, cultivoId: 12, fechaSiembra: d('2026-10-10'), fechaTrasplante: null,
  })
  assert.notDeepEqual(duplicatePlantingFilter({ huertoId: 4, cultivoId: 12, fechaSiembra: '2026-10-11', fechaTrasplante: null }),
    duplicatePlantingFilter({ huertoId: 4, cultivoId: 12, fechaSiembra: '2026-10-10', fechaTrasplante: null }))
})
test('CIR-04: admite evaluación de siembra activa correspondiente a familia, fecha y variedad', () => {
  assert.equal(visitCycleProblem(cycle(), input()), null)
  assert.equal(visitCycleProblem(cycle(), { ...input(), fechaVisita: '2026-10-20' }), null)
})
test('CIR-04: rechaza ciclo inexistente y ciclo de otra familia', () => {
  assert.equal(visitCycleProblem(null, input()), 'CYCLE_NOT_FOUND')
  assert.equal(visitCycleProblem(cycle(), { ...input(), familiaId: 8 }), 'OTHER_FAMILY')
})
test('CIR-04: no enlaza evaluación a huerto, ciclo ni cultivo inactivo', () => {
  assert.equal(visitCycleProblem({ ...cycle(), huerto: { familiaId: 7, estado: 'INACTIVO' } }, input()), 'INACTIVE_GARDEN')
  assert.equal(visitCycleProblem({ ...cycle(), estado: 'FINALIZADO' }, input()), 'INACTIVE_CYCLE')
  assert.equal(visitCycleProblem({ ...cycle(), cultivo: { nombre: 'Tomate', activo: false } }, input()), 'INACTIVE_CROP')
})
test('CIR-04: valida nombre real del catálogo y fechas de plantación', () => {
  assert.equal(visitCycleProblem(cycle(), { ...input(), nombreCultivo: 'Pepino' }), 'CROP_MISMATCH')
  assert.equal(visitCycleProblem(cycle(), { ...input(), fechaVisita: '2026-10-09' }), 'NOT_PLANTED_YET')
  assert.equal(visitCycleProblem({ ...cycle(), fechaFin: d('2026-10-20') }, input()), 'CYCLE_ENDED')
  assert.equal(visitCycleProblem({ ...cycle(), fechaSiembra: null, fechaTrasplante: null }, input()), 'NOT_PLANTED_YET')
})

test('CIR-06: permite evaluar un ciclo sembrado aunque su trasplante sea futuro', () => {
  const frijol = { ...cycle(), fechaSiembra: d('2026-11-04'), fechaTrasplante: d('2027-01-12') }
  const lechuga = { ...cycle(), fechaSiembra: d('2026-10-21'), fechaTrasplante: d('2026-12-25') }
  const visit = { ...input(), fechaVisita: '2026-11-05' }
  assert.equal(visitCycleProblem(frijol, visit), null)
  assert.equal(visitCycleProblem(lechuga, visit), null)
  assert.equal(visitCycleProblem(frijol, { ...visit, fechaVisita: '2026-11-03' }), 'NOT_PLANTED_YET')
})

test('CIR-06: para ciclos sin siembra utiliza el trasplante como fecha inicial', () => {
  const onlyTransplant = { ...cycle(), fechaSiembra: null, fechaTrasplante: d('2026-11-06') }
  assert.equal(visitCycleProblem(onlyTransplant, { ...input(), fechaVisita: '2026-11-05' }), 'NOT_PLANTED_YET')
  assert.equal(visitCycleProblem(onlyTransplant, { ...input(), fechaVisita: '2026-11-06' }), null)
})
