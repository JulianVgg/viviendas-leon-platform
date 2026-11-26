/** Presentación de los cuatro formatos de Control financiero.
 * Los valores provienen de movimientos reales; no se crean datos de ejemplo.
 * Los cálculos excluyen anulaciones, y el informe mensual excluye traslados internos.
 */
import ExcelJS from 'exceljs'
import { fileURLToPath } from 'node:url'

export type StatementAccount = { id: number; nombre: string; referencia: string | null; tipo: string; saldoInicial: string }
export type StatementMovement = {
  id: number; fecha: string; tipo: string; importe: string; descripcion: string;
  referencia: string | null; beneficiario: string | null; categoria: string | null;
  subcuenta: string | null; subcuentaId: number | null; trasladoId: string | null; anuladoEn: string | null
}
export type StatementSubaccount = { id: number; nombre: string; saldoInicial: string; saldoAnterior: string }
export type StatementReport = {
  mes: string; ingresos: string; egresos: string; resultado: string;
  categorias: Array<{ grupo: string; categoria: string; ingresos: string; egresos: string; movimientos: number }>
  movimientos: Array<{ fecha: string; cuenta: string; categoria: string | null; tipo: string; descripcion: string; importe: string }>
}

const cents = (n: number | string) => Math.round(Number(n) * 100)
const amount = (n: number) => Math.round(n) / 100
export const financialMoney = (n: number | string) => `Q ${amount(typeof n === 'number' ? n * 100 : cents(n)).toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
export const monthLabel = (month: string) => {
  const [year, m] = month.split('-').map(Number)
  return new Intl.DateTimeFormat('es-GT', {month: 'long', year: 'numeric', timeZone: 'UTC'}).format(new Date(Date.UTC(year, m - 1, 1))).toUpperCase()
}
export const formatFinancialDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date.slice(8,10)}/${date.slice(5,7)}/${date.slice(0,4)}` : date
const safe = (value: unknown) => {
  const text = String(value ?? '')
  return /^\s*[=+@\-]/.test(text) ? `'${text}` : text
}
export type StatementRow = StatementMovement & {numero: number; ingreso: number; egreso: number; saldo: number}
export function ledgerStatement(opening: string, records: StatementMovement[]) {
  let balance = cents(opening)
  let incomes = 0, expenses = 0
  const rows: StatementRow[] = []
  // Se contabilizan cronológicamente, no en el orden descendente de la pantalla.
  for (const item of [...records].sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.id-b.id)) {
    if (item.anuladoEn) continue
    const value = cents(item.importe)
    if (item.tipo === 'INGRESO') {balance += value; incomes += value}
    else {balance -= value; expenses += value}
    rows.push({...item, numero: rows.length + 1, ingreso: item.tipo==='INGRESO'?amount(value):0,
      egreso: item.tipo==='EGRESO'?amount(value):0, saldo: amount(balance)})
  }
  return {opening: amount(cents(opening)), rows, ingresos: amount(incomes), egresos: amount(expenses), closing: amount(balance)}
}

const CURRENCY = '#,##0.00;[Red](#,##0.00);–'
const NAVY = '254E6A', PALE = 'EAF1F5', GREY = '566575', BORDER = 'CCD5DB'
function styleTable(sheet: ExcelJS.Worksheet, header: number, columns: number, currencyColumns: number[]) {
  sheet.views = [{state: 'frozen', ySplit: header}]
  sheet.pageSetup = {paperSize: 9, orientation: columns > 7 ? 'landscape':'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0}
  sheet.getRow(header).height = 30
  for (let col=1;col<=columns;col++) { const cell=sheet.getRow(header).getCell(col);cell.font = {bold:true,color:{argb:'FFFFFFFF'},size:10};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:`FF${NAVY}`}};cell.alignment={vertical:'middle',wrapText:true} }
  for(let row=header+1;row<=sheet.rowCount;row++) {
    sheet.getRow(row).height=23
    for(let col=1;col<=columns;col++) {
      const cell=sheet.getRow(row).getCell(col)
      cell.border={bottom:{style:'hair',color:{argb:`FF${BORDER}`}}}
      cell.alignment={vertical:'middle',wrapText:col<=5}
      if(currencyColumns.includes(col)) {cell.numFmt=CURRENCY;cell.alignment={horizontal:'right',vertical:'middle'}}
      if(row%2===0) cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF6F9FB'}}
    }
  }
  sheet.autoFilter={from:{row:header,column:1},to:{row:Math.max(header,sheet.rowCount),column:columns}}
  sheet.headerFooter.oddFooter = 'ViviendasLeón · Control financiero · Página &P / &N'
}
function header(sheet: ExcelJS.Worksheet,title:string,month:string,width:number,info:string[]) {
  sheet.mergeCells(1,1,1,width);sheet.getCell('A1').value='VIVIENDASLEÓN'
  sheet.getCell('A1').font={bold:true,size:17,color:{argb:`FF${NAVY}`}}
  sheet.mergeCells(2,1,2,width);sheet.getCell('A2').value=title
  sheet.getCell('A2').font={bold:true,size:14,color:{argb:`FF${NAVY}`}}
  sheet.getRow(2).height=26
  sheet.mergeCells(3,1,3,width);sheet.getCell('A3').value=`PERÍODO: ${monthLabel(month)} · MONEDA: QUETZALES`
  sheet.getCell('A3').font={size:10,color:{argb:`FF${GREY}`}}
  info.forEach((line,i)=>{sheet.mergeCells(4+i,1,4+i,width);sheet.getCell(4+i,1).value=safe(line);sheet.getCell(4+i,1).font={size:10}})
  return 4+info.length
}
function finish(sheet:ExcelJS.Worksheet,label:string,headerRow:number,cols:number,totals:Array<{col:number;value:number}>) {
  const last=sheet.rowCount+1
  sheet.mergeCells(last,1,last,Math.min(...totals.map(t=>t.col))-1)
  sheet.getCell(last,1).value=label
  sheet.getRow(last).font={bold:true,color:{argb:`FF${NAVY}`}}
  totals.forEach(t=>{const c=sheet.getRow(last).getCell(t.col);c.value=t.value;c.numFmt=CURRENCY})
  const sign=last+3
  sheet.getCell(sign,2).value='________________________________'
  sheet.getCell(sign,Math.max(4,cols-1)).value='________________________________'
  sheet.getCell(sign+1,2).value='Responsable'
  sheet.getCell(sign+1,Math.max(4,cols-1)).value='Revisión'
  sheet.pageSetup.printTitlesRow=`1:${headerRow}`
}
/** Reproduce las secciones y el orden del Libro auxiliar de bancos institucional.
 * En lugar de incluir el PDF de referencia (con datos personales), dibuja la
 * plantilla y utiliza EXCLUSIVAMENTE los movimientos autorizados de la API.
 */
export function makeBankLedgerWorkbook(month:string, account:StatementAccount, opening:string, records:StatementMovement[]) {
  const book = new ExcelJS.Workbook()
  book.creator = 'ViviendasLeón · Control financiero'
  const sh = book.addWorksheet('LIBRO AUXILIAR DE BANCOS', {
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: {left:0.2,right:0.2,top:0.25,bottom:0.25,header:0.1,footer:0.1} },
  })
  const cols = [6,14,23,27,63,16,16,17]
  cols.forEach((width,i) => {sh.getColumn(i+1).width=width})
  const logo = book.addImage({filename: fileURLToPath(new URL('../../../assets/bank-ledger-logo.jpg',import.meta.url)),extension:'jpeg'})
  sh.addImage(logo,{tl:{col:0.25,row:0.45},ext:{width:215,height:43}})
  for(let row=1;row<=4;row++)sh.getRow(row).height=15
  sh.mergeCells('C5:H5');sh.getCell('C5').value='LIBRO AUXILIAR DE BANCOS'
  sh.getCell('C5').font={size:12,bold:true};sh.getCell('C5').alignment={horizontal:'center'}
  for(const [row,label,value] of [
    [6,'CUENTA BANCARIA:',account.nombre],
    [7,'NÚMERO DE CUENTA:',account.referencia||''],
    [8,'MES:',monthLabel(month)],
    [9,'MONEDA:','QUETZALES'],
  ] as Array<[number,string,string]>) {
    sh.mergeCells(row,1,row,2);sh.getCell(row,1).value=label;sh.getCell(row,1).font={bold:true,size:9}
    sh.mergeCells(row,3,row,5);sh.getCell(row,3).value=safe(value);sh.getCell(row,3).font={size:9}
    sh.getRow(row).height=18
  }
  sh.mergeCells('F10:G10');sh.getCell('F10').value='SALDO INICIAL';sh.getCell('F10').font={bold:true,size:9}
  sh.getCell('F10').alignment={horizontal:'right'}
  sh.getCell('H10').value=Number(opening);sh.getCell('H10').numFmt='"Q "#,##0.00;"-Q "#,##0.00;"Q 0.00"'
  sh.getCell('H10').border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}
  sh.getRow(10).height=19
  sh.getRow(11).height=9
  const headerRow=12
  const headers=['NO','FECHA','CHEQUE /\nTRANSFERENCIA','BENEFICIARIO','DESCRIPCIÓN','INGRESO','EGRESO','BALANCE']
  headers.forEach((h,i)=>{const c=sh.getCell(headerRow,i+1);c.value=h;c.font={bold:true,size:9};c.alignment={vertical:'middle',horizontal:i>=5?'center':'left',wrapText:true};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFD0D0D0'}};c.border={top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}}})
  sh.getRow(headerRow).height=32
  const data=ledgerStatement(opening,records)
  const count=Math.max(30,data.rows.length)
  const from=headerRow+1
  const fm='"Q "#,##0.00;"-Q "#,##0.00;"Q 0.00"'
  for(let i=0;i<count;i++){
    const row=from+i,r=data.rows[i]
    const cells=[i+1,r?formatFinancialDate(r.fecha):'',r?safe(r.referencia):'',r?safe(r.beneficiario):'',r?safe(r.descripcion):'',r?r.ingreso:null,r?r.egreso:null,null]
    cells.forEach((v,j)=>{const c=sh.getCell(row,j+1);c.value=v;c.font={size:8.5};c.border={top:{style:'hair'},bottom:{style:'hair'},left:{style:'hair'},right:{style:'hair'}};c.alignment={vertical:'middle',wrapText:true,horizontal:j>=5?'right':j===0?'center':'left'};if(j>=5)c.numFmt=fm})
    // Saldo calculado en la hoja, incluyendo renglones vacíos de la plantilla.
    sh.getCell(row,8).value={formula:`H${i===0?10:row-1}+IF(F${row}="",0,F${row})-IF(G${row}="",0,G${row})`,result:r?.saldo??(data.rows.length?data.closing:data.opening)}
    const text=r?.descripcion??''
    const lines=text.split(/\r?\n/).reduce((sum,line)=>sum+Math.max(1,Math.ceil(line.length/59)),0)
    sh.getRow(row).height=r?Math.max(19,lines*14):15
  }
  const end=from+count-1, total=end+1
  sh.mergeCells(total,1,total,5);sh.getCell(total,1).value='TOTALES'
  sh.getCell(total,1).alignment={horizontal:'right'}
  for(const [col,formula,result] of [[6,`SUM(F${from}:F${end})`,data.ingresos],[7,`SUM(G${from}:G${end})`,data.egresos],[8,`H${end}`,data.closing]] as Array<[number,string,number]>) {
    const c=sh.getCell(total,col);c.value={formula,result};c.numFmt=fm
  }
  for(let col=1;col<=8;col++){const c=sh.getCell(total,col);c.font={bold:true,size:9};c.border={top:{style:'medium'},bottom:{style:'thin'}}}
  sh.getRow(total).height=20
  const signatures=total+4
  sh.mergeCells(signatures,2,signatures,4);sh.mergeCells(signatures,6,signatures,8)
  sh.getCell(signatures,2).value='_________________________________';sh.getCell(signatures,6).value='_________________________________'
  sh.getCell(signatures+1,2).value='F. ADMINISTRADOR';sh.getCell(signatures+1,6).value='F. CONTADOR'
  sh.getCell(signatures+2,2).value='NOMBRE: ______________________';sh.getCell(signatures+2,6).value='NOMBRE: ______________________'
  sh.getCell(signatures+4,2).value='FECHA REVISIÓN: __________________'
  for(const r of [signatures,signatures+1,signatures+2,signatures+4]){
    sh.getRow(r).height=18;for(const col of [2,6])sh.getCell(r,col).font={size:9,bold:r===signatures+1}
  }
  sh.pageSetup.printArea=`A1:H${signatures+4}`
  sh.pageSetup.printTitlesRow=`1:${headerRow}`
  return book
}

export function makeLedgerWorkbook(kind:'bancos'|'caja-chica'|'fondos-medicos',month:string,account:StatementAccount,opening:string,records:StatementMovement[],subaccounts:StatementSubaccount[]=[]){
  const book=new ExcelJS.Workbook();book.creator='ViviendasLeón · Control financiero'
  const result=ledgerStatement(opening,records)
  if(kind==='bancos') {
    return makeBankLedgerWorkbook(month,account,opening,records)
  } else if (kind==='caja-chica') {
    const sheet=book.addWorksheet('Liquidación caja chica')
    const h=header(sheet,'LIQUIDACIÓN DE CAJA CHICA',month,6,[`FONDO: ${account.nombre}`,`SALDO INICIAL: ${financialMoney(result.opening)}`])
    sheet.addRow(['No.','Fecha','Nombre / descripción','Debe (Q)','Haber (Q)','Saldo (Q)'])
    result.rows.forEach(r=>sheet.addRow([r.numero,formatFinancialDate(r.fecha),safe(r.descripcion),r.ingreso,r.egreso,r.saldo]))
    sheet.columns=[{width:7},{width:14},{width:66},{width:19},{width:19},{width:19}]
    styleTable(sheet,h,6,[4,5,6]);finish(sheet,'TOTALES',h,6,[{col:4,value:result.ingresos},{col:5,value:result.egresos},{col:6,value:result.closing}])
    const byCategory=new Map<string,{ingresos:number;egresos:number}>()
    result.rows.forEach(r=>{const k=r.categoria||'Sin categoría', v=byCategory.get(k)||{ingresos:0,egresos:0};v.ingresos+=r.ingreso;v.egresos+=r.egreso;byCategory.set(k,v)})
    const categories=book.addWorksheet('Cuentas de gasto')
    const hc=header(categories,'DESGLOSE POR CUENTA',month,3,[`FONDO: ${account.nombre}`])
    categories.addRow(['Categoría','Debe Q','Haber Q'])
    Array.from(byCategory).sort().forEach(([n,v])=>categories.addRow([safe(n),v.ingresos,v.egresos]))
    categories.columns=[{width:58},{width:20},{width:20}];styleTable(categories,hc,3,[2,3])
  } else {
    // El libro original muestra saldos por persona; conservamos una hoja individual por subcuenta.
    const balances=book.addWorksheet('Saldos por persona')
    const h=header(balances,'CONTROL DE CUENTA MÉDICA',month,5,[`FONDO: ${account.nombre}`,`REFERENCIA: ${account.referencia||'No registrada'}`])
    balances.addRow(['Subcuenta','Saldo inicial Q','Ingresos Q','Egresos Q','Saldo final Q'])
    for(const sub of subaccounts) {
      const r=ledgerStatement(sub.saldoAnterior,records.filter(m=>m.subcuentaId===sub.id))
      balances.addRow([safe(sub.nombre),r.opening,r.ingresos,r.egresos,r.closing])
    }
    balances.columns=[{width:36},{width:21},{width:21},{width:21},{width:21}]
    styleTable(balances,h,5,[2,3,4,5])
    const results=subaccounts.map(s=>ledgerStatement(s.saldoAnterior,records.filter(m=>m.subcuentaId===s.id)))
    finish(balances,'TOTALES',h,5,[
      {col:2,value:results.reduce((sum,r)=>sum+r.opening,0)},
      {col:3,value:results.reduce((sum,r)=>sum+r.ingresos,0)},
      {col:4,value:results.reduce((sum,r)=>sum+r.egresos,0)},
      {col:5,value:results.reduce((sum,r)=>sum+r.closing,0)},
    ])
    const movements=book.addWorksheet('Movimientos médicos')
    const hd=header(movements,'MOVIMIENTOS DE FONDOS MÉDICOS',month,7,[`FONDO: ${account.nombre}`])
    movements.addRow(['Fecha','Documento','Descripción del movimiento','Subcuenta','Ingresos Q','Egresos Q','Estado'])
    result.rows.forEach(r=>movements.addRow([formatFinancialDate(r.fecha),safe(r.referencia),safe(r.descripcion),safe(r.subcuenta),r.ingreso,r.egreso,'Registrado']))
    movements.columns=[{width:15},{width:21},{width:62},{width:28},{width:18},{width:18},{width:17}]
    styleTable(movements,hd,7,[5,6])
  }
  return book
}
export function makeMonthlyWorkbook(report:StatementReport){
  const book=new ExcelJS.Workbook();book.creator='ViviendasLeón · Control financiero'
  const sheet=book.addWorksheet('Informe financiero')
  const h=header(sheet,'INFORME FINANCIERO MENSUAL',report.mes,5,[
    `INGRESOS EXTERNOS: ${financialMoney(report.ingresos)} · EGRESOS EXTERNOS: ${financialMoney(report.egresos)}`,
    `DIFERENCIA DEL MES: ${financialMoney(report.resultado)}`,
    'PRESUPUESTO: sin registrar · Los porcentajes se calcularán al incorporar presupuestos.',
  ])
  sheet.addRow(['Cuenta / rubro','Presupuesto (Q)','Ejecutado (Q)','% ejecución','Explicación'])
  for(const row of report.categorias.filter(x=>Number(x.egresos)>0)) sheet.addRow([safe(row.categoria),null,Number(row.egresos),null,''])
  sheet.columns=[{width:48},{width:22},{width:22},{width:20},{width:67}];styleTable(sheet,h,5,[2,3]);finish(sheet,'TOTAL EJECUTADO',h,5,[{col:3,value:Number(report.egresos)}])
  const movements=book.addWorksheet('Detalle de movimientos')
  const mh=header(movements,'MOVIMIENTOS DEL MES',report.mes,6,['No incluye transferencias entre cuentas ni movimientos anulados.'])
  movements.addRow(['Fecha','Cuenta','Categoría','Tipo','Descripción','Importe Q'])
  report.movimientos.forEach(m=>movements.addRow([formatFinancialDate(m.fecha),safe(m.cuenta),safe(m.categoria),m.tipo,safe(m.descripcion),Number(m.importe)]))
  movements.columns=[{width:14},{width:30},{width:34},{width:16},{width:62},{width:22}];styleTable(movements,mh,6,[6])
  return book
}
