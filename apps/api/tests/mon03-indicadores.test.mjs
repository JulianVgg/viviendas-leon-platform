import test from 'node:test'
import assert from 'node:assert/strict'
import { limitesMon03, clasificarVisita, resumirActividadOperativa } from '../dist/modules/dashboard/visits-training.rules.js'
import { obtenerIndicadoresVisitasCapacitaciones } from '../dist/modules/dashboard/visits-training.service.js'
import { obtenerDetalleIndicador } from '../dist/modules/dashboard/dashboard-detail.service.js'

const fecha = (dia) => new Date(`${dia}T00:00:00Z`)
const responsable = {nombre:'Técnico',apellido:'Uno'}
const visita = (id, dia, estado, reprogramaciones=[]) => ({id,fecha:fecha(dia),estado,usuarioResponsableId:7,usuarioResponsable:responsable,reprogramaciones})
const capacitacion = (id,dia,estado) => ({id,fecha:fecha(dia),estado,usuarioResponsableId:7,usuarioResponsable:responsable})

test('MON-03 respeta la fecha de Guatemala y el fin del mes vigente',()=>{
  assert.deepEqual(limitesMon03(new Date('2026-10-31T03:00:00Z'),3),{
    desde:'2026-08-01',hasta:'2026-10-31',hoy:'2026-10-30'
  })
  assert.equal(clasificarVisita('PROGRAMADA',fecha('2026-10-29'),'2026-10-30'),'vencida')
  assert.equal(clasificarVisita('PROGRAMADA',fecha('2026-10-30'),'2026-10-30'),'programada')
  assert.equal(clasificarVisita('REALIZADA',fecha('2026-10-29'),'2026-10-30'),'realizada')
})

test('MON-03 separa realizadas, vencidas, reprogramadas y capacitaciones sin duplicar visitas',()=>{
  const resultado=resumirActividadOperativa([
    visita(1,'2026-10-08','REALIZADA',[{id:9},{id:10}]),
    visita(2,'2026-10-10','PROGRAMADA'),visita(3,'2026-10-31','PROGRAMADA'),
  ],[capacitacion(1,'2026-10-10','REALIZADA'),capacitacion(2,'2026-10-31','PROGRAMADA')],'2026-10-30')
  assert.deepEqual(resultado.visitas,{realizadas:1,programadas:1,vencidas:1,reprogramadas:1})
  assert.deepEqual(resultado.capacitaciones,{realizadas:1,programadas:1,otras:0})
  assert.deepEqual(resultado.porResponsable.map(r=>[r.id,r.visitas,r.capacitaciones]),[['7',1,1]])
})

test('MON-03 técnico consulta exclusivamente sus actividades',async()=>{
  const filtros=[]
  const db={
    visita:{findMany:async args=>{filtros.push(args.where);return [visita(1,'2026-10-08','REALIZADA')]}},
    capacitacion:{findMany:async args=>{filtros.push(args.where);return []}},
  }
  const r=await obtenerIndicadoresVisitasCapacitaciones({id:7,roles:['Técnico agropecuario'],permisos:[]},3,db,new Date('2026-10-30T20:00:00Z'))
  assert.equal(r.alcance,'PERSONAL')
  assert.equal(r.visitas.realizadas,1)
  assert.deepEqual(filtros.map(f=>f.usuarioResponsableId),[7,7])
})

test('MON-03 Dirección consulta totales institucionales',async()=>{
  const filtros=[]
  const db={visita:{findMany:async args=>{filtros.push(args.where);return []}},capacitacion:{findMany:async args=>{filtros.push(args.where);return []}}}
  const r=await obtenerIndicadoresVisitasCapacitaciones({id:1,roles:['Dirección general'],permisos:[]},3,db)
  assert.equal(r.alcance,'INSTITUCIONAL')
  assert.ok(filtros.every(f=>!('usuarioResponsableId' in f)))
})

test('detalle de tarjeta bloquea familias para técnico sin realizar consultas',async()=>{
  const db={familia:{count:()=>{throw new Error('no debe consultar')}}}
  const result=await obtenerDetalleIndicador({id:7,roles:['Técnico agropecuario'],permisos:[]},'familias',6,1,10,db)
  assert.equal(result,null)
})

test('detalle de visitas usa filtro de propietario, fecha y paginación',async()=>{
  const filtros=[]
  const db={visita:{
    count:async ({where})=>{filtros.push(where);return 15},
    findMany:async args=>{filtros.push(args.where);assert.equal(args.skip,10);assert.equal(args.take,10);return [
      {id:8,fecha:fecha('2026-10-18'),estado:'REALIZADA',familia:{nombreReferencia:'Familia B',comunidad:{nombre:'Paxub'}},usuarioResponsable:responsable}
    ]},
  }}
  const r=await obtenerDetalleIndicador({id:7,roles:['Técnico agropecuario'],permisos:[]},'visitas',3,2,10,db,new Date('2026-10-30T20:00:00Z'))
  assert.equal(r.totalPaginas,2)
  assert.equal(r.registros[0].titulo,'Familia B')
  assert.ok(filtros.every(f=>f.usuarioResponsableId===7 && f.estado==='REALIZADA'))
})
