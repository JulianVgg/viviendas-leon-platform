import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PREFERENCIAS_PUSH_POR_DEFECTO, validarPreferenciasPush,
  proximoEnvioPermitido, destinoSeguroPush,
} from '../dist/modules/notifications/push-automatic.rules.js'

test('NTF-12 mantiene push habilitado sin silencio por defecto', () => {
  assert.deepEqual(PREFERENCIAS_PUSH_POR_DEFECTO, {
    habilitadas: true, silencioInicio: null, silencioFin: null,
  })
  assert.deepEqual(validarPreferenciasPush({ habilitadas: false, silencioInicio: null, silencioFin: null }), {
    habilitadas: false, silencioInicio: null, silencioFin: null,
  })
})

test('NTF-12 rechaza horarios inválidos o campos adicionales', () => {
  for (const p of [
    {}, null, [], { habilitadas: 'sí', silencioInicio: null, silencioFin: null },
    { habilitadas: true, silencioInicio: '22:00', silencioFin: null },
    { habilitadas: true, silencioInicio: '25:00', silencioFin: '07:00' },
    { habilitadas: true, silencioInicio: '22:00', silencioFin: '22:00' },
    { habilitadas: true, silencioInicio: null, silencioFin: null, usuarioId: 123 },
  ]) assert.equal(validarPreferenciasPush(p), null)
})

test('NTF-12 respeta silencio nocturno y horario de Guatemala', () => {
  // 05:30 Guatemala = 11:30 UTC. El silencio 22:00-07:00 termina a las 13:00 UTC.
  const ahora = new Date('2026-10-28T11:30:17Z')
  assert.equal(proximoEnvioPermitido(ahora, '22:00', '07:00').toISOString(), '2026-10-28T13:00:00.000Z')
  const tarde = new Date('2026-10-28T18:00:00Z')
  assert.strictEqual(proximoEnvioPermitido(tarde, '22:00', '07:00'), tarde)
  // 23:30 Guatemala cruza medianoche; esperar al día siguiente, 07:00 Guatemala.
  assert.equal(proximoEnvioPermitido(new Date('2026-10-29T05:30:00Z'), '22:00', '07:00').toISOString(), '2026-10-29T13:00:00.000Z')
})

test('NTF-12 admite silencio diurno y respeta el límite final', () => {
  assert.equal(proximoEnvioPermitido(new Date('2026-10-28T17:00:00Z'), '08:00', '12:00').toISOString(), '2026-10-28T18:00:00.000Z')
  const fin = new Date('2026-10-28T18:00:00Z')
  assert.strictEqual(proximoEnvioPermitido(fin, '08:00', '12:00'), fin)
})

test('NTF-12 solo permite destinos internos conocidos', () => {
  assert.equal(destinoSeguroPush('/calendario'), '/calendario')
  assert.equal(destinoSeguroPush('/visitas/agenda'), '/visitas/agenda')
  for (const ruta of ['https://example.com', '//evil', '/administracion/usuarios', '/calendario?x=1', null]) {
    assert.equal(destinoSeguroPush(ruta), '/notificaciones')
  }
})
