import assert from 'node:assert/strict'
import test from 'node:test'
import {
  crearNotificacion, listarNotificaciones, contarNoLeidas,
  marcarComoLeida, marcarTodasComoLeidas,
} from '../dist/modules/notifications/notifications.service.js'

function prismaFalso() {
  const fechaCreacion = new Date('2026-10-21T12:00:00Z')
  const filas = [
    { id: 1, usuarioId: 10, tipo: 'SISTEMA', titulo: 'A', mensaje: 'Primera', referencia: null, fechaCreacion, fechaLectura: null },
    { id: 2, usuarioId: 10, tipo: 'SISTEMA', titulo: 'B', mensaje: 'Segunda', referencia: null, fechaCreacion, fechaLectura: null },
    { id: 3, usuarioId: 20, tipo: 'SISTEMA', titulo: 'Privada', mensaje: 'No ver', referencia: null, fechaCreacion, fechaLectura: null },
  ]
  const filtrar = where => filas.filter(n =>
    (where.id === undefined || n.id === where.id) &&
    (where.usuarioId === undefined || n.usuarioId === where.usuarioId) &&
    (where.fechaLectura === undefined ||
      (where.fechaLectura === null ? n.fechaLectura === null : n.fechaLectura !== null))
  )
  const notificacion = {
    create: async ({ data }) => {
      const n = { ...data, id: filas.length + 1, fechaCreacion: new Date(), fechaLectura: null }
      filas.push(n)
      return n
    },
    findMany: async ({ where, skip, take }) => filtrar(where).sort((a, b) =>
      b.fechaCreacion - a.fechaCreacion || b.id - a.id).slice(skip, skip + take),
    count: async ({ where }) => filtrar(where).length,
    updateMany: async ({ where, data }) => {
      const targets = filtrar(where)
      for (const n of targets) n.fechaLectura = data.fechaLectura
      return { count: targets.length }
    },
    findFirst: async ({ where }) => filtrar(where)[0] ?? null,
  }
  return { filas, notificacion, $transaction: async (promesas) => Promise.all(promesas) }
}

test('la bandeja y el contador solo incluyen datos del usuario en sesión', async () => {
  const db = prismaFalso()
  const bandeja = await listarNotificaciones(10, { pagina: 1, limite: 20, estado: 'todas' }, db)
  assert.deepEqual(bandeja.notificaciones.map(n => n.id), [2, 1])
  assert.equal(bandeja.paginacion.total, 2)
  assert.equal(bandeja.noLeidas, 2)
  assert.deepEqual(await contarNoLeidas(20, db), { noLeidas: 1 })
})

test('una lectura es idempotente y no puede modificar notificaciones ajenas', async () => {
  const db = prismaFalso()
  assert.equal(await marcarComoLeida(10, 3, db), null)
  assert.equal(db.filas[2].fechaLectura, null)
  const primera = await marcarComoLeida(10, 1, db)
  const repetida = await marcarComoLeida(10, 1, db)
  assert.ok(primera.fechaLectura instanceof Date)
  assert.equal(repetida.fechaLectura, primera.fechaLectura)
  assert.deepEqual(await contarNoLeidas(10, db), { noLeidas: 1 })
  assert.equal((await listarNotificaciones(10, { pagina: 1, limite: 20, estado: 'leidas' }, db)).notificaciones.length, 1)
})

test('marcar todas solo actualiza las no leídas del usuario', async () => {
  const db = prismaFalso()
  assert.deepEqual(await marcarTodasComoLeidas(10, db), { actualizadas: 2 })
  assert.deepEqual(await marcarTodasComoLeidas(10, db), { actualizadas: 0 })
  assert.equal(db.filas[2].fechaLectura, null)
  assert.deepEqual(await contarNoLeidas(10, db), { noLeidas: 0 })
})

test('el creador interno acepta rutas de la app y rechaza enlaces externos', async () => {
  const db = prismaFalso()
  const base = { usuarioId: 10, tipo: 'CALENDARIO', titulo: 'Nueva visita', mensaje: 'Una visita programada' }
  const creada = await crearNotificacion({ ...base, referencia: '/visitas/agenda' }, db)
  assert.equal(creada.usuarioId, 10)
  await assert.rejects(() => crearNotificacion({ ...base, referencia: 'https://ejemplo.com' }, db))
  await assert.rejects(() => crearNotificacion({ ...base, referencia: '//ejemplo.com' }, db))
})
