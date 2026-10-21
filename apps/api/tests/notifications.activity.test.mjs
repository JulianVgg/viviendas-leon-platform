import test from 'node:test'
import assert from 'node:assert/strict'
import {
  planificarCambioCalendario, eventoTieneCambios, descripcionAvisoCalendario, descripcionAvisoVisita,
} from '../dist/modules/notifications/notifications.activity.js'

const original = {
  titulo: 'Capacitación', categoria: 'CAPACITACION', descripcion: '',
  fecha: '2026-11-03', participantesIds: [2, 3],
}

test('alta: solo los nuevos participantes reciben asignación', () => {
  assert.deepEqual(planificarCambioCalendario({ ...original, participantesIds: [] }, original), [
    { usuarioId: 2, tipo: 'CALENDARIO_ASIGNACION' },
    { usuarioId: 3, tipo: 'CALENDARIO_ASIGNACION' },
  ])
})

test('modificación: notifica al conjunto que permanece asignado', () => {
  const next = { ...original, fecha: '2026-11-05' }
  assert.deepEqual(planificarCambioCalendario(original, next), [
    { usuarioId: 2, tipo: 'CALENDARIO_CAMBIO' },
    { usuarioId: 3, tipo: 'CALENDARIO_CAMBIO' },
  ])
})

test('alta, baja y continuidad en la misma edición', () => {
  const next = { ...original, fecha: '2026-11-06', participantesIds: [3, 4] }
  assert.deepEqual(planificarCambioCalendario(original, next), [
    { usuarioId: 3, tipo: 'CALENDARIO_CAMBIO' },
    { usuarioId: 4, tipo: 'CALENDARIO_ASIGNACION' },
    { usuarioId: 2, tipo: 'CALENDARIO_DESASIGNACION' },
  ])
})

test('cambio solo de participantes no avisa a los demás', () => {
  assert.deepEqual(planificarCambioCalendario(original, { ...original, participantesIds: [2, 3, 4] }), [
    { usuarioId: 4, tipo: 'CALENDARIO_ASIGNACION' },
  ])
})

test('PUT repetido no cambia evento ni crea avisos', () => {
  const same = { ...original, participantesIds: [3, 2] }
  assert.equal(eventoTieneCambios(original, same), false)
  assert.deepEqual(planificarCambioCalendario(original, same), [])
})

test('cambio de evento sin participantes se guarda aunque no notifique', () => {
  const next = { ...original, titulo: 'Reunión general', participantesIds: [] }
  const previous = { ...original, participantesIds: [] }
  assert.equal(eventoTieneCambios(previous, next), true)
  assert.deepEqual(planificarCambioCalendario(previous, next), [])
})

test('descripción, título, fecha y mensajes legibles en castellano', () => {
  assert.equal(eventoTieneCambios(original, { ...original, descripcion: 'Llegar temprano' }), true)
  assert.match(descripcionAvisoCalendario('CALENDARIO_CANCELACION', original).mensaje, /Se canceló/)
  assert.match(descripcionAvisoCalendario('CALENDARIO_DESASIGNACION', original).mensaje, /Dejaste/)
  assert.match(descripcionAvisoVisita('VISITA_PROGRAMADA', 'García', '2026-11-03').mensaje, /García/)
  assert.match(descripcionAvisoVisita('VISITA_REPROGRAMADA', 'García', '2026-11-04').titulo, /reprogramada/)
  assert.match(descripcionAvisoVisita('VISITA_CANCELADA', 'García', '2026-11-04').titulo, /cancelada/)
})
