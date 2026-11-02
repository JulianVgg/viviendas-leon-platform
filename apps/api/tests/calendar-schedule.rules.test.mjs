import test from 'node:test'
import assert from 'node:assert/strict'
import { interpretarHorario, horariosSeCruzan, textoHorario } from '../src/modules/calendar/calendar-schedule.rules.ts'

test('todo el día se conserva sin horario; se aceptan registros anteriores', () => {
  assert.deepEqual(interpretarHorario(true, null, null), {horaInicio:null,horaFin:null})
  assert.deepEqual(interpretarHorario(undefined, undefined, undefined), {horaInicio:null,horaFin:null})
  assert.equal(textoHorario({horaInicio:null,horaFin:null}), 'Todo el día')
})
test('los horarios deben tener inicio anterior al fin y formato de 24 horas', () => {
  assert.equal(interpretarHorario(false,'12:00','11:00'),null)
  assert.equal(interpretarHorario(false,'11:00','11:00'),null)
  assert.equal(interpretarHorario(false,'25:00','26:00'),null)
  assert.equal(interpretarHorario(false,'11:00',null),null)
  assert.deepEqual(interpretarHorario(false,'11:00','12:00'), {horaInicio:'11:00',horaFin:'12:00'})
})
test('dos turnos consecutivos no se solapan', () => {
  assert.equal(horariosSeCruzan({horaInicio:'11:00',horaFin:'12:00'},{horaInicio:'12:00',horaFin:'13:00'}),false)
})
test('dos turnos parcialmente solapados sí entran en conflicto', () => {
  assert.equal(horariosSeCruzan({horaInicio:'11:00',horaFin:'12:00'},{horaInicio:'11:30',horaFin:'13:00'}),true)
})
test('un evento de todo el día bloquea cualquier horario institucional', () => {
  assert.equal(horariosSeCruzan({horaInicio:null,horaFin:null},{horaInicio:'07:00',horaFin:'09:00'}),true)
})

test('un cambio de horario notifica a participantes existentes', async () => {
  const { eventoTieneCambios, planificarCambioCalendario } = await import('../dist/modules/notifications/notifications.activity.js')
  const anterior = { titulo: 'Capacitación', categoria: 'CAPACITACION', descripcion: '', fecha: '2026-10-31', horaInicio: '11:00', horaFin: '12:00', participantesIds: [7] }
  const siguiente = { ...anterior, horaInicio: '12:00', horaFin: '13:00' }
  assert.equal(eventoTieneCambios(anterior, siguiente), true)
  assert.deepEqual(planificarCambioCalendario(anterior, siguiente), [{ usuarioId:7, tipo:'CALENDARIO_CAMBIO' }])
})
