import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseNotificacionId, parseListarNotificacionesQuery,
} from '../dist/modules/notifications/notifications.validation.js'

test('valores por defecto y filtros de la bandeja', () => {
  assert.deepEqual(parseListarNotificacionesQuery({}), {
    pagina: 1, limite: 20, estado: 'todas',
  })
  assert.deepEqual(parseListarNotificacionesQuery({ pagina: '2', limite: '40', estado: 'no_leidas' }), {
    pagina: 2, limite: 40, estado: 'no_leidas',
  })
  assert.equal(parseListarNotificacionesQuery({ estado: 'leidas' })?.estado, 'leidas')
})

test('rechaza filtros inválidos, arreglos y límites excesivos', () => {
  for (const query of [
    { pagina: '0' }, { pagina: '-1' }, { pagina: '1.5' }, { pagina: '10001' },
    { limite: '0' }, { limite: '101' }, { limite: ['10'] },
    { pagina: 'Infinity' }, { estado: 'pendientes' }, { estado: ['todas'] },
    { pagina: '999999999999999999999' },
  ]) {
    assert.equal(parseListarNotificacionesQuery(query), null)
  }
})

test('IDs de notificaciones: solo enteros válidos de PostgreSQL', () => {
  assert.equal(parseNotificacionId('2147483647'), 2147483647)
  for (const id of ['0', '-1', '1.1', '01foo', '2147483648', '999999999999999999999', ['1'], 1, undefined]) {
    assert.equal(parseNotificacionId(id), null)
  }
})
