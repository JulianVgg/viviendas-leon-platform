import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// El servicio acepta un cliente Prisma simulado para verificar el aislamiento de la información.
// Importamos las funciones puras sin conectar a PostgreSQL.
const source = readFileSync(fileURLToPath(new URL('../src/modules/dashboard/my-agenda.service.ts', import.meta.url)), 'utf8')
  .replace(/^import[^\r\n]*(?:\r?\n|$)/gm, '')
  .replace('esDireccionGeneral(user.roles)', "user.roles.includes('Dirección general')")
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { fechaGuatemala, sumarDiasISO, puedeConsultarAgendaModulo, ordenarActividades, obtenerMiAgenda } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

const tecnico = { id: 7, roles: ['Técnico agropecuario'], permisos: ['PANTALLA_CALENDARIO', 'PANTALLA_VISITAS_AGENDA', 'VISITAS_READ'] }
const noAutorizado = { id: 8, roles: [], permisos: [] }

function dbFalso() {
  const filtros = []
  const db = {
    eventoInstitucional: { findMany: async q => { filtros.push(['evento', q.where]); return [
      { id: 1, titulo: 'Capacitación', categoria: 'CAPACITACION', fechaInicio: new Date('2026-10-22T12:00:00Z'), fechaFin: new Date('2026-10-22T12:00:00Z') },
    ] } },
    visita: { findMany: async q => { filtros.push(['visita', q.where]); return q.where.fecha.gte ? [
      { id: 11, fecha: new Date('2026-10-23T12:00:00Z'), familia: { nombreReferencia: 'Familia A', comunidad: { nombre: 'Los Planes' } } },
    ] : [] }, count: async q => { filtros.push(['visita_count', q.where]); return 1 } },
    seguimientoVisita: { findMany: async q => { filtros.push(['compromiso', q.where]); return [
      { id: 'uuid', texto: 'Revisar huerto', responsable: 'ONG', fechaLimite: null, visitaOrigen: { familia: { nombreReferencia: 'Familia A' } } },
    ] }, count: async q => { filtros.push(['compromiso_count', q.where]); return 1 } },
  }
  return { db, filtros }
}

test('fecha local de Guatemala cambia correctamente en medianoche UTC', () => {
  assert.equal(fechaGuatemala(new Date('2026-10-22T03:00:00Z')), '2026-10-21')
  assert.equal(fechaGuatemala(new Date('2026-10-22T06:00:00Z')), '2026-10-22')
  assert.equal(sumarDiasISO('2026-12-30', 3), '2027-01-02')
})
test('permiso de calendario y permiso doble para visitas', () => {
  assert.equal(puedeConsultarAgendaModulo(tecnico, 'CALENDARIO'), true)
  assert.equal(puedeConsultarAgendaModulo(tecnico, 'VISITAS'), true)
  assert.equal(puedeConsultarAgendaModulo(noAutorizado, 'CALENDARIO'), false)
  assert.equal(puedeConsultarAgendaModulo({ roles: [], permisos: ['PANTALLA_VISITAS_AGENDA'] }, 'VISITAS'), false)
})
test('actividades con la misma identidad aparecen una sola vez y ordenadas', () => {
  const base = { tipo: 'VISITA', fecha: '2026-10-22', titulo: 'Visita' }
  assert.deepEqual(ordenarActividades([
    { ...base, id: 'VISITA:2', fecha: '2026-10-24' },
    { ...base, id: 'VISITA:1' },
    { ...base, id: 'VISITA:2', fecha: '2026-10-24' },
  ]).map(x => x.id), ['VISITA:1', 'VISITA:2'])
})
test('la agenda contiene solo eventos, visitas y compromisos asignados', async () => {
  const { db, filtros } = dbFalso()
  const result = await obtenerMiAgenda(tecnico, new Date('2026-10-22T14:00:00Z'), db)
  assert.equal(result.indicadores.actividadesHoy, 1)
  assert.equal(result.indicadores.proximasActividades, 1)
  assert.equal(result.indicadores.compromisosPendientes, 1)
  assert.equal(result.hoy[0].id, 'EVENTO:1')
  assert.equal(result.proximas[0].id, 'VISITA:11')
  assert.equal(result.pendientes[0].id, 'COMPROMISO:uuid')
  assert.deepEqual(filtros.find(([k]) => k === 'evento')[1].OR, [
    { responsableId: 7 }, { participantes: { some: { usuarioId: 7, estadoInvitacion: { in: ['ACEPTADA', 'ASIGNADO'] } } } },
  ])
  assert.ok(filtros.filter(([k]) => k === 'visita').every(([, q]) => q.usuarioResponsableId === 7))
  assert.ok(filtros.filter(([k]) => k.startsWith('compromiso')).every(([, q]) => q.visitaOrigen.usuarioResponsableId === 7))
})
test('sin permisos no consulta entidades ni revela registros', async () => {
  const { db, filtros } = dbFalso()
  const result = await obtenerMiAgenda(noAutorizado, new Date('2026-10-22T14:00:00Z'), db)
  assert.equal(filtros.length, 0)
  assert.deepEqual(result.hoy, [])
  assert.deepEqual(result.proximas, [])
  assert.deepEqual(result.pendientes, [])
  assert.equal(result.indicadores.visitasProgramadas, 0)
})
test('evento solo lectura autorizado no obliga a consultar visitas', async () => {
  const { db, filtros } = dbFalso()
  const result = await obtenerMiAgenda({ id: 2, roles: [], permisos: ['PANTALLA_CALENDARIO'] }, new Date('2026-10-22T14:00:00Z'), db)
  assert.equal(result.hoy.length, 1)
  assert.deepEqual(filtros.map(([k]) => k), ['evento'])
})
