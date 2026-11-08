import test from 'node:test'
import assert from 'node:assert/strict'
import { definirPeriodo, validarFiltrosSemestrales, consolidarSemestre } from '../src/modules/reports/semester.rules.ts'
import { esCoordinacionReportes } from '../src/modules/reports/semester.access.ts'
import { nombreArchivoProduccionExcel } from '../src/modules/reports/semester.excel-data.ts'

test('Rango personalizado: ambos extremos inclusivos y siguiente día exclusivo', () => {
  const filtros = validarFiltrosSemestrales({ anio: '2026', semestre: '2', desde: '2026-03-19', hasta: '2026-08-03' })
  assert.deepEqual(definirPeriodo(filtros), { anio: 2026, semestre: 2, desde: '2026-03-19', hasta: '2026-08-03', hastaExclusivo: '2026-08-04', personalizado: true })
  assert.equal(nombreArchivoProduccionExcel({ filtros, periodo: definirPeriodo(filtros) }), 'Producciones_Agricolas_2026-03-19_2026-08-03.xlsx')
})

test('Rango personalizado: respeta diciembre a enero y año bisiesto', () => {
  const periodo = definirPeriodo(validarFiltrosSemestrales({ anio: '2027', semestre: '1', desde: '2026-12-30', hasta: '2027-01-05' }))
  assert.equal(periodo.hastaExclusivo, '2027-01-06')
  assert.equal(definirPeriodo(validarFiltrosSemestrales({ anio: '2028', semestre: '1', desde: '2028-02-29', hasta: '2028-02-29' })).hastaExclusivo, '2028-03-01')
})

test('Rango personalizado: rechaza fechas incorrectas, incompletas o excesivas', () => {
  for (const cambio of [
    { desde: '2026-03-10' },
    { desde: '2026-02-30', hasta: '2026-03-01' },
    { desde: '2026-05-01', hasta: '2026-04-30' },
    { desde: '2024-01-01', hasta: '2026-12-31' },
  ]) assert.throws(() => validarFiltrosSemestrales({ anio: '2026', semestre: '1', ...cambio }))
})

test('Los datos fuera de rango no se consolidan, incluyendo ventas', () => {
  const periodo = definirPeriodo(validarFiltrosSemestrales({ anio: '2026', semestre: '1', desde: '2026-04-05', hasta: '2026-04-10' }))
  const base = { cicloId: 1, cultivoId: 1, cultivo: 'Tomate', familiaId: 1, familia: 'Familia A', comunidadId: 1, comunidad: 'Los Planes', esDatoPrueba: false }
  const cosecha = (id, fecha) => ({ ...base, id, cantidadPlantas: 10, fechaInicio: fecha, fechaFin: fecha, observaciones: null, detalles: [{ id: id*10, cantidad: '4', tipo: 'kg', unidadCodigo: 'KG' }] })
  const venta = (id, fecha) => ({ ...base, id, cosechaId: 1, fecha, cantidad: '1', tipo: 'kg', unidadCodigo: 'KG', precioUnitario: '10', moneda: 'GTQ', cantidadPrecios: 1 })
  const result = consolidarSemestre(periodo, [cosecha(1, '2026-04-05'), cosecha(2, '2026-04-11')], [venta(1,'2026-04-10'), venta(2,'2026-04-11')])
  assert.equal(result.resumen.cosechas, 1)
  assert.equal(result.resumen.totalVentasOriginalGTQ, '10.00')
})

test('Solo Coordinación puede emitir el Excel, incluso si Dirección puede consultar', () => {
  assert.equal(esCoordinacionReportes(['Coordinadora del programa agroforestal']), true)
  assert.equal(esCoordinacionReportes(['Dirección general']), false)
  assert.equal(esCoordinacionReportes(['Técnico agropecuario']), false)
})
