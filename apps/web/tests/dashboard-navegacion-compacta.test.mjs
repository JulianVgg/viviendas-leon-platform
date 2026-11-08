import test from 'node:test'
import assert from 'node:assert/strict'
import { formatoFechaHoraGuatemala } from '../src/features/dashboard/lib/guatemalaDateTime.ts'
import { guardarRetornoDashboard, obtenerRetornoDashboard, consumirPosicionDashboard } from '../src/features/dashboard/lib/dashboardReturn.ts'

test('Dashboard: hora en español y zona de Guatemala', () => {
  const local = formatoFechaHoraGuatemala(new Date('2026-11-08T01:30:00Z'))
  assert.match(local.toLowerCase(), /noviembre/)
  assert.match(local, /2026/)
  assert.match(local, /7/)
  assert.doesNotMatch(local.toLowerCase(), /sunday|saturday|november/)
})

test('Dashboard: conserva filtros, datos y una sola restauración de scroll', () => {
  guardarRetornoDashboard({
    userId: 41, scrollY: 1250, meses: 3, comunidadId: 2, responsableId: 8,
    resumen: null, familiasProgramas: null, indicadoresOperativos: null, agricultura: null, opciones: null,
  })
  assert.equal(obtenerRetornoDashboard(41)?.meses, 3)
  assert.equal(obtenerRetornoDashboard(41)?.comunidadId, 2)
  assert.equal(obtenerRetornoDashboard(99), null)
  assert.equal(consumirPosicionDashboard(99), null)
  assert.equal(consumirPosicionDashboard(41), 1250)
  assert.equal(consumirPosicionDashboard(41), null)
})
