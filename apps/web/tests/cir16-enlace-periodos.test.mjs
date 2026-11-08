import test from 'node:test'
import assert from 'node:assert/strict'
import {construirEnlaceReportesDashboard, leerEnlaceReportesDashboard} from '../src/features/reports/services/semesterReportFilters.ts'

test('CIR-16: Dashboard abre Reportes con igual rango y comunidad',()=>{
  const url=construirEnlaceReportesDashboard({desde:'2026-08-01',hasta:'2026-11-07',comunidadId:5})
  assert.equal(url.startsWith('/reportes/reportes?'),true)
  assert.deepEqual(leerEnlaceReportesDashboard(url.split('?')[1]),{
    desde:'2026-08-01',hasta:'2026-11-07',comunidadId:5,
  })
})

test('CIR-16: el enlace solo acepta períodos válidos',()=>{
  assert.equal(leerEnlaceReportesDashboard('modo=rango&desde=2026-02-30&hasta=2026-11-07'),null)
  assert.equal(leerEnlaceReportesDashboard('modo=rango&desde=2026-12-31&hasta=2026-11-01'),null)
  assert.equal(leerEnlaceReportesDashboard('modo=rango&desde=2020-01-01&hasta=2026-11-07'),null)
  assert.equal(leerEnlaceReportesDashboard('modo=semestre&desde=2026-08-01&hasta=2026-11-07'),null)
})
