import ExcelJS from 'exceljs'
import type { InformeSemestralExcel } from './semester.excel-data.js'
import { textoSeguroExcel } from './semester.excel-data.js'

export type VistaExcel = 'agricola' | 'ventas-cultivo' | 'ventas-detalle'
export function validarVistaExcel(value: unknown): VistaExcel {
  if (value === undefined || value === 'agricola') return 'agricola'
  if (value === 'ventas-cultivo' || value === 'ventas-detalle') return value
  throw new Error('Selecciona una categoría válida de Excel.')
}

const azul = 'FF3C6E8E'
const header = 'FFDCECF4'
const currency = (tipo: 'GTQ' | 'USD') => tipo === 'GTQ' ? '"Q" #,##0.00' : '"$" #,##0.00'
const amount = (v: string | number | null | undefined) => v && Number.isFinite(Number(v)) ? Number(v) : null

function sheet(libro: ExcelJS.Workbook, name: string, label: string, periodo: string, titles: string[], widths: number[]) {
  const hoja = libro.addWorksheet(name, { properties: { defaultRowHeight: 21 } })
  hoja.columns = widths.map(width => ({ width }))
  hoja.mergeCells(1, 1, 1, titles.length)
  const title = hoja.getCell(1, 1)
  title.value = label
  title.font = { name: 'PT Sans', size: 16, bold: true, color: { argb: azul } }
  title.alignment = { vertical: 'middle' }
  hoja.getRow(1).height = 34
  hoja.mergeCells(2, 1, 2, titles.length)
  hoja.getCell(2, 1).value = periodo
  hoja.getCell(2, 1).font = { name: 'PT Sans', italic: true, size: 10 }
  const headings = hoja.getRow(4)
  headings.values = titles
  headings.height = 32
  headings.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: header } }
    cell.font = { name: 'PT Sans', bold: true, color: { argb: azul } }
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  hoja.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: titles.length } }
  hoja.views = [{ state: 'frozen', ySplit: 4 }]
  return hoja
}

export async function construirExcelCategoria(informe: InformeSemestralExcel, vista: Exclude<VistaExcel, 'agricola'>): Promise<Buffer> {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'ViviendasLeón Guatemala'
  libro.subject = 'Ventas agrícolas registradas'
  const periodo = `${informe.periodo.desde} al ${informe.periodo.hasta}`
  if (vista === 'ventas-cultivo') {
    const hoja = sheet(libro, 'Ventas por cultivo', 'VENTAS POR CULTIVO', periodo,
      ['Cultivo', 'Ventas', 'Importe GTQ', 'Importe USD'], [35, 16, 22, 22])
    for (const r of informe.porCultivo.filter(r => r.ventas > 0)) {
      const row = hoja.addRow([textoSeguroExcel(String(r.cultivo ?? '')), r.ventas, amount(r.totalVentasOriginalGTQ), amount(r.totalVentasOriginalUSD)])
      row.getCell(3).numFmt = currency('GTQ'); row.getCell(4).numFmt = currency('USD')
    }
  } else {
    const hoja = sheet(libro, 'Detalle de ventas', 'VENTAS AGRÍCOLAS', periodo,
      ['Registro', 'Fecha', 'Cultivo', 'Cantidad', 'Unidad', 'Moneda', 'Precio unitario', 'Importe', 'Visita origen'],
      [16, 18, 30, 18, 17, 14, 22, 22, 19])
    for (const r of informe.detalleVentas) {
      const row = hoja.addRow([r.id, r.fecha, textoSeguroExcel(String(r.cultivo ?? '')), amount(r.cantidad), textoSeguroExcel(String(r.unidad ?? '')),
        r.moneda, amount(r.precioUnitario), amount(r.importe), r.visitaOrigenId ?? null])
      row.getCell(7).numFmt = '#,##0.0000'
      if (r.moneda === 'GTQ' || r.moneda === 'USD') row.getCell(8).numFmt = currency(r.moneda)
    }
  }
  return Buffer.from(await libro.xlsx.writeBuffer())
}

// Solo ventas agrícolas, no constituye contabilidad general ni concilia bancos o caja chica.
export async function construirExcelControlFinanciero(informe: InformeSemestralExcel): Promise<Buffer> {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'ViviendasLeón Guatemala'
  const periodo = `${informe.periodo.desde} al ${informe.periodo.hasta}`
  const resumen = sheet(libro, 'Resumen', 'CONTROL DE VENTAS AGRÍCOLAS', periodo,
    ['Indicador', 'Resultado'], [47, 28])
  resumen.addRow(['Ventas registradas', informe.resumen.ventas])
  resumen.addRow(['Ventas con importe', informe.resumen.ventasConImporte])
  resumen.addRow(['Importe en quetzales', amount(informe.resumen.totalVentasOriginalGTQ)]).getCell(2).numFmt = currency('GTQ')
  resumen.addRow(['Importe en dólares', amount(informe.resumen.totalVentasOriginalUSD)]).getCell(2).numFmt = currency('USD')
  resumen.addRow(['Alcance', 'Solo ventas agrícolas registradas; no incluye ingresos bancarios, pagos ni caja chica.'])
  const cultivos = sheet(libro, 'Ventas por cultivo', 'VENTAS AGRÍCOLAS POR CULTIVO', periodo,
    ['Cultivo', 'Ventas', 'Total GTQ', 'Total USD'], [35, 16, 22, 22])
  for (const r of informe.porCultivo.filter(r => r.ventas > 0)) {
    const row = cultivos.addRow([textoSeguroExcel(String(r.cultivo ?? '')), r.ventas, amount(r.totalVentasOriginalGTQ), amount(r.totalVentasOriginalUSD)])
    row.getCell(3).numFmt = currency('GTQ'); row.getCell(4).numFmt = currency('USD')
  }
  const detalle = sheet(libro, 'Movimientos', 'DETALLE DE VENTAS REGISTRADAS', periodo,
    ['Registro', 'Fecha', 'Cultivo', 'Cantidad', 'Unidad', 'Moneda', 'Importe', 'Visita origen'],
    [16, 18, 30, 18, 16, 14, 22, 18])
  for (const r of informe.detalleVentas) {
    const row = detalle.addRow([r.id, r.fecha, textoSeguroExcel(String(r.cultivo ?? '')), amount(r.cantidad), textoSeguroExcel(String(r.unidad ?? '')), r.moneda, amount(r.importe), r.visitaOrigenId ?? null])
    if (r.moneda === 'GTQ' || r.moneda === 'USD') row.getCell(7).numFmt = currency(r.moneda)
  }
  return Buffer.from(await libro.xlsx.writeBuffer())
}
