import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { puedeExportarReporteAgricola } from '../dist/modules/reports/semester.access.js'
import { validarVistaExcel, construirExcelCategoria, construirExcelControlFinanciero } from '../dist/modules/reports/semester.excel-views.js'

const informe = {
  periodo: { anio: 2026, semestre: 2, desde: '2026-07-01', hasta: '2026-12-31' },
  resumen: { ventas: 1, ventasConImporte: 1, totalVentasOriginalGTQ: '160.00', totalVentasOriginalUSD: '0.00' },
  porCultivo: [{ cultivo: '=2+2', ventas: 1, totalVentasOriginalGTQ: '160.00', totalVentasOriginalUSD: '0.00' }],
  detalleVentas: [{ id: 18, fecha: '2026-11-11', cultivo: '=2+2', cantidad: '8.000', unidad: 'kg', moneda: 'GTQ', precioUnitario: '20.0000', importe: '160.00', visitaOrigenId: 4 }],
}

test('FIX8 permite exportar Excel a Dirección y Coordinación sin abrirlo para el técnico', () => {
  assert.equal(puedeExportarReporteAgricola(['Dirección general']), true)
  assert.equal(puedeExportarReporteAgricola(['Coordinadora del programa agroforestal']), true)
  assert.equal(puedeExportarReporteAgricola(['Técnico agropecuario']), false)
  assert.equal(puedeExportarReporteAgricola(['Contadora interna']), false)
  assert.equal(puedeExportarReporteAgricola(['Auditor']), false)
})

test('FIX8 restringe vistas de Excel a categorías conocidas', () => {
  assert.equal(validarVistaExcel(undefined), 'agricola')
  assert.equal(validarVistaExcel('ventas-cultivo'), 'ventas-cultivo')
  assert.equal(validarVistaExcel('ventas-detalle'), 'ventas-detalle')
  assert.throws(() => validarVistaExcel('../../usuarios'), /categoría válida/)
})

test('FIX8 genera Excel por cultivo sin ejecutar fórmulas de nombres', async () => {
  const archivo = await construirExcelCategoria(informe, 'ventas-cultivo')
  assert.ok(archivo.length > 1000)
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(archivo)
  const hoja = book.getWorksheet('Ventas por cultivo')
  assert.ok(hoja)
  assert.equal(hoja.getCell('A5').value, "'=2+2")
  assert.equal(hoja.getCell('C5').value, 160)
})

test('FIX8 genera resumen financiero, cultivos y movimientos', async () => {
  const archivo = await construirExcelControlFinanciero(informe)
  const book = new ExcelJS.Workbook()
  await book.xlsx.load(archivo)
  assert.deepEqual(book.worksheets.map(sheet => sheet.name), ['Resumen', 'Ventas por cultivo', 'Movimientos'])
  assert.equal(book.getWorksheet('Resumen').getCell('B7').value, 160)
  assert.equal(book.getWorksheet('Movimientos').getCell('C5').value, "'=2+2")
})
