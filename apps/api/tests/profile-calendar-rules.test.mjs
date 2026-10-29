import test from 'node:test'
import assert from 'node:assert/strict'
import { fechaAnteriorAHoy, fechaHoyGuatemala } from '../src/modules/calendar/guatemala-date.ts'
import { puedeEditarPerfilCompleto } from '../src/modules/profile/profile.permissions.ts'

test('La fecha local usa Guatemala incluso cuando UTC ya cambió de día', () => {
  const now = new Date('2026-10-30T02:15:00Z')
  assert.equal(fechaHoyGuatemala(now), '2026-10-29')
  assert.equal(fechaAnteriorAHoy('2026-10-28', now), true)
  assert.equal(fechaAnteriorAHoy('2026-10-29', now), false)
  assert.equal(fechaAnteriorAHoy('2026-10-30', now), false)
})

test('Dirección y Coordinación pueden editar datos personales y dirección', () => {
  assert.equal(puedeEditarPerfilCompleto(['Dirección general']), true)
  assert.equal(puedeEditarPerfilCompleto(['Coordinadora del programa agroforestal']), true)
  assert.equal(puedeEditarPerfilCompleto(['Coordinación']), true)
})

test('Técnico, administración y auditoría no pueden editar identidad ni dirección', () => {
  assert.equal(puedeEditarPerfilCompleto(['Técnico agropecuario']), false)
  assert.equal(puedeEditarPerfilCompleto(['Administración']), false)
  assert.equal(puedeEditarPerfilCompleto(['Auditoría']), false)
})
