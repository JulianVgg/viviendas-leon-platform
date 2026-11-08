import assert from 'node:assert/strict'
import test from 'node:test'
import { querySemestral, familiasDeComunidad, nombreArchivoReporte } from '../src/features/reports/services/semesterReportFilters.ts'

test('Los parámetros semestrales corresponden al filtro elegido', () => {
  assert.equal(querySemestral({ anio: 2026, semestre: 2 }), 'anio=2026&semestre=2')
  assert.equal(querySemestral({ anio: 2025, semestre: 1, comunidadId: 4, familiaId: 19 }),
    'anio=2025&semestre=1&comunidadId=4&familiaId=19')
})
test('No se incluye un identificador de familia sin seleccionar', () => {
  assert.equal(querySemestral({ anio: 2026, semestre: 2, comunidadId: 2 }), 'anio=2026&semestre=2&comunidadId=2')
})
test('Las familias visibles corresponden únicamente a la comunidad seleccionada', () => {
  const opciones = { comunidades: [], familias: [
    { id: 5, nombreReferencia: 'Familia 1', comunidadId: 1 },
    { id: 6, nombreReferencia: 'Familia 2', comunidadId: 2 },
  ] }
  assert.deepEqual(familiasDeComunidad(opciones, 2).map(f => f.id), [6])
  assert.equal(familiasDeComunidad(opciones).length, 2)
})
test('La descarga distingue los filtros para evitar sobrescritura por confusión', () => {
  assert.equal(nombreArchivoReporte({ anio: 2026, semestre: 2 }), 'Producciones_Agricolas_2026_S2.xlsx')
  assert.equal(nombreArchivoReporte({ anio: 2026, semestre: 2, comunidadId: 1 }), 'Producciones_Agricolas_2026_S2_C1.xlsx')
  assert.equal(nombreArchivoReporte({ anio: 2026, semestre: 2, familiaId: 8 }), 'Producciones_Agricolas_2026_S2_F8.xlsx')
})
