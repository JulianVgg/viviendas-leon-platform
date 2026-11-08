import test from 'node:test'
import assert from 'node:assert/strict'
import { consolidarSemestre, definirPeriodo } from '../src/modules/reports/semester.rules.ts'
import { prepararFilasProduccionExcel, nombreArchivoProduccionExcel, textoSeguroExcel } from '../src/modules/reports/semester.excel-data.ts'

const filtros = { anio: 2026, semestre: 2 }
const base = { cicloId: 5, cultivoId: 3, cultivo: 'Tomate', familiaId: 8,
  familia: 'Familia de prueba funcional', comunidadId: 2, comunidad: 'Comunidad de muestra',
  cantidadPlantas: 20, esDatoPrueba: false }
const cosecha = (id, tipo, cantidad, obs = null) => ({ ...base, id,
  fechaInicio: '2026-09-01', fechaFin: '2026-09-01', observaciones: obs,
  detalles: [{ id: id * 10, tipo, cantidad, unidadCodigo: tipo.toUpperCase() }],
})
const venta = (id, moneda = 'GTQ', precioUnitario = '12.0000', unidad = 'kg') => ({
  ...base, id, cosechaId: 1, fecha: '2026-09-02', tipo: unidad, unidadCodigo: unidad.toUpperCase(),
  cantidad: '2', precioUnitario, moneda, cantidadPrecios: 1,
})
const informe = (cosechas, ventas) => ({ ...consolidarSemestre(definirPeriodo(filtros), cosechas, ventas), filtros })

test('CIR-12: conserva las 12 columnas y deja por planta sin valores inventados', () => {
  const [f] = prepararFilasProduccionExcel(informe([cosecha(1, 'kg', '20.125')], []))
  assert.deepEqual(Object.keys(f), ['numero','cultivo','plantasIniciales','unidadesPorPlanta',
    'kgPorPlanta','unidades','kg','precioGTQ','precioUSD','ventasGTQ','ventasUSD','observaciones'])
  assert.equal(f.plantasIniciales, 20)
  assert.equal(f.kg, 20.125)
  assert.equal(f.unidades, null)
  assert.equal(f.kgPorPlanta, null)
  assert.equal(f.unidadesPorPlanta, null)
  assert.equal(f.ventasGTQ, null)
})

test('CIR-12: conserva GTQ y USD en monedas ORIGINALES', () => {
  const [f] = prepararFilasProduccionExcel(informe([cosecha(1, 'kg', '10')], [
    venta(1,'GTQ','12'), venta(2,'USD','1.5'),
  ]))
  assert.equal(f.ventasGTQ, 24)
  assert.equal(f.ventasUSD, 3)
  assert.equal(f.precioGTQ, 12)
  assert.equal(f.precioUSD, 1.5)
  assert.match(f.observaciones, /Precio GTQ por kg/)
})

test('CIR-12: no usa precio promedio ni uno arbitrario si hubo precios variables', () => {
  const [f] = prepararFilasProduccionExcel(informe([cosecha(1, 'kg', '10')], [
    venta(1,'GTQ','12'), venta(2,'GTQ','14'),
  ]))
  assert.equal(f.precioGTQ, null)
  assert.equal(f.ventasGTQ, 52)
  assert.match(f.observaciones, /Precios GTQ variables/)
})

test('CIR-12: conserva manojos en observaciones sin sumarlos con kg', () => {
  const [f] = prepararFilasProduccionExcel(informe([cosecha(1, 'kg', '2'), cosecha(2, 'manojos', '7')], []))
  assert.equal(f.kg, 2)
  assert.match(f.observaciones, /Manojos cosechados: 7/)
})

test('CIR-12: observaciones auténticas, sin texto convertido a fórmula', () => {
  const f = prepararFilasProduccionExcel(informe([cosecha(1, 'kg', '2', '=HYPERLINK("evil")')], []))[0]
  assert.match(f.observaciones, /^'/)
  assert.equal(textoSeguroExcel('+SUM(A1)'), "'+SUM(A1)")
  assert.equal(textoSeguroExcel('Huerto sano'), 'Huerto sano')
})

test('CIR-12: el detalle para precio y observaciones usa ID del cultivo, no solo nombre', () => {
  const otra = { ...base, cicloId: 7, cultivoId: 4, cantidadPlantas: 14 }
  const c2 = { ...cosecha(2,'kg','5','Solo otro cultivo'), ...otra,
    detalles: [{ id: 20, tipo:'kg', cantidad:'5', unidadCodigo:'KG' }] }
  const v2 = { ...venta(2, 'USD', '4'), ...otra, cosechaId: 2 }
  const filas = prepararFilasProduccionExcel(informe([cosecha(1, 'kg', '10'), c2], [venta(1),v2]))
  const f1 = filas.find(f => f.numero === 1)
  const f2 = filas.find(f => f.numero === 2)
  assert.ok(f1 && f2)
  assert.equal(f1.precioGTQ, 12)
  assert.equal(f1.ventasUSD, null)
  assert.equal(f2.ventasGTQ, null)
  assert.equal(f2.ventasUSD, 8)
})

test('CIR-12: nombres de archivo dependen exclusivamente de filtros validados', () => {
  const dato = informe([], [])
  assert.equal(nombreArchivoProduccionExcel(dato), 'Producciones_Agricolas_2026_S2.xlsx')
  assert.equal(nombreArchivoProduccionExcel({ ...dato, filtros: { ...filtros, familiaId: 4, comunidadId: 3 } }),
    'Producciones_Agricolas_2026_S2_C3_F4.xlsx')
})

test('CIR-12: reporte sin datos se puede representar sin inventar totales', () => {
  const data = informe([], [])
  assert.deepEqual(prepararFilasProduccionExcel(data), [])
  assert.equal(data.estadoValidacion, 'PRELIMINAR')
})
