import ExcelJS from 'exceljs'
import type { InformeSemestralExcel } from './semester.excel-data.js'

/** Hoja complementaria, sin cambiar los importes originales de las ventas. */
export function agregarEquivalenciaMonetaria(libro: ExcelJS.Workbook, informe: InformeSemestralExcel) {
  const hoja = libro.addWorksheet('Equivalencia USD')
  hoja.columns = [{ width: 37 }, { width: 24 }]
  hoja.mergeCells('A1:B1')
  const titulo = hoja.getCell('A1')
  titulo.value = 'EQUIVALENCIA INSTITUCIONAL EN USD'
  titulo.font = { name: 'PT Sans', size: 14, bold: true, color: { argb: 'FF3C6E8E' } }
  hoja.getRow(1).height = 30
  const items: Array<[string, string, 'GTQ' | 'USD' | 'RATE']> = [
    ['Ventas originales en GTQ', informe.resumen.totalVentasOriginalGTQ, 'GTQ'],
    ['Ventas originales en USD', informe.resumen.totalVentasOriginalUSD, 'USD'],
    ['Tasa institucional: GTQ por 1 USD', informe.tipoCambioInstitucional.quetzalesPorDolar, 'RATE'],
    ['TOTAL EQUIVALENTE EN USD', informe.resumen.totalVentasEquivalenteUSD, 'USD'],
  ]
  for (const [label, value, currency] of items) {
    const row = hoja.addRow([label, Number(value)])
    row.getCell(2).numFmt = currency === 'RATE' ? '"Q" #,##0.000000' : currency === 'GTQ' ? '"Q" #,##0.00' : '"$" #,##0.00'
    if (label.startsWith('TOTAL')) row.font = { bold: true, color: { argb: 'FF3C6E8E' } }
  }
  hoja.addRow([])
  hoja.addRow(['Cálculo referencial al tipo de cambio institucional vigente.'])
  hoja.mergeCells(`A${hoja.rowCount}:B${hoja.rowCount}`)
  hoja.addRow(['No representa ventas adicionales ni sustituye las tasas históricas.'])
  hoja.mergeCells(`A${hoja.rowCount}:B${hoja.rowCount}`)
}
