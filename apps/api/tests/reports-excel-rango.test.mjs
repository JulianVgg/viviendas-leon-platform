import test from 'node:test'
import assert from 'node:assert/strict'
import { definirPeriodo, consolidarSemestre } from '../src/modules/reports/semester.rules.ts'
import { construirExcelSemestral } from '../dist/modules/reports/semester.excel.js'
import ExcelJS from 'exceljs'

test('La descarga personalizada no muestra revisión institucional y conserva ambas hojas', async () => {
  const filtros = { anio: 2026, semestre: 2, desde: '2026-04-15', hasta: '2026-05-22' }
  const informe = { ...consolidarSemestre(definirPeriodo(filtros), [], []), filtros }
  const bytes = await construirExcelSemestral(informe)
  const libro = new ExcelJS.Workbook()
  await libro.xlsx.load(bytes)
  assert.equal(libro.worksheets.length, 2)
  const resumen = libro.getWorksheet('Producciones agrícolas')
  const detalle = libro.getWorksheet('Detalle de registros')
  assert.equal(resumen.getCell('A4').value, 'DEL 2026-04-15 AL 2026-05-22')
  assert.equal(resumen.getCell('A5').value, null)
  assert.match(detalle.getCell('A3').value, /2026-04-15 a 2026-05-22/)
  assert.doesNotMatch(detalle.getCell('A4').value, /Estado|VALIDADO|PRELIMINAR/)
})
