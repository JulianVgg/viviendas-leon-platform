import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CICLO_VISITA_DIAS, sumarDiasCiviles, proximaFechaSugerida,
  proximaFechaDisponible, estaEnMismoCiclo,
} from '../dist/modules/visits/visit-schedule.rules.js'

test('citas semanales: seleccionar 20 programa la siguiente el 27', () => {
  assert.equal(CICLO_VISITA_DIAS, 7)
  assert.equal(sumarDiasCiviles('2026-11-20', 7), '2026-11-27')
  assert.equal(proximaFechaSugerida('2026-11-20'), '2026-11-27')
  assert.equal(proximaFechaDisponible('2026-11-20', ['2026-11-27']), '2026-12-04')
})

test('ventana semanal: 6 días choca, 7 días es una cita nueva', () => {
  assert.equal(estaEnMismoCiclo('2026-11-20', '2026-11-26'), true)
  assert.equal(estaEnMismoCiclo('2026-11-20', '2026-11-27'), false)
  assert.equal(estaEnMismoCiclo('2026-11-27', '2026-11-20'), false)
})

test('sumar días civiles funciona en cambio de mes y año', () => {
  assert.equal(sumarDiasCiviles('2026-12-29', 7), '2027-01-05')
  assert.throws(() => sumarDiasCiviles('fecha-invalida', 7))
})
