import test from 'node:test'
import assert from 'node:assert/strict'
import { eventoYaFinalizo, fechaHoyGuatemala } from '../dist/modules/calendar/event-history.js'

test('Guatemala: la fecha del evento sigue activa hasta las 23:59 locales', () => {
  const fechaFin = new Date('2026-10-25T12:00:00.000Z')
  const antesDeMedianoche = new Date('2026-10-26T05:59:00.000Z')
  const despuesDeMedianoche = new Date('2026-10-26T06:01:00.000Z')
  assert.equal(fechaHoyGuatemala(antesDeMedianoche), '2026-10-25')
  assert.equal(fechaHoyGuatemala(despuesDeMedianoche), '2026-10-26')
  assert.equal(eventoYaFinalizo(fechaFin, antesDeMedianoche), false)
  assert.equal(eventoYaFinalizo(fechaFin, despuesDeMedianoche), true)
})

test('un evento de varios días solo se cierra al pasar su fecha final', () => {
  const ahora = new Date('2026-10-26T18:00:00Z')
  assert.equal(eventoYaFinalizo(new Date('2026-10-26T12:00:00Z'), ahora), false)
  assert.equal(eventoYaFinalizo(new Date('2026-10-27T12:00:00Z'), ahora), false)
  assert.equal(eventoYaFinalizo(new Date('2026-10-25T12:00:00Z'), ahora), true)
})
