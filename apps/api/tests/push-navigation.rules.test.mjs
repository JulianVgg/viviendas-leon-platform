import test from 'node:test'
import assert from 'node:assert/strict'
import { destinoPushAutorizado } from '../dist/modules/notifications/push-navigation.rules.js'

const campo = { roles: ['Personal de campo'], permisos: ['VISITAS_READ', 'PANTALLA_VISITAS_AGENDA'] }
const adminpr = { roles: ['Adminpr'], permisos: ['PANTALLA_VISITAS_AGENDA'] }
const direccion = { roles: ['Dirección general'], permisos: [] }

test('NTF-12 evita visita 403 si solo existe permiso del menú', () => {
  assert.equal(destinoPushAutorizado('/visitas/agenda', adminpr), '/notificaciones')
  assert.equal(destinoPushAutorizado('/visitas/agenda', campo), '/visitas/agenda')
})
test('NTF-12 no redirige calendario a visitas sin rol supervisor', () => {
  assert.equal(destinoPushAutorizado('/calendario', campo), '/notificaciones')
  assert.equal(destinoPushAutorizado('/calendario', direccion), '/calendario')
})
test('NTF-12 solamente abre rutas de la misma aplicación', () => {
  for (const ruta of ['https://evil.test', '//evil.test', '/\\evil', '/visitas/agenda?x=1', '/calendario%2f..', '/admin']) {
    assert.equal(destinoPushAutorizado(ruta, direccion), '/notificaciones')
  }
  assert.equal(destinoPushAutorizado('/notificaciones?invitacion=12', campo), '/notificaciones?invitacion=12')
})
