import test from 'node:test'
import assert from 'node:assert/strict'
import { fechaLocalGuatemala, periodoDashboard, agruparPorMes } from '../src/modules/dashboard/dashboard-summary.rules.ts'
import { DEPARTAMENTOS, MUNICIPIOS_POR_DEPARTAMENTO, municipioValido } from '../src/modules/profile/guatemala-ubicaciones.ts'

test('340 municipios en 22 departamentos, sin municipios sintéticos', () => {
  assert.equal(DEPARTAMENTOS.length, 22)
  assert.equal(Object.values(MUNICIPIOS_POR_DEPARTAMENTO).reduce((total, lista) => total + lista.length, 0), 340)
  assert.ok(municipioValido('Sololá', 'Santa Lucía Utatlán'))
  assert.ok(municipioValido('Chiquimula', 'Esquipulas'))
  assert.ok(!municipioValido('Chiquimula', 'Municipio Sintético Norte'))
  assert.ok(!municipioValido('Chiquimula', 'Panajachel'))
})

test('fecha local en Guatemala y período mensual cruzan medianoche UTC', () => {
  assert.equal(fechaLocalGuatemala(new Date('2026-10-30T02:00:00Z')), '2026-10-29')
  const periodo = periodoDashboard(new Date('2026-10-30T02:00:00Z'), 3)
  assert.deepEqual(periodo, { hoy: '2026-10-29', desde: '2026-08-01', claves: ['2026-08','2026-09','2026-10'] })
})

test('gráfica incluye solo las visitas realizadas y las capacitaciones del mes', () => {
  const datos = agruparPorMes(['2026-09','2026-10'], [
    {fecha: new Date('2026-09-10T00:00:00Z'), estado:'REALIZADA'},
    {fecha: new Date('2026-09-20T00:00:00Z'), estado:'PROGRAMADA'},
    {fecha: new Date('2026-10-01T00:00:00Z'), estado:'REALIZADA'},
  ], [{ fecha: new Date('2026-09-30T00:00:00Z') }])
  assert.deepEqual(datos.map(({visitas, capacitaciones}) => [visitas,capacitaciones]), [[1,1],[1,0]])
})
