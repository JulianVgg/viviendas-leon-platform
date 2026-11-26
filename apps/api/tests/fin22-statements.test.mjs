import {test} from 'node:test'
import assert from 'node:assert/strict'
import {ledgerStatement,makeLedgerWorkbook,makeMonthlyWorkbook} from '../dist/modules/finance/finance.statements.js'
import {makeLedgerPdf,makeMonthlyPdf} from '../dist/modules/finance/finance.statement-pdf.js'

const account={id:1,nombre:'Cuenta demostración',referencia:'****1234',tipo:'BANCO',saldoInicial:'200.00'}
const samples=[
 {id:1,fecha:'2026-11-04',tipo:'INGRESO',importe:'125.10',descripcion:'Abono de prueba',referencia:'NC-1',beneficiario:null,categoria:'Abonos',subcuenta:'Persona de prueba',subcuentaId:1,trasladoId:null,anuladoEn:null},
 {id:2,fecha:'2026-11-06',tipo:'EGRESO',importe:'35.05',descripcion:'Comprobante de prueba',referencia:'ND-2',beneficiario:'Beneficiario de prueba',categoria:'Materiales',subcuenta:'Persona de prueba',subcuentaId:1,trasladoId:null,anuladoEn:null},
 {id:3,fecha:'2026-11-07',tipo:'EGRESO',importe:'50.00',descripcion:'Movimiento anulado',referencia:null,beneficiario:null,categoria:'Materiales',subcuenta:'Persona de prueba',subcuentaId:1,trasladoId:null,anuladoEn:'2026-11-08'},
]
const report={mes:'2026-11',ingresos:'125.10',egresos:'35.05',resultado:'90.05',categorias:[{grupo:'GASTOS',categoria:'Materiales',ingresos:'0',egresos:'35.05',movimientos:1}],movimientos:[]}
const subs=[{id:1,nombre:'Persona de prueba',saldoInicial:'200.00',saldoAnterior:'200.00'}]

test('saldo acumulado excluye anulados y ordena cronológicamente',()=>{
 const value=ledgerStatement('200.00',samples.slice().reverse())
 assert.equal(value.rows.length,2)
 assert.equal(value.closing,290.05)
 assert.equal(value.rows[1].saldo,290.05)
})
test('los cuatro documentos PDF son archivos válidos',()=>{
 for(const type of ['bancos','caja-chica','fondos-medicos']){
  const buffer=makeLedgerPdf(type,'2026-11',account,'200.00',samples,subs)
  assert.equal(buffer.subarray(0,8).toString(),'%PDF-1.4')
  assert.match(buffer.toString('latin1'),/%%EOF/)
 }
 assert.equal(makeMonthlyPdf(report).subarray(0,5).toString(),'%PDF-')
})
test('las cuatro exportaciones Excel mantienen sus hojas institucionales',async()=>{
 for (const type of ['bancos','caja-chica','fondos-medicos']){
  const wb=makeLedgerWorkbook(type,'2026-11',account,'200.00',samples,subs)
  const buf=Buffer.from(await wb.xlsx.writeBuffer())
  assert.equal(buf.subarray(0,2).toString('hex'),'504b')
 }
 const book=makeMonthlyWorkbook(report)
 assert.ok(book.worksheets.some(s=>s.name==='Informe financiero'))
})
