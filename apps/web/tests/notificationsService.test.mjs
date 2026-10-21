import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  obtenerContadorNotificaciones, obtenerNotificaciones, marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from '../src/features/notifications/services/notificationsService.ts'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

const ok = value => ({ ok: true, json: async () => value })

test('consulta el contador con la cookie de sesión y sin caché', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/v1/notificaciones/contador')
    assert.equal(options.credentials, 'same-origin')
    assert.equal(options.cache, 'no-store')
    return ok({ noLeidas: 3 })
  }
  assert.deepEqual(await obtenerContadorNotificaciones(), { noLeidas: 3 })
})

test('lista con filtros, paginación y sin destinatario en la URL', async () => {
  globalThis.fetch = async (url) => {
    assert.equal(url, '/api/v1/notificaciones?pagina=2&limite=20&estado=no_leidas')
    return ok({ notificaciones: [], noLeidas: 0, paginacion: { pagina: 2 } })
  }
  const data = await obtenerNotificaciones({ pagina: 2, limite: 20, estado: 'no_leidas' })
  assert.deepEqual(data.notificaciones, [])
})

test('lectura individual requiere PATCH y encabezado X-Requested-With', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/v1/notificaciones/29/leer')
    assert.equal(options.method, 'PATCH')
    assert.equal(options.headers['X-Requested-With'], 'XMLHttpRequest')
    return ok({ id: 29, leida: true, fechaLectura: '2026-10-21T10:00:00Z' })
  }
  assert.equal((await marcarNotificacionLeida(29)).leida, true)
})

test('lectura masiva requiere PATCH y encabezado antifalsificación', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/v1/notificaciones/leer-todas')
    assert.equal(options.method, 'PATCH')
    assert.equal(options.headers['X-Requested-With'], 'XMLHttpRequest')
    return ok({ actualizadas: 7 })
  }
  assert.deepEqual(await marcarTodasNotificacionesLeidas(), { actualizadas: 7 })
})

test('propaga error amigable en sesión expirada', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 401 })
  await assert.rejects(obtenerContadorNotificaciones(), /sesión ha expirado/)
})

test('propaga error cuando la API no responde', async () => {
  globalThis.fetch = async () => { throw new TypeError('network failed') }
  await assert.rejects(obtenerContadorNotificaciones(), /network failed/)
})
