import test from 'node:test'
import assert from 'node:assert/strict'
import { puedeConsultarAgendaVisitas } from '../src/features/notifications/utils/pushAccess.ts'
import { recordarActivacionPush, activacionPushRecordada, restaurarPushRecordado } from '../src/features/notifications/services/pushService.ts'

test('NTF-12 no abre agenda con permiso visual pero API sin autorización', () => {
  assert.equal(puedeConsultarAgendaVisitas({ roles: ['Adminpr'], permisos: ['PANTALLA_VISITAS_AGENDA'] }), false)
  assert.equal(puedeConsultarAgendaVisitas({ roles: ['Personal de campo'], permisos: ['VISITAS_READ'] }), true)
  assert.equal(puedeConsultarAgendaVisitas({ roles: ['Dirección general'], permisos: [] }), true)
})

test('NTF-12 conserva la elección push por usuario y permite desactivar', async () => {
  const original = globalThis.localStorage
  const datos = new Map()
  globalThis.localStorage = {
    getItem: k => datos.get(k) ?? null,
    setItem: (k, v) => datos.set(k, v),
    removeItem: k => datos.delete(k),
  }
  try {
    recordarActivacionPush(101, true)
    assert.equal(activacionPushRecordada(101), true)
    assert.equal(activacionPushRecordada(102), false)
    // Sin consentimiento previo, nunca intenta suscribirse automáticamente.
    assert.equal(await restaurarPushRecordado(102), false)
    recordarActivacionPush(101, false)
    assert.equal(activacionPushRecordada(101), false)
  } finally {
    if (original === undefined) delete globalThis.localStorage
    else globalThis.localStorage = original
  }
})
