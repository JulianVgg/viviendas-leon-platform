import test from 'node:test'
import assert from 'node:assert/strict'
import { consolidarSemestre, definirPeriodo } from '../dist/modules/reports/semester.rules.js'

let ExcelJS
try { ({ default: ExcelJS } = await import('exceljs')) } catch { /* La prueba requiere la dependencia instalada. */ }

test('CIR-13: XLSX incluye detalle y conciliación sin alterar el pie del resumen',
  { skip: !ExcelJS && 'Instala ExcelJS en apps/api' }, async () => {
    const { construirExcelSemestral } = await import('../dist/modules/reports/semester.excel.js')
    const filtros = { anio: 2026, semestre: 2 }
    const c = { id: 1, cicloId: 9, cultivoId: 7, cultivo: 'Tomate', familiaId: 8,
      familia: 'Familia de ejemplo', comunidadId: 3, comunidad: 'Comunidad de ejemplo',
      huertoId: 11, huerto: 'Huerto principal', cantidadPlantas: 15,
      visitaOrigenId: 58, fechaInicio: '2026-10-02', fechaFin: '2026-10-02', observaciones: '=2+2', esDatoPrueba: false,
      detalles: [{ id: 16, tipo: 'kg', cantidad: '10.500', unidadCodigo: 'KG' }],
    }
    const v = { id: 2, cosechaId: 1, cicloId: 9, cultivoId: 7, cultivo: 'Tomate',
      familiaId: 8, familia: 'Familia de ejemplo', comunidadId: 3, comunidad: 'Comunidad de ejemplo',
      huertoId: 11, huerto: 'Huerto principal', visitaOrigenId: 58, observaciones: 'Venta validada', fecha: '2026-10-04', cantidad: '3',
      tipo: 'kg', unidadCodigo: 'KG', precioUnitario: '12.0000', moneda: 'GTQ',
      cantidadPrecios: 1, esDatoPrueba: false }
    const informe = { ...consolidarSemestre(definirPeriodo(filtros), [c], [v]), filtros }
    const archivo = await construirExcelSemestral(informe)
    const libro = new ExcelJS.Workbook()
    await libro.xlsx.load(archivo)
    assert.equal(libro.worksheets.length, 2)
    const resumen = libro.getWorksheet('Producciones agrícolas')
    const detalle = libro.getWorksheet('Detalle de registros')
    assert.ok(resumen && detalle)
    assert.equal(resumen.getCell('A1').value, 'PRODUCCIONES AGRÍCOLAS')
    assert.equal(resumen.getCell('J9').value, 36)
    assert.equal(resumen.pageSetup.printArea, 'A1:L10')
    assert.equal(resumen.getCell('A12').value, null)
    assert.equal(detalle.getCell('A1').value, 'DETALLE DE PRODUCCIÓN Y VENTAS')
    assert.equal(detalle.getCell('G8').value, 'Tomate')
    assert.equal(detalle.getCell('L8').value, 'Huerto principal')
    assert.equal(detalle.getCell('B8').value, 1)
    assert.equal(detalle.getCell('C8').value, 16)
    assert.equal(detalle.getCell('T8').value, "'=2+2")
    assert.equal(detalle.getCell('U8').value, 58)
    assert.equal(detalle.getCell('A9').value, 'VENTA')
    assert.equal(detalle.getCell('D9').value, 1)
    assert.equal(detalle.getCell('S9').value, 36)
    assert.equal(detalle.getCell('T9').value, 'Venta validada')
    assert.equal(detalle.getCell('U9').value, 58)
    const filaControl = 12
    assert.match(detalle.getCell(`B${filaControl + 3}`).value.formula, /SUMIFS/)
    assert.equal(detalle.getCell(`B${filaControl + 5}`).value.result, 36)
    assert.equal(detalle.getCell(`E${filaControl + 5}`).value.result, 'OK')
  })
