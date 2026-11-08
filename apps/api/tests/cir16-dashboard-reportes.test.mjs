import test from 'node:test'
import assert from 'node:assert/strict'
import { consolidarSemestre, definirPeriodo } from '../dist/modules/reports/semester.rules.js'
import { resumirAgricultura, aplicarConsolidadoInstitucional } from '../dist/modules/dashboard/agriculture-production.rules.js'

const fecha = '2026-11-05'
const ciclo = {
  id: 1, estado: 'ACTIVO', cantidadPlantas: 30,
  cultivo: {id:5,nombre:'Tomate'}, huerto:{familia:{id:1,comunidad:{nombre:'Paxub'}}},
}
const cosecha = (id, dia, cantidad, ajustes = {}) => ({
  id, cicloId:1, cultivoId:5, cultivo:'Tomate', familiaId:1, familia:'Familia ejemplo',
  comunidadId:1, comunidad:'Paxub', cantidadPlantas:30, fechaInicio:dia, fechaFin:dia,
  observaciones:null, esDatoPrueba:false,
  detalles:[{id:id*10,cantidad,tipo:'kg',unidadCodigo:'KG'}], ...ajustes,
})
const periodo = definirPeriodo({anio:2026,semestre:2,desde:'2026-09-01',hasta:'2026-11-07'})

test('CIR-16: Dashboard usa las mismas cantidades que el consolidado CIR-11', () => {
  const consolidado = consolidarSemestre(periodo, [
    cosecha(1,fecha,'2.125'),
    cosecha(2,'2026-10-20','4.500'),
    cosecha(3,'2026-10-20','100',{esDatoPrueba:true}),
    cosecha(4,'2026-08-31','9',{fechaFin:'2026-09-02'}),
  ], [])
  const base = resumirAgricultura([ciclo], [], ['2026-09','2026-10','2026-11'])
  const dashboard = aplicarConsolidadoInstitucional(base, consolidado, ['2026-09','2026-10','2026-11'])
  assert.equal(dashboard.indicadores.produccionKg, Number(consolidado.resumen.cantidades.kg))
  assert.equal(dashboard.indicadores.registrosProduccion, consolidado.resumen.cosechas)
  assert.equal(dashboard.porCultivo[0].kg, Number(consolidado.porCultivo[0].kg))
  assert.deepEqual(dashboard.produccionMensual.map(m=>m.kg), [0,4.5,2.125])
  assert.equal(dashboard.conciliacion.excluidasPrueba, 1)
  assert.equal(dashboard.conciliacion.excluidasCrucePeriodo, 1)
  assert.equal(dashboard.indicadores.ciclosActivos, 1)
})

test('CIR-16: no mezcla unidades y mantiene indicadores de ciclos sin modificación', () => {
  const con = consolidarSemestre(periodo,[
    cosecha(1,fecha,'5',{detalles:[
      {id:10,tipo:'kg',cantidad:'5.125',unidadCodigo:'KG'},
      {id:11,tipo:'unidades',cantidad:'4',unidadCodigo:'UNIDAD'},
      {id:12,tipo:'manojos',cantidad:'2',unidadCodigo:'MANOJO'},
    ]}),
  ],[])
  const resumen = aplicarConsolidadoInstitucional(resumirAgricultura([ciclo],[],['2026-11']),con,['2026-11'])
  assert.equal(resumen.indicadores.produccionKg,5.125)
  assert.equal(resumen.indicadores.produccionUnidades,4)
  assert.equal(resumen.indicadores.produccionManojos,2)
  assert.equal(resumen.indicadores.plantasActivas,30)
  assert.equal(resumen.indicadores.ciclosActivos,1)
})
