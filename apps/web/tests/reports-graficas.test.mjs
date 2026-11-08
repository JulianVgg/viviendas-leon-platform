import assert from 'node:assert/strict'
import test from 'node:test'
import { prepararGraficasReporte } from '../src/features/reports/services/semesterReportCharts.ts'
import { querySemestral, nombreArchivoReporte } from '../src/features/reports/services/semesterReportFilters.ts'

test('Los filtros incluyen fechas personalizadas y mantienen comunidad y familia', () => {
  const filtros = { anio: 2026, semestre: 2, desde: '2026-01-15', hasta: '2026-02-15', comunidadId: 3, familiaId: 2 }
  assert.equal(querySemestral(filtros), 'anio=2026&semestre=2&desde=2026-01-15&hasta=2026-02-15&comunidadId=3&familiaId=2')
  assert.equal(nombreArchivoReporte(filtros), 'Producciones_Agricolas_2026-01-15_2026-02-15_F2.xlsx')
})

test('Las gráficas separan las monedas y no suman unidades a kilogramos', () => {
  const informe = {
    periodo: { desde: '2026-01-15', hasta: '2026-03-02' },
    detalleCosechas: [
      { id: 1, fechaInicio: '2026-01-16', cantidad: '2.5', unidad: 'kg' },
      { id: 2, fechaInicio: '2026-02-10', cantidad: '999', unidad: 'unidades' },
      { id: 3, fechaInicio: '2026-03-02', cantidad: '1.0', unidad: 'kg' },
    ],
    detalleVentas: [
      { id: 1, fecha: '2026-01-20', moneda: 'GTQ', importe: '12.50' },
      { id: 2, fecha: '2026-01-25', moneda: 'USD', importe: '2.10' },
      { id: 3, fecha: '2026-02-20', moneda: 'GTQ', importe: null },
    ],
    porCultivo: [{ cultivoId: 1, cultivo: 'Tomate', kg: '2.5' }, { cultivoId: 2, cultivo: 'Rábano', kg: '1.0' }],
  }
  const datos = prepararGraficasReporte(informe)
  assert.equal(datos.etiquetas.length, 3)
  assert.deepEqual(datos.kilos, [2.5, 0, 1])
  assert.deepEqual(datos.gtq, [12.5, 0, 0])
  assert.deepEqual(datos.usd, [2.1, 0, 0])
  assert.deepEqual(datos.cultivos.map(v => v.nombre), ['Tomate', 'Rábano'])
})
