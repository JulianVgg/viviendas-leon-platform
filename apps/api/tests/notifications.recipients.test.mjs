import test from 'node:test'
import assert from 'node:assert/strict'
import { crearNotificacionesDeActividad } from '../dist/modules/notifications/notifications.service.js'

function crearPrismaFalso() {
  const notificaciones = []
  let filtroUsuarios = null
  const fake = {
    usuario: {
      async findMany({ where }) {
        filtroUsuarios = where
        return [
          { id: 1, roles: [{ rol: { nombre: 'Técnico', permisos: [{ permiso: { codigo: 'PANTALLA_VISITAS_AGENDA' } }] } }] },
          { id: 2, roles: [{ rol: { nombre: 'Coordinadora', permisos: [{ permiso: { codigo: 'PANTALLA_CALENDARIO' } }] } }] },
          { id: 3, roles: [{ rol: { nombre: 'Dirección general', permisos: [] } }] },
          // El usuario 4 (inactivo) no es devuelto por el SELECT filtrado.
        ].filter(usuario => where.id.in.includes(usuario.id))
      },
    },
    notificacion: {
      async createMany({ data, skipDuplicates }) {
        assert.equal(skipDuplicates, true)
        let count = 0
        for (const aviso of data) {
          if (notificaciones.some(item => item.claveEvento === aviso.claveEvento)) continue
          notificaciones.push(aviso)
          count += 1
        }
        return { count }
      },
    },
  }
  return { fake, notificaciones, getFiltro: () => filtroUsuarios }
}

const calendario = id => ({ usuarioId: id, tipo: 'CALENDARIO_ASIGNACION', titulo: 'Evento',
  mensaje: 'Nueva capacitación asignada.', referencia: '/calendario',
  claveEvento: `CAL:20:CREACION:${id}`, permisoDestino: 'PANTALLA_CALENDARIO' })

test('solo roles activos autorizados y Dirección reciben calendario', async () => {
  const { fake, notificaciones, getFiltro } = crearPrismaFalso()
  const recibidas = await crearNotificacionesDeActividad([1, 2, 3, 4].map(calendario), fake)
  assert.equal(recibidas, 2)
  assert.deepEqual(notificaciones.map(item => item.usuarioId), [2, 3])
  assert.equal(getFiltro().estado, 'ACTIVO')
})

test('la misma clave no se inserta dos veces', async () => {
  const { fake, notificaciones } = crearPrismaFalso()
  assert.equal(await crearNotificacionesDeActividad([calendario(2)], fake), 1)
  assert.equal(await crearNotificacionesDeActividad([calendario(2)], fake), 0)
  assert.equal(notificaciones.length, 1)
})

test('el técnico recibe sus visitas, no eventos sin permiso', async () => {
  const { fake, notificaciones } = crearPrismaFalso()
  const visita = { ...calendario(1), permisoDestino: 'PANTALLA_VISITAS_AGENDA',
    tipo: 'VISITA_PROGRAMADA', referencia: '/visitas/agenda', claveEvento: 'VIS:15:CREACION:1' }
  assert.equal(await crearNotificacionesDeActividad([visita], fake), 1)
  assert.equal(notificaciones[0].usuarioId, 1)
})

test('rechaza referencias externas o claves manipuladas', async () => {
  const { fake } = crearPrismaFalso()
  await assert.rejects(crearNotificacionesDeActividad([{ ...calendario(2), referencia: 'https://example.com' }], fake))
  await assert.rejects(crearNotificacionesDeActividad([{ ...calendario(2), claveEvento: 'CAL:20:../oops' }], fake))
})
