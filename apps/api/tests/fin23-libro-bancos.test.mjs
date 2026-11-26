import {test} from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import {makeBankLedgerWorkbook,ledgerStatement} from '../dist/modules/finance/finance.statements.js'
import {makeBankLedgerPdf} from '../dist/modules/finance/finance.statement-pdf.js'

const account={id:1,tipo:'BANCO',nombre:'Cuenta de pruebas',referencia:'****4321',saldoInicial:'850.00'}
const sample=[
 {id:1,fecha:'2026-11-10',tipo:'INGRESO',importe:'200.50',referencia:'NC-01',beneficiario:'Colaborador de prueba',descripcion:'Abono de prueba con referencia a comprobante',categoria:'Ingresos',subcuenta:null,subcuentaId:null,trasladoId:null,anuladoEn:null},
 {id:2,fecha:'2026-11-12',tipo:'EGRESO',importe:'38.75',referencia:'ND-01',beneficiario:'Proveedor de prueba',descripcion:'Materiales de huerto y transporte al programa de campo, con detalle completo que debe ocupar varias líneas y no debe cortarse ni en el PDF ni en el Excel.',categoria:'Gastos',subcuenta:null,subcuentaId:null,trasladoId:null,anuladoEn:null},
 {id:3,fecha:'2026-11-13',tipo:'EGRESO',importe:'99.90',referencia:null,beneficiario:null,descripcion:'Movimiento anulado',categoria:'Gastos',subcuenta:null,subcuentaId:null,trasladoId:null,anuladoEn:'2026-11-13'},
]

test('Libro auxiliar Excel: diseño institucional, renglones y saldos por fórmula',async()=>{
 const wb=makeBankLedgerWorkbook('2026-11',account,'850',sample)
 const sh=wb.worksheets[0]
 assert.equal(sh.name,'LIBRO AUXILIAR DE BANCOS')
 assert.equal(sh.getCell('C5').value,'LIBRO AUXILIAR DE BANCOS')
 assert.equal(sh.getCell('H10').value,850)
 assert.equal(sh.getCell('D12').value,'BENEFICIARIO')
 assert.equal(sh.getCell('E12').value,'DESCRIPCIÓN')
 assert.equal(sh.getCell('D13').value,'Colaborador de prueba')
 assert.equal(sh.getCell('D14').value,'Proveedor de prueba')
 assert.equal(sh.getCell('H13').value.formula,'H10+IF(F13="",0,F13)-IF(G13="",0,G13)')
 assert.equal(sh.getCell('H14').value.result,1011.75)
 assert.ok(sh.getRow(14).height>18)
 assert.equal(sh.getCell('A43').value,'TOTALES')
 assert.equal(sh.getCell('F43').value.result,200.50)
 assert.equal(sh.getCell('G43').value.result,38.75)
 assert.ok(sh.getImages().length===1)
 const bytes=Buffer.from(await wb.xlsx.writeBuffer())
 assert.equal(bytes.subarray(0,2).toString('hex'),'504b')
 const imported=new ExcelJS.Workbook();await imported.xlsx.load(bytes)
 assert.equal(imported.worksheets[0].getCell('E14').value,sample[1].descripcion)
})

test('Libro auxiliar PDF: tamaño carta, logo original y texto largo sin recorte',()=>{
 const buffer=makeBankLedgerPdf('2026-11',account,'850',sample)
 assert.equal(buffer.subarray(0,8).toString(),'%PDF-1.4')
 assert.match(buffer.toString('latin1'),/\/MediaBox \[0 0 612 792\]/)
 assert.match(buffer.toString('latin1'),/\/Subtype \/Image/)
 assert.match(buffer.toString('latin1'),/BENEFICIARIO/)
 assert.match(buffer.toString('latin1'),/MATERIALES/i)
 assert.doesNotMatch(buffer.toString('latin1'),/Movimiento anulado/)
})

test('ningún movimiento anulado modifica la suma del libro',()=>{
 const r=ledgerStatement('850',sample)
 assert.equal(r.rows.length,2)
 assert.equal(r.ingresos,200.5)
 assert.equal(r.egresos,38.75)
 assert.equal(r.closing,1011.75)
})
