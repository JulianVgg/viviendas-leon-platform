import test from 'node:test'
import assert from 'node:assert/strict'
import { consolidarSemestre, definirPeriodo } from '../src/modules/reports/semester.rules.ts'

let ExcelJS = null
try { ({ default: ExcelJS } = await import('exceljs')) } catch { /* El usuario debe instalar ExcelJS antes del build. */ }

test('CIR-12: el XLSX se puede abrir, conserva encabezados y fórmulas de totales',
  { skip: !ExcelJS && 'Instala ExcelJS con npm install exceljs -w @viviendas-leon/api' }, async () => {
    const { construirExcelSemestral } = await import('../dist/modules/reports/semester.excel.js')
    const periodo = definirPeriodo({ anio: 2026, semestre: 2 })
    const fuente = {
      id: 1, cicloId: 1, cultivoId: 2, cultivo: 'Tomate', familiaId: 10,
      familia: 'Familia ficticia', comunidadId: 3, comunidad: 'Comunidad de ejemplo',
      cantidadPlantas: 22, fechaInicio: '2026-10-02', fechaFin: '2026-10-02',
      observaciones: 'Producción de prueba', esDatoPrueba: false,
      detalles: [{ id: 1, tipo: 'kg', cantidad: '10.500', unidadCodigo: 'KG' }],
    }
    const venta = {
      id: 3, cosechaId: 1, cicloId: 1, cultivoId: 2, cultivo: 'Tomate',
      familiaId: 10, familia: 'Familia ficticia', comunidadId: 3, comunidad: 'Comunidad de ejemplo',
      fecha: '2026-10-03', tipo: 'kg', unidadCodigo: 'KG', cantidad: '2.000',
      precioUnitario: '12.0000', moneda: 'GTQ', cantidadPrecios: 1, esDatoPrueba: false,
    }
    const informe = { ...consolidarSemestre(periodo, [fuente], [venta]), filtros: { anio:2026, semestre:2 } }
    const bytes = await construirExcelSemestral(informe)
    assert.equal(bytes[0], 0x50) // archivo ZIP/XLSX
    assert.equal(bytes[1], 0x4b)
    const libro = new ExcelJS.Workbook()
    await libro.xlsx.load(bytes)
    const hoja = libro.getWorksheet('Producciones agrícolas')
    assert.ok(hoja)
    assert.equal(hoja.getCell('A1').value, 'PRODUCCIONES AGRÍCOLAS')
    assert.equal(hoja.getCell('A4').value, 'JULIO-DICIEMBRE 2026')
    assert.equal(hoja.getCell('B8').value, 'Cultivos')
    assert.equal(hoja.getCell('B9').value, 'Tomate')
    assert.equal(hoja.getCell('G9').value, 10.5)
    assert.equal(hoja.getCell('J9').value, 24)
    assert.equal(hoja.getCell('E9').value, null)
    assert.match(hoja.getCell('J10').value.formula, /^SUM\(J9:J9\)$/)
    assert.equal(hoja.pageSetup.printArea, 'A1:L10')
    assert.equal(hoja.getCell('A12').value, null) // sin notas técnicas bajo los totales
    assert.ok(!hoja.headerFooter.oddFooter)
    assert.equal(hoja.pageSetup.orientation, 'landscape')
  })
