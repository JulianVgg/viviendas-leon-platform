import ExcelJS from 'exceljs'
import {
  prepararFilasProduccionExcel, textoSeguroExcel, type InformeSemestralExcel,
} from './semester.excel-data.js'
import { prepararTrazabilidadSemestral } from './semester.traceability.js'

const AZUL_INSTITUCIONAL = 'FF3C6E8E'
const AZUL_TABLA = 'FFABCBE8'
const AZUL_OSCURO = 'FF1F3346'
const GRIS_BORDE = 'FFADB8C2'
const GRIS_SUAVE = 'FFF3F7FA'
const FILA_ENCABEZADOS = 8
const PRIMERA_FILA = FILA_ENCABEZADOS + 1

const columnas = [
  { key: 'numero', width: 7, titulo: 'No.' },
  { key: 'cultivo', width: 24, titulo: 'Cultivos' },
  { key: 'plantasIniciales', width: 16, titulo: 'Cantidad de plantas' },
  { key: 'unidadesPorPlanta', width: 20, titulo: 'Producto obtenido por planta (Unidad)' },
  { key: 'kgPorPlanta', width: 18, titulo: 'Producto obtenido por planta (Kg)' },
  { key: 'unidades', width: 20, titulo: 'Total de producción obtenida (unidades)' },
  { key: 'kg', width: 20, titulo: 'Total de producción obtenida (Kg)' },
  { key: 'precioGTQ', width: 16, titulo: 'Precio de venta (Q)' },
  { key: 'precioUSD', width: 16, titulo: 'Precio de venta ($)' },
  { key: 'ventasGTQ', width: 17, titulo: 'Total de venta (Q)' },
  { key: 'ventasUSD', width: 17, titulo: 'Total de ventas ($)' },
  { key: 'observaciones', width: 58, titulo: 'Observaciones' },
] as const

const borde = {
  top: { style: 'thin' as const, color: { argb: GRIS_BORDE } },
  bottom: { style: 'thin' as const, color: { argb: GRIS_BORDE } },
  left: { style: 'thin' as const, color: { argb: GRIS_BORDE } },
  right: { style: 'thin' as const, color: { argb: GRIS_BORDE } },
}
const periodoTexto = (semestre: 1 | 2, anio: number, desde?: string, hasta?: string) =>
  desde && hasta ? `DEL ${desde} AL ${hasta}` : `${semestre === 1 ? 'ENERO-JUNIO' : 'JULIO-DICIEMBRE'} ${anio}`
const numero = (texto: string): number => Number(texto)

/** Devuelve el Excel institucional. No registra cosechas, ventas ni tipos de cambio. */
export async function construirExcelSemestral(informe: InformeSemestralExcel): Promise<Buffer> {
  const libro = new ExcelJS.Workbook()
  libro.creator = 'ViviendasLeón Guatemala'
  libro.subject = 'Producciones agrícolas semestrales'
  libro.title = `Producciones agrícolas — ${periodoTexto(informe.periodo.semestre, informe.periodo.anio, informe.periodo.personalizado ? informe.periodo.desde : undefined, informe.periodo.personalizado ? informe.periodo.hasta : undefined)}`
  libro.created = new Date()
  libro.calcProperties.fullCalcOnLoad = true

  const hoja = libro.addWorksheet('Producciones agrícolas', {
    properties: { defaultRowHeight: 21 },
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1,
      fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.45, bottom: 0.45,
        header: 0.2, footer: 0.2 },
    },
  })
  hoja.columns = columnas.map(c => ({ key: c.key, width: c.width }))
  hoja.views = [{ state: 'frozen', ySplit: FILA_ENCABEZADOS }]

  hoja.mergeCells('A1:L2')
  const titulo = hoja.getCell('A1')
  titulo.value = 'PRODUCCIONES AGRÍCOLAS'
  titulo.font = { name: 'PT Sans', size: 17, bold: true, color: { argb: AZUL_OSCURO } }
  titulo.alignment = { horizontal: 'center', vertical: 'middle' }
  hoja.getRow(1).height = 24
  hoja.getRow(2).height = 22
  hoja.mergeCells('A3:L3')
  const proyecto = hoja.getCell('A3')
  proyecto.value = 'PROYECTO: Programa de huertos familiares de ViviendasLeón Guatemala, Santa Lucía Utatlán, Sololá.'
  proyecto.font = { name: 'PT Sans', italic: true, size: 10, color: { argb: AZUL_OSCURO } }
  proyecto.alignment = { horizontal: 'center', vertical: 'middle' }
  hoja.getRow(3).height = 22

  hoja.mergeCells('A4:L4')
  const periodo = hoja.getCell('A4')
  periodo.value = periodoTexto(informe.periodo.semestre, informe.periodo.anio, informe.periodo.personalizado ? informe.periodo.desde : undefined, informe.periodo.personalizado ? informe.periodo.hasta : undefined)
  periodo.font = { name: 'PT Sans', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
  periodo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_INSTITUCIONAL } }
  periodo.alignment = { horizontal: 'center', vertical: 'middle' }
  hoja.getRow(4).height = 25

  // Sin flujo de aprobación: el informe se genera directamente desde el período elegido.
  hoja.getRow(5).height = 8

  const { comunidadId, familiaId } = informe.filtros
  const alcance = [comunidadId ? `Comunidad ID ${comunidadId}` : 'Todas las comunidades',
    familiaId ? `Familia ID ${familiaId}` : 'Todas las familias'].join(' · ')
  hoja.mergeCells('A6:L6')
  hoja.getCell('A6').value = `Período: ${informe.periodo.desde} a ${informe.periodo.hasta} · ${alcance}`
  hoja.getCell('A6').font = { name: 'PT Sans', size: 10, color: { argb: AZUL_OSCURO } }
  hoja.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' }
  hoja.getRow(6).height = 21
  hoja.getRow(7).height = 8

  const encabezados = hoja.getRow(FILA_ENCABEZADOS)
  encabezados.height = 58
  columnas.forEach((col, indice) => {
    const celda = encabezados.getCell(indice + 1)
    celda.value = col.titulo
    celda.font = { name: 'PT Sans', size: 9, bold: true, color: { argb: AZUL_OSCURO } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_TABLA } }
    celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    celda.border = borde
  })

  const filas = prepararFilasProduccionExcel(informe)
  for (const fila of filas) {
    const r = hoja.addRow({ ...fila })
    r.height = 30
    r.eachCell({ includeEmpty: true }, (celda: ExcelJS.Cell, columna: number) => {
      celda.font = { name: 'PT Sans', size: 10, color: { argb: AZUL_OSCURO } }
      celda.border = borde
      celda.alignment = { vertical: 'middle', horizontal: columna === 2 || columna === 12 ? 'left' : 'center',
        wrapText: columna === 12 }
      if (fila.numero % 2 === 0) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_SUAVE } }
      }
    })
    for (const indice of [8, 10]) r.getCell(indice).numFmt = '"Q" #,##0.00'
    for (const indice of [9, 11]) r.getCell(indice).numFmt = '"$" #,##0.00'
    r.getCell(7).numFmt = '#,##0.000'
    r.getCell(6).numFmt = '#,##0'
    r.getCell(3).numFmt = '#,##0'
  }
  if (!filas.length) {
    const vacia = hoja.getRow(PRIMERA_FILA)
    hoja.mergeCells(`B${PRIMERA_FILA}:L${PRIMERA_FILA}`)
    hoja.getCell(`B${PRIMERA_FILA}`).value = 'Sin cosechas ni ventas verificables para el período y filtros seleccionados.'
    vacia.height = 27
  }

  const ultimaFilaDatos = PRIMERA_FILA + Math.max(filas.length, 1) - 1
  const filaTotal = hoja.getRow(ultimaFilaDatos + 1)
  filaTotal.height = 25
  hoja.mergeCells(`A${filaTotal.number}:E${filaTotal.number}`)
  hoja.getCell(`A${filaTotal.number}`).value = 'TOTAL SEMESTRAL'
  for (let i = 1; i <= 12; i++) {
    const c = filaTotal.getCell(i)
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_TABLA } }
    c.font = { name: 'PT Sans', size: 10, bold: true, color: { argb: AZUL_OSCURO } }
    c.border = borde
    c.alignment = { vertical: 'middle', horizontal: i === 1 ? 'left' : 'center' }
  }
  const resumen = informe.resumen
  for (const [indice, resultado, formato] of [
    [6, resumen.cantidades.unidades, '#,##0'], [7, resumen.cantidades.kg, '#,##0.000'],
    [10, resumen.totalVentasOriginalGTQ, '"Q" #,##0.00'],
    [11, resumen.totalVentasOriginalUSD, '"$" #,##0.00'],
  ] as const) {
    const celda = filaTotal.getCell(indice)
    celda.value = { formula: `SUM(${String.fromCharCode(64 + indice)}${PRIMERA_FILA}:${String.fromCharCode(64 + indice)}${ultimaFilaDatos})`,
      result: numero(resultado) }
    celda.numFmt = formato
  }
  // El archivo institucional termina en la fila de totales.
  // Las advertencias se conservan en la API, sin notas técnicas visibles en Excel.
  hoja.pageSetup.printArea = `A1:L${filaTotal.number}`
  agregarHojaTrazabilidad(libro, informe)
  const buffer = await libro.xlsx.writeBuffer()
  return Buffer.from(buffer)
}


const encabezadosDetalle = [
  ['Tipo', 13], ['ID registro', 13], ['ID detalle', 12], ['ID cosecha', 12],
  ['ID ciclo', 12], ['ID cultivo', 12], ['Cultivo', 24], ['ID familia', 12],
  ['Familia', 27], ['Comunidad', 22], ['ID huerto', 12], ['Huerto', 24],
  ['Fecha inicio / venta', 21], ['Fecha fin cosecha', 20], ['Unidad', 14],
  ['Cantidad', 15], ['Precio unitario', 18], ['Moneda', 12], ['Total venta', 18],
  ['Observaciones', 50], ['ID visita origen', 15],
] as const

/** Hoja interna de trazabilidad; nunca añade notas a la hoja institucional. */
function agregarHojaTrazabilidad(libro: ExcelJS.Workbook, informe: InformeSemestralExcel) {
  // Se verifica la conciliación antes de construir el archivo: una diferencia bloquea la exportación.
  const { filas, conciliacion } = prepararTrazabilidadSemestral(informe)
  if (filas.length > 1_000_000) throw Error('CIR-13: demasiados registros para una hoja Excel.')
  const detalle = libro.addWorksheet('Detalle de registros', {
    properties: { defaultRowHeight: 21 },
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 2, fitToHeight: 0 },
  })
  detalle.columns = encabezadosDetalle.map(([, width]) => ({ width }))
  detalle.views = [{ state: 'frozen', ySplit: 7 }]
  detalle.mergeCells('A1:U2')
  const titulo = detalle.getCell('A1')
  titulo.value = 'DETALLE DE PRODUCCIÓN Y VENTAS'
  titulo.font = { name: 'PT Sans', size: 16, bold: true, color: { argb: AZUL_OSCURO } }
  titulo.alignment = { horizontal: 'center', vertical: 'middle' }
  detalle.getRow(1).height = 24
  detalle.getRow(2).height = 24
  detalle.mergeCells('A3:U3')
  const fechaGeneracion = libro.created ?? new Date()
  detalle.getCell('A3').value = `Período: ${informe.periodo.desde} a ${informe.periodo.hasta} · Generado: ${fechaGeneracion.toISOString().replace('T', ' ').slice(0, 19)} UTC`
  detalle.getCell('A3').font = { name: 'PT Sans', size: 11, color: { argb: AZUL_OSCURO } }
  detalle.mergeCells('A4:U4')
  detalle.getCell('A4').value = `Filtro: comunidad ${informe.filtros.comunidadId ?? 'todas'} · familia ${informe.filtros.familiaId ?? 'todas'}`
  detalle.mergeCells('A5:U5')
  detalle.getCell('A5').value = 'Cosechas por fecha de cosecha; ventas por fecha de venta. Importes en moneda original, sin sumar GTQ y USD.'
  detalle.getRow(6).height = 10
  const cabecera = detalle.getRow(7)
  cabecera.height = 37
  encabezadosDetalle.forEach(([nombre], index) => {
    const celda = cabecera.getCell(index + 1)
    celda.value = nombre
    celda.font = { name: 'PT Sans', size: 9, bold: true, color: { argb: AZUL_OSCURO } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_TABLA } }
    celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    celda.border = borde
  })

  // Un registro de cosecha por detalle/unidad; una venta por su ID.
  // Se mantienen IDs de origen y vínculos a cosecha/ciclo incluso si la cosecha es de otro semestre.
  const numeroSeguro = (valor: string | null) => valor === null ? null : Number(valor)
  for (const item of filas) {
    const fila = detalle.addRow([
      item.tipo, item.registroId, item.detalleId, item.cosechaId,
      item.cicloId, item.cultivoId, textoSeguroExcel(item.cultivo), item.familiaId,
      textoSeguroExcel(item.familia), textoSeguroExcel(item.comunidad), item.huertoId,
      item.huerto ? textoSeguroExcel(item.huerto) : null, item.fecha, item.fechaFin,
      item.unidad, numeroSeguro(item.cantidad), numeroSeguro(item.precioUnitario),
      item.moneda, numeroSeguro(item.importe),
      item.observaciones ? textoSeguroExcel(item.observaciones) : null, item.visitaOrigenId,
    ])
    fila.height = 25
    fila.eachCell({ includeEmpty: true }, (celda: ExcelJS.Cell, columna: number) => {
      celda.font = { name: 'PT Sans', size: 10, color: { argb: AZUL_OSCURO } }
      celda.border = borde
      celda.alignment = { vertical: 'middle', wrapText: columna === 20 }
      if (fila.number % 2 === 0) celda.fill = {
        type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_SUAVE },
      }
    })
    fila.getCell(16).numFmt = '#,##0.000'
    fila.getCell(17).numFmt = '#,##0.0000'
    fila.getCell(19).numFmt = '#,##0.00'
  }
  const filaFinalDatos = Math.max(8, 7 + filas.length)
  detalle.autoFilter = { from: 'A7', to: `U${filaFinalDatos}` }
  if (!filas.length) {
    detalle.mergeCells('A8:U8')
    detalle.getCell('A8').value = 'Sin cosechas ni ventas verificables para el período seleccionado.'
  }

  const inicioControl = filaFinalDatos + 3
  detalle.mergeCells(`A${inicioControl}:U${inicioControl}`)
  const control = detalle.getCell(`A${inicioControl}`)
  control.value = 'CONCILIACIÓN CON EL RESUMEN INSTITUCIONAL'
  control.font = { name: 'PT Sans', bold: true, color: { argb: 'FFFFFFFF' } }
  control.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_INSTITUCIONAL } }
  for (const [indice, etiqueta] of ['Concepto', 'Detalle', 'Resumen', 'Diferencia', 'Resultado'].entries()) {
    const celda = detalle.getRow(inicioControl + 1).getCell(indice + 1)
    celda.value = etiqueta
    celda.font = { name: 'PT Sans', bold: true, color: { argb: AZUL_OSCURO } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_TABLA } }
    celda.border = borde
  }
  conciliacion.forEach((dato, i) => {
    const linea = inicioControl + 2 + i
    const fila = detalle.getRow(linea)
    fila.getCell(1).value = dato.concepto
    const rango = dato.concepto === 'GTQ' || dato.concepto === 'USD'
      ? `SUMIFS(S8:S${filaFinalDatos},A8:A${filaFinalDatos},"VENTA",R8:R${filaFinalDatos},"${dato.concepto}")`
      : `SUMIFS(P8:P${filaFinalDatos},A8:A${filaFinalDatos},"COSECHA",O8:O${filaFinalDatos},"${dato.concepto}")`
    fila.getCell(2).value = { formula: rango, result: Number(dato.detalle) }
    fila.getCell(3).value = Number(dato.resumen)
    fila.getCell(4).value = { formula: `B${linea}-C${linea}`, result: 0 }
    fila.getCell(5).value = { formula: `IF(ABS(D${linea})<0.00001,"OK","REVISAR")`, result: 'OK' }
    for (let columna = 1; columna <= 5; columna++) {
      const celda = fila.getCell(columna)
      celda.border = borde
      celda.font = { name: 'PT Sans', size: 10, color: { argb: AZUL_OSCURO } }
      if (columna >= 2 && columna <= 4) celda.numFmt = dato.concepto === 'GTQ' || dato.concepto === 'USD'
        ? '#,##0.00' : '#,##0.000'
    }
  })
  detalle.pageSetup.printArea = `A1:U${inicioControl + 1 + conciliacion.length}`
}
