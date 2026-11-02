import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  seriesActividad, seriesCobertura, seriesProgramas, seriesComunidadesFamilias,
  seriesActividadResponsables, seriesProduccion, seriesComunidadesAgricolas,
} from '../src/features/dashboard/lib/chartSeries.ts'

test('MON-01: visitas y capacitaciones usan los datos mensuales y no valores demo', () => {
  const result = seriesActividad([
    { mes: '2026-09', etiqueta: 'sep', visitas: 2, capacitaciones: 0 },
    { mes: '2026-10', etiqueta: 'oct', visitas: 17, capacitaciones: 1 },
  ])
  assert.deepEqual(result.labels, ['sep', 'oct'])
  assert.deepEqual(result.series.map(s => s.data), [[2, 17], [0, 1]])
})

test('MON-02: cobertura institucional no suma doble la participación por programas', () => {
  const datos = {
    totalFamilias: 6,
    familiasConPrograma: 4,
    familiasSinPrograma: 2,
    programas: [
      { id: 1, nombre: 'Huertos', familias: 3, porcentaje: 50 },
      { id: 2, nombre: 'Becas', familias: 3, porcentaje: 50 },
    ],
    comunidades: [],
  }
  assert.deepEqual(seriesCobertura(datos, 'todos').values, [4, 2])
  assert.deepEqual(seriesCobertura(datos, 1).values, [3, 3])
  assert.deepEqual(seriesProgramas(datos).series[0].data, [3, 3])
})

test('MON-02: comunidades muestran cantidad de familias y participantes por separado', () => {
  const result = seriesComunidadesFamilias({ comunidades: [{ nombre: 'Los Planes', total: 7, conPrograma: 5 }] })
  assert.deepEqual(result.labels, ['Los Planes'])
  assert.deepEqual(result.series.map(x => x.data), [[7], [5]])
})

test('MON-03: cada responsable mantiene visitas y capacitaciones separadas', () => {
  const result = seriesActividadResponsables([
    { id: '1', nombre: 'Técnico A', visitas: 5, capacitaciones: 2 },
    { id: '2', nombre: 'Técnico B', visitas: 3, capacitaciones: 1 },
  ])
  assert.deepEqual(result.labels, ['Técnico A', 'Técnico B'])
  assert.deepEqual(result.series.map(x => x.data), [[5, 3], [2, 1]])
})

test('MON-04: producción mensual en kilogramos no se suma a unidades', () => {
  const datos = { produccionMensual: [
    { mes: '2026-09', kg: 5.5, unidades: 10, registros: 1 },
    { mes: '2026-10', kg: 9, unidades: 20, registros: 3 },
  ] }
  assert.deepEqual(seriesProduccion(datos, 'kg').series[0].data, [5.5, 9])
  assert.deepEqual(seriesProduccion(datos, 'unidades').series[0].data, [10, 20])
})

test('MON-04: comunidad no confunde ciclos activos con familias', () => {
  const result = seriesComunidadesAgricolas({ porComunidad: [{ nombre: 'Paxub', familias: 3, ciclosActivos: 8 }] })
  assert.deepEqual(result.series.map(x => x.data), [[8], [3]])
})

test('adaptadores mantienen series vacías si aún no existen registros', () => {
  assert.deepEqual(seriesActividad([]).series.map(s => s.data), [[], []])
  assert.deepEqual(seriesActividadResponsables([]).labels, [])
  assert.deepEqual(seriesProduccion({ produccionMensual: [] }, 'kg').series[0].data, [])
})
