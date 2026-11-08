import test from 'node:test'
import assert from 'node:assert/strict'
import { validarFiltrosSemestrales, definirPeriodo, consolidarSemestre, calcularImporteVenta, paginarPorId } from '../src/modules/reports/semester.rules.ts'

const periodo = definirPeriodo({ anio: 2026, semestre: 2 })
const base = { familiaId: 1, familia: 'Familia de muestra', comunidadId: 1,
  comunidad: 'Paxub', cultivoId: 5, cultivo: 'Tomate', cicloId: 10, cantidadPlantas: 10, esDatoPrueba: false }
const cosecha = (id, fecha, tipo, cantidad, cicloId=10) => ({ ...base, id, cicloId,
  fechaInicio: fecha, fechaFin: fecha, observaciones: null,
  detalles: [{ id: id * 10, cantidad, tipo, unidadCodigo: tipo.toUpperCase() }],
})
const venta = (id, fecha, moneda, cantidad='2.500', precioUnitario='12.25') => ({
  ...base, id, cosechaId: 1, fecha, tipo:'kg', unidadCodigo:'KG',
  cantidad, precioUnitario, moneda, cantidadPrecios: 1,
})

test('CIR-11: semestres exactos y filtros numéricos', () => {
  assert.deepEqual(definirPeriodo({ anio:2026, semestre:1 }),
    { anio:2026, semestre:1, desde:'2026-01-01', hasta:'2026-06-30', hastaExclusivo:'2026-07-01' })
  assert.deepEqual(periodo, { anio:2026, semestre:2, desde:'2026-07-01', hasta:'2026-12-31', hastaExclusivo:'2027-01-01' })
  assert.deepEqual(validarFiltrosSemestrales({ anio:'2026', semestre:'2', comunidadId:'3', familiaId:'7' }),
    { anio:2026, semestre:2, comunidadId:3, familiaId:7 })
  for (const query of [{anio:'2026',semestre:'3'}, {anio:'x',semestre:'1'},
    {anio:'2026',semestre:'1',familiaId:'-1'}, {anio:'2026',semestre:'1',comunidadId:['1','2']}]) {
    assert.throws(() => validarFiltrosSemestrales(query))
  }
})
test('CIR-11: kg/unidades/manojos se mantienen independientes', () => {
  const out = consolidarSemestre(periodo, [
    cosecha(1,'2026-07-01','kg','10.125'),
    cosecha(2,'2026-12-31','unidades','12'),
    cosecha(3,'2026-08-01','manojos','4'),
  ], [])
  assert.deepEqual(out.resumen.cantidades, { kg:'10.125', unidades:'12', manojos:'4' })
  assert.equal(out.porCultivo[0].plantasInicialesRegistradas, 10)
  assert.equal(out.porCultivo[0].produccionPorPlanta.kg, null)
  assert.equal(out.porCultivo[0].produccionPorPlanta.motivo, 'PLANTAS_PRODUCTIVAS_NO_VERIFICADAS')
  assert.equal(out.resumen.cosechas, 3)
})
test('CIR-11: no incluye estimaciones ni precios de referencia', () => {
  const out = consolidarSemestre(periodo, [cosecha(1,'2026-08-01','kg','10')], [])
  assert.equal(out.resumen.totalVentasOriginalGTQ, '0.00')
  assert.equal(out.resumen.totalVentasOriginalUSD, '0.00')
  assert.equal(out.detalleVentas.length, 0)
})
test('CIR-11: registra importes en monedas originales sin sumarlas ni convertirlas', () => {
  const out = consolidarSemestre(periodo, [], [
    venta(1,'2026-08-01','GTQ'),
    venta(2,'2026-08-01','USD','1','0.20'),
  ])
  assert.equal(out.resumen.totalVentasOriginalGTQ, '30.63')
  assert.equal(out.resumen.totalVentasOriginalUSD, '0.20')
  assert.equal(out.resumen.ventasConImporte, 2)
  assert.equal(calcularImporteVenta('0.001','0.0001'), 0n)
})
test('CIR-11: venta de cosecha anterior pertenece al semestre de la VENTA', () => {
  const out = consolidarSemestre(periodo,
    [cosecha(3,'2026-06-28','kg','10')], [venta(1,'2026-08-01','GTQ')])
  assert.equal(out.resumen.cosechas, 0)
  assert.equal(out.resumen.ventas, 1)
  assert.equal(out.porCultivo[0].kg, '0')
})
test('CIR-11: períodos cruzados se señalan sin asignar cantidades arbitrarias', () => {
  const cross = { ...cosecha(1,'2026-07-01','kg','4'), fechaInicio:'2026-06-29' }
  const out = consolidarSemestre(periodo,[cross],[])
  assert.equal(out.resumen.cosechas, 0)
  assert.equal(out.resumen.excluidasCrucePeriodo, 1)
  assert.equal(out.advertencias[0].codigo, 'PERIODO_CRUZADO')
})
test('CIR-11: datos incompletos y unidades desconocidas no se suman', () => {
  const out = consolidarSemestre(periodo,[cosecha(1,'2026-08-01','otra','5')], [
    {...venta(1,'2026-08-01','GTQ'), precioUnitario:null, cantidadPrecios:0},
    {...venta(2,'2026-08-01','USD'), cantidad:'2.5', tipo:'manojos'},
  ])
  assert.equal(out.resumen.datosIncompletos, 3)
  assert.equal(out.resumen.totalVentasOriginalGTQ, '0.00')
  assert.equal(out.resumen.ventasConImporte, 0)
})
test('CIR-11: omite datos de prueba y evita IDs duplicados', () => {
  const out = consolidarSemestre(periodo, [cosecha(1,'2026-08-01','kg','10'),
    cosecha(1,'2026-08-01','kg','10'),
    {...cosecha(2,'2026-08-01','kg','99'), esDatoPrueba:true}],
  [venta(1,'2026-08-01','GTQ'), venta(1,'2026-08-01','GTQ')])
  assert.equal(out.resumen.cosechas, 1)
  assert.equal(out.resumen.excluidasPrueba, 1)
  assert.equal(out.resumen.cantidades.kg, '10')
  assert.equal(out.resumen.ventas, 1)
})
test('CIR-11: 1001 cosechas no se recortan a 500', () => {
  const items = Array.from({length:1001}, (_,i)=>cosecha(i+1,'2026-08-01','kg','1',i+1))
  const out = consolidarSemestre(periodo,items,[])
  assert.equal(out.resumen.cosechas,1001)
  assert.equal(out.resumen.cantidades.kg,'1001')
})

test('CIR-11: la paginación de consulta obtiene 1001 filas sin límite de 500', async () => {
  const ids = Array.from({ length:1001 }, (_, i)=>({id:i+1}))
  const data = await paginarPorId(async (cursor, take)=>{
    const inicio = cursor === undefined ? 0 : cursor
    return ids.slice(inicio, inicio + take)
  })
  assert.equal(data.length, 1001)
  assert.equal(data[500].id, 501)
  assert.equal(data[1000].id, 1001)
})
test('CIR-11: cosecha sin detalle genera advertencia, no cantidad inventada', () => {
  const out = consolidarSemestre(periodo,[{...cosecha(1,'2026-08-01','kg','10'), detalles:[]}],[])
  assert.equal(out.resumen.datosIncompletos, 1)
  assert.equal(out.advertencias[0].codigo, 'COSECHA_SIN_DETALLES')
  assert.equal(out.resumen.cantidades.kg,'0')
})

test('CIR-11: movimientos con distintos IDs pero contenidos idénticos quedan marcados para revisión', () => {
  const out = consolidarSemestre(periodo,[
    cosecha(1,'2026-08-01','kg','10'), cosecha(2,'2026-08-01','kg','10'),
  ],[venta(1,'2026-08-05','GTQ'), venta(2,'2026-08-05','GTQ')])
  assert.equal(out.resumen.posiblesDuplicados,2)
  assert.ok(out.advertencias.some(a=>a.codigo==='POSIBLE_COSECHA_DUPLICADA'))
  assert.ok(out.advertencias.some(a=>a.codigo==='POSIBLE_VENTA_DUPLICADA'))
})
