import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { agregarEquivalenciaMonetaria } from '../dist/modules/reports/semester.exchange-sheet.js'

test('Excel presenta tasa institucional y equivalencia sin modificar ventas originales', () => {
  const book = new ExcelJS.Workbook()
  const informe = {
    resumen: { totalVentasOriginalGTQ: '6910.10', totalVentasOriginalUSD: '0.00', totalVentasEquivalenteUSD: '909.22' },
    tipoCambioInstitucional: { quetzalesPorDolar: '7.6', actualizadoEn: '2026-11-20T00:00:00.000Z' },
  }
  agregarEquivalenciaMonetaria(book, informe)
  const sheet = book.getWorksheet('Equivalencia USD')
  assert.ok(sheet)
  assert.equal(sheet.getRow(2).getCell(2).value, 6910.10)
  assert.equal(sheet.getRow(3).getCell(2).value, 0)
  assert.equal(sheet.getRow(4).getCell(2).value, 7.6)
  assert.equal(sheet.getRow(5).getCell(2).value, 909.22)
  assert.equal(informe.resumen.totalVentasOriginalGTQ, '6910.10')
})
