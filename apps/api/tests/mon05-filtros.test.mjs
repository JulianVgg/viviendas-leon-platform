import test from 'node:test'
import assert from 'node:assert/strict'
import { validarFiltrosMon05, filtroCiclo, filtroVisita, filtroCapacitacion } from '../dist/modules/dashboard/mon05-filters.js'
import { obtenerResumenDashboard } from '../dist/modules/dashboard/dashboard-summary.service.js'
import { obtenerIndicadoresVisitasCapacitaciones } from '../dist/modules/dashboard/visits-training.service.js'
import { obtenerIndicadoresAgricolas } from '../dist/modules/dashboard/agriculture-production.service.js'
import { obtenerDetalleIndicador } from '../dist/modules/dashboard/dashboard-detail.service.js'
import { obtenerIndicadoresFamiliasProgramas } from '../dist/modules/dashboard/families-programs.service.js'

const direccion = { id: 1, roles:['Dirección general'], permisos: [] }
const tecnico = { id: 7, roles:['Técnico agropecuario'], permisos: [] }
const fecha = day => new Date(`${day}T00:00:00Z`)

test('MON-05 valida identificadores positivos y restringe filtros institucionales', () => {
  assert.deepEqual(validarFiltrosMon05({ comunidadId:'12', responsableId:'7' }, true), { comunidadId:12, responsableId:7 })
  assert.deepEqual(validarFiltrosMon05({}, false), {})
  assert.throws(()=>validarFiltrosMon05({comunidadId:'0'}, true))
  assert.throws(()=>validarFiltrosMon05({comunidadId:'1 OR 1=1'}, true))
  assert.throws(()=>validarFiltrosMon05({responsableId:'7'}, false), /no autorizado/i)
  assert.throws(()=>validarFiltrosMon05({comunidadId:'12'}, false), /no autorizado/i)
  assert.deepEqual(filtroVisita({comunidadId:12,responsableId:7}), {familia:{comunidadId:12},usuarioResponsableId:7})
  assert.deepEqual(filtroCapacitacion({comunidadId:12,responsableId:7}), {comunidadId:12,usuarioResponsableId:7})
  assert.deepEqual(filtroCiclo({comunidadId:12}), {huerto:{familia:{comunidadId:12}}})
})

test('MON-05 Dashboard aplica comunidad y responsable a consultas correspondientes', async () => {
  const queries = []
  const db = {
    visita: {findMany:async q=>{queries.push(['visita',q.where]);return []},count:async q=>{queries.push(['vencida',q.where]);return 0}},
    capacitacion:{findMany:async q=>{queries.push(['capacitacion',q.where]);return []}},
    familia:{count:async q=>{queries.push(['familia',q.where]);return 3}},
    huerto:{count:async q=>{queries.push(['huerto',q.where]);return 2}},
    cicloCultivo:{count:async q=>{queries.push(['ciclo',q.where]);return 1}},
    programa:{findMany:async q=>{queries.push(['programa',q.select]);return [{id:5,nombre:'Huertos',familias:[{familiaId:9},{familiaId:10}]}]}},
  }
  const result = await obtenerResumenDashboard(direccion,6,db,{comunidadId:12,responsableId:7})
  assert.equal(result.indicadores.familias,3)
  assert.deepEqual(result.programas,[{id:5,nombre:'Huertos',familias:2}])
  assert.equal(queries.find(([name])=>name==='visita')[1].usuarioResponsableId,7)
  assert.equal(queries.find(([name])=>name==='visita')[1].familia.comunidadId,12)
  assert.equal(queries.find(([name])=>name==='capacitacion')[1].comunidadId,12)
  assert.deepEqual(queries.find(([name])=>name==='familia')[1], {comunidadId:12})
  assert.deepEqual(queries.find(([name])=>name==='huerto')[1].familia, {comunidadId:12})
  assert.deepEqual(queries.find(([name])=>name==='ciclo')[1].huerto.familia, {comunidadId:12})
  assert.deepEqual(queries.find(([name])=>name==='programa')[1].familias.where.familia,{comunidadId:12})
  assert.ok(queries.find(([name])=>name==='vencida')[1].fecha.gte instanceof Date)
})

test('MON-05 responsable externo nunca sustituye al usuario técnico', async () => {
  const queries=[]
  const db={visita:{findMany:async q=>{queries.push(q.where);return []}},capacitacion:{findMany:async q=>{queries.push(q.where);return []}}}
  await obtenerIndicadoresVisitasCapacitaciones(tecnico,3,db,fecha('2026-10-30'),{responsableId:33,comunidadId:12})
  assert.ok(queries.every(q=>q.usuarioResponsableId===7 && !q.familia && !q.comunidadId))
})

test('MON-05 filtra ambas actividades por responsable y comunidad', async () => {
  const queries=[]
  const db={visita:{findMany:async q=>{queries.push(q.where);return []}},capacitacion:{findMany:async q=>{queries.push(q.where);return []}}}
  await obtenerIndicadoresVisitasCapacitaciones(direccion,6,db,fecha('2026-10-30'),{responsableId:7,comunidadId:12})
  assert.equal(queries[0].familia.comunidadId,12)
  assert.equal(queries[0].usuarioResponsableId,7)
  assert.equal(queries[1].comunidadId,12)
  assert.equal(queries[1].usuarioResponsableId,7)
})

test('MON-05 filtra datos agrícolas y capturas sin convertirlas en producción confirmada',async()=>{
  const queries=[]
  const db={cicloCultivo:{findMany:async q=>{queries.push(q.where);return []}},registroProduccion:{findMany:async q=>{queries.push(q.where);return []}},visitaCaptura:{findMany:async q=>{queries.push(q.where);return []}}}
  const result=await obtenerIndicadoresAgricolas(3,db,fecha('2026-10-30'),{comunidadId:12,responsableId:7})
  assert.equal(result.indicadores.registrosProduccion,0)
  assert.deepEqual(queries[0].huerto.familia,{comunidadId:12})
  assert.deepEqual(queries[1].cicloCultivo.huerto.familia,{comunidadId:12})
  assert.deepEqual(queries[2].visita.familia,{comunidadId:12})
  assert.equal(queries[2].visita.usuarioResponsableId,undefined)
})

test('MON-05 detalle paginado usa exactamente los mismos filtros que su indicador',async()=>{
  const queries=[]
  const db={visita:{count:async q=>{queries.push(q.where);return 13},findMany:async q=>{queries.push(q.where); assert.equal(q.skip,10);return []}}}
  const result=await obtenerDetalleIndicador(direccion,'visitas',6,2,10,db,fecha('2026-10-30'),{comunidadId:12,responsableId:7})
  assert.equal(result.total,13)
  assert.ok(queries.every(q=>q.familia.comunidadId===12 && q.usuarioResponsableId===7 && q.estado==='REALIZADA'))
})

test('MON-05 MON-02 considera solo familias de la comunidad',async()=>{
  const captured=[]
  const db={familia:{findMany:async q=>{captured.push(q.where);return [{id:2,comunidad:{nombre:'Paxub'},programas:[]}]}}, programa:{findMany:async()=>[]}}
  const result=await obtenerIndicadoresFamiliasProgramas(db,fecha('2026-10-30'),{comunidadId:12})
  assert.equal(result.totalFamilias,1)
  assert.deepEqual(captured,[{comunidadId:12}])
})
