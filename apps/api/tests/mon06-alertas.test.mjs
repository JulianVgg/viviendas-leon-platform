import test from 'node:test'
import assert from 'node:assert/strict'
import {
  inicioDiaMon06, puedeConsultarAlertasMon06, filtrosAlertaMon06,
  obtenerResumenAlertasMon06, obtenerDetalleAlertasMon06,
} from '../dist/modules/dashboard/mon06-alerts.service.js'

const tecnico = { id: 7, roles: ['Técnico agropecuario'], permisos: ['PANTALLA_VISITAS_AGENDA','VISITAS_READ'] }
const direccion = { id: 1, roles: ['Dirección general'], permisos: [] }
const sinPermiso = { id: 99, roles: ['Auditor'], permisos: [] }
const dia = texto => new Date(`${texto}T00:00:00.000Z`)
const ahora = new Date('2026-11-01T02:30:00Z') // En Guatemala aún es 31 de octubre.

const fakeVisit = { id: 5, fecha: dia('2026-10-30'), usuarioResponsable: { nombre: 'Yohan', apellido: 'Vásquez' },
  familia: { nombreReferencia: 'Familia Mendez', comunidad: { nombre: 'Paxub' } } }
const fakeFollowup = { id: '70707070-7070-4707-8707-707070707070', texto: 'Revisar huerto',
  fechaLimite: dia('2026-10-30'), revisionProximaVisita: false,
  visitaOrigen: { id: 5, usuarioResponsable: fakeVisit.usuarioResponsable, familia: fakeVisit.familia } }

test('MON-06 calcula hoy en Guatemala sin marcar vencidas las visitas de hoy', () => {
  assert.equal(inicioDiaMon06(ahora).toISOString(), '2026-10-31T00:00:00.000Z')
  assert.equal(filtrosAlertaMon06(tecnico, {}, ahora).hoy, '2026-10-31')
})

test('MON-06 niega consultas a roles sin permiso técnico ni de supervisión', async () => {
  assert.equal(puedeConsultarAlertasMon06(sinPermiso), false)
  const db = { visita: { count: () => { throw Error('Consulta no permitida') } } }
  assert.equal(await obtenerResumenAlertasMon06(sinPermiso, {}, db, ahora), null)
  assert.equal(await obtenerDetalleAlertasMon06(sinPermiso, 'visitas', 'todas', 1, 10, {}, db, ahora), null)
})

test('MON-06 el técnico solo ve visitas y compromisos originados en sus visitas', async () => {
  const filtros = []
  const db = {
    visita: {
      count: async q => { filtros.push(q.where); return 1 },
      findMany: async q => { filtros.push(q.where); return [fakeVisit] },
    },
    seguimientoVisita: {
      count: async q => { filtros.push(q.where); return q.where.fechaLimite ? 1 : 2 },
      findMany: async q => { filtros.push(q.where); return [fakeFollowup] },
    },
  }
  const resultado = await obtenerResumenAlertasMon06(tecnico, { comunidadId: 99, responsableId: 44 }, db, ahora)
  assert.deepEqual(resultado.indicadores, { visitasVencidas: 1, compromisosPendientes: 2, compromisosVencidos: 1 })
  assert.equal(resultado.visitas[0].destino, '/visitas/agenda?visitId=5')
  assert.equal(resultado.compromisos[0].destino, `/visitas/agenda?seguimiento=${fakeFollowup.id}`)
  assert.ok(filtros.every(f => f.visitaOrigen ? f.visitaOrigen.usuarioResponsableId === 7 : f.usuarioResponsableId === 7))
  assert.ok(filtros.every(f => f.visitaOrigen ? !f.visitaOrigen.familia : !f.familia))
})

test('MON-06 supervisión filtra por comunidad y responsable y permite abrir el detalle desde Calendario', async () => {
  const filtros = []
  const db = {
    visita: { count: async q => { filtros.push(q.where); return 1 }, findMany: async q => { filtros.push(q.where); return [fakeVisit] } },
    seguimientoVisita: { count: async q => { filtros.push(q.where); return 1 }, findMany: async q => { filtros.push(q.where); return [fakeFollowup] } },
  }
  const respuesta = await obtenerResumenAlertasMon06(direccion, { comunidadId: 4, responsableId: 7 }, db, ahora)
  assert.equal(respuesta.visitas[0].destino, '/calendario?visitId=5')
  assert.equal(respuesta.compromisos[0].destino, '/calendario?visitId=5')
  assert.ok(filtros.every(f => {
    const v = f.visitaOrigen ?? f
    return v.usuarioResponsableId === 7 && v.familia.comunidadId === 4
  }))
})

test('MON-06 detalle paginado y compromisos vencidos usan los mismos filtros del resumen', async () => {
  const consultas = []
  const db = { seguimientoVisita: {
    count: async q => { consultas.push(q.where); return 17 },
    findMany: async q => { consultas.push(q.where); assert.equal(q.skip, 10); assert.equal(q.take, 10); return [fakeFollowup] },
  } }
  const respuesta = await obtenerDetalleAlertasMon06(direccion, 'compromisos', 'vencidas', 2, 10, { comunidadId: 4 }, db, ahora)
  assert.equal(respuesta.totalPaginas, 2)
  assert.equal(respuesta.registros[0].estado, 'VENCIDA')
  assert.ok(consultas.every(q => q.fechaLimite.lt instanceof Date && q.visitaOrigen.familia.comunidadId === 4))
})
