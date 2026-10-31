import test from 'node:test'
import assert from 'node:assert/strict'
import {tipoUnidad, resumirAgricultura, limitesAgricultura, contarVisitasConProduccion} from '../dist/modules/dashboard/agriculture-production.rules.js'
import {obtenerIndicadoresAgricolas} from '../dist/modules/dashboard/agriculture-production.service.js'

const date = (x) => new Date(`${x}T00:00:00Z`)
const ciclo = (id, cultivar, estado, plantas, familia=1, comunidad='Paxub')=>({
  id,estado,cantidadPlantas:plantas,cultivo:{id:cultivar,nombre:cultivar===1?'Tomate':'Lechuga'},
  huerto:{familia:{id:familia,comunidad:{nombre:comunidad}}},
})
const prod = (id, dia, cultivar, detalles)=>({
  id,fechaFinPeriodo:date(dia),cicloCultivo:{cultivo:{id:cultivar,nombre:cultivar===1?'Tomate':'Lechuga'}},
  detalles:detalles.map(([cantidad,codigo,abreviatura=null])=>({cantidadTotal:{toString:()=>String(cantidad)},unidadMedida:{codigo,abreviatura}})),
})

test('MON-04 distingue unidades no equivalentes (kg vs unidad vs manojos)',()=>{
  assert.equal(tipoUnidad('KG',null),'kg')
  assert.equal(tipoUnidad('UNIDAD',null),'unidades')
  assert.equal(tipoUnidad('MANOJO',null),'otra')
})

test('MON-04 cuenta ciclos y familias una sola vez; distingue plantas iniciales',()=>{
  const r=resumirAgricultura([
    ciclo(1,1,'ACTIVO',40,1),ciclo(2,1,'EN_CURSO',20,1),ciclo(3,2,'FINALIZADO',30,2),
  ],[],['2026-10'])
  assert.equal(r.indicadores.ciclosActivos,2)
  assert.equal(r.indicadores.ciclosFinalizados,1)
  assert.equal(r.indicadores.variedadesActivas,1)
  assert.equal(r.indicadores.plantasActivas,60)
  assert.equal(r.indicadores.familiasConSiembras,2)
  assert.equal(r.porCultivo[0].activos,2)
})

test('MON-04 suma producción formal por unidad sin mezclar manojos ni multiplicar plantas',()=>{
  const r=resumirAgricultura([ciclo(1,1,'ACTIVO',40)],[
    prod(1,'2026-10-20',1,[[1.25,'KG'],[12,'UNIDAD'],[3,'MANOJO']]),
    prod(2,'2026-10-22',1,[[2.5,'KILOGRAMO']]),
  ],['2026-09','2026-10'])
  assert.equal(r.indicadores.registrosProduccion,2)
  assert.equal(r.indicadores.produccionKg,3.75)
  assert.equal(r.indicadores.produccionUnidades,12)
  assert.equal(r.indicadores.unidadesNoComparables,1)
  assert.equal(r.produccionMensual[0].kg,0)
  assert.equal(r.produccionMensual[1].kg,3.75)
})

test('MON-04 deja cantidades en cero cuando no hay producción real',()=>{
  const r=resumirAgricultura([ciclo(1,1,'ACTIVO',50)],[],['2026-10'])
  assert.equal(r.indicadores.produccionKg,0)
  assert.equal(r.indicadores.produccionUnidades,0)
  assert.equal(r.indicadores.plantasActivas,50)
})

test('MON-04 período y corte se calculan con horario de Guatemala',()=>{
  const r=limitesAgricultura(new Date('2026-11-01T03:30:00Z'),3)
  assert.equal(r.hoy,'2026-10-31')
  assert.equal(r.desde,'2026-08-01')
})

test('MON-04 informes de visitas se cuentan aparte de cosechas confirmadas',()=>{
  assert.equal(contarVisitasConProduccion([
    {datos:{crops:[{production:true},{production:true}]}},
    {datos:{crops:[{production:false}]}},
    {datos:{crops:[]}},
    {datos:null},
  ]),1)
})

test('MON-04 consulta modelos correctos y mantiene capturas independientes',async()=>{
  const filtros=[]
  const db={
    cicloCultivo:{findMany:async()=>[ciclo(1,1,'ACTIVO',45)]},
    registroProduccion:{findMany:async ({where})=>{filtros.push(where);return [prod(1,'2026-10-24',1,[[12,'KG']])]}},
    visitaCaptura:{findMany:async ({where})=>{filtros.push(where);return [{datos:{crops:[{production:true}]}}]}},
  }
  const r=await obtenerIndicadoresAgricolas(3,db,new Date('2026-10-31T18:00:00Z'))
  assert.equal(r.indicadores.produccionKg,12)
  assert.equal(r.visitasConProduccion,1)
  assert.equal(r.alcance,'INSTITUCIONAL')
  assert.equal(filtros[1].visita.estado,'REALIZADA')
  assert.equal(filtros[0].fechaFinPeriodo.gte.toISOString().slice(0,10),'2026-08-01')
})
