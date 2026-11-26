/** PDF institucional imprimible sin dependencia de renderizadores externos.
 * No reproduce las firmas ni datos particulares de los archivos de referencia.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { financialMoney, ledgerStatement, monthLabel, formatFinancialDate, type StatementAccount, type StatementMovement, type StatementReport, type StatementSubaccount } from './finance.statements.js'

type PdfColumn = {title:string;width:number;align?:'right'}
type PdfRow = string[]
const A4 = {width:842,height:595}
function pdfString(value: string) {
  // Fuentes base WinAnsi: normalizamos caracteres sin representación en la codificación.
  return value.replace(/[\u2013\u2014]/g,'-').replace(/[\u2018\u2019]/g,"'")
    .replace(/[\u201c\u201d]/g,'"').replace(/\u2026/g,'...').replace(/[^\x20-\xFF]/g, '?')
    .replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')
}
const wrapWords = (text:string,limit:number) => {
  const lines:string[]=[]
  let current=''
  for(const part of text.replace(/\s+/g,' ').trim().split(' ')) {
    if(!part)continue
    if((current?current.length+1:0)+part.length<=limit){current+=(current?' ':'')+part;continue}
    if(current){lines.push(current);current=''}
    if(part.length<=limit){current=part;continue}
    for(let i=0;i<part.length;i+=limit){const piece=part.slice(i,i+limit);if(piece.length===limit)lines.push(piece);else current=piece}
  }
  if(current)lines.push(current)
  return lines.length?lines:['']
}
const cap = (value:unknown,max:number)=>{
  const string=String(value??'').replace(/\s+/g,' ').trim()
  return string.length>max?string.slice(0,Math.max(1,max-3))+'...':string
}
class Pdf {
  pages:string[][]=[[]];y=0
  readonly width:number;readonly height:number
  private readonly mono:boolean
  private readonly jpegImages: Array<{name:string;data:Buffer;width:number;height:number}>=[]
  constructor(size=A4,mono=false){this.width=size.width;this.height=size.height;this.mono=mono;this.next()}
  next(){
    if(this.pages.length===1&&!this.pages[0].length){this.y=0;return}
    this.pages.push([]);this.y=0
  }
  private get content(){return this.pages[this.pages.length-1]}
  rect(x:number,y:number,w:number,h:number,fill='1 1 1') {this.content.push(`${fill} rg ${x.toFixed(1)} ${(this.height-y-h).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`)}
  rule(x:number,y:number,toX:number,toY:number){this.content.push(`0 0 0 RG 0.4 w ${x.toFixed(1)} ${(this.height-y).toFixed(1)} m ${toX.toFixed(1)} ${(this.height-toY).toFixed(1)} l S`)}
  jpeg(name:string,data:Buffer,width:number,height:number,x:number,y:number,w:number,h:number){
    if(!this.jpegImages.some(im=>im.name===name))this.jpegImages.push({name,data,width,height})
    this.content.push(`q ${w.toFixed(1)} 0 0 ${h.toFixed(1)} ${x.toFixed(1)} ${(this.height-y-h).toFixed(1)} cm /${name} Do Q`)
  }
  line(x:number,y:number,toX:number,toY:number){this.content.push(`0.77 0.82 0.86 RG 0.45 w ${x.toFixed(1)} ${(this.height-y).toFixed(1)} m ${toX.toFixed(1)} ${(this.height-toY).toFixed(1)} l S`)}
  text(x:number,y:number,text:string,size=9,bold=false,align:'left'|'right'='left'){
    const raw=cap(text,400)
    const approx=raw.length*size*(bold?.53:.51)
    const start=align==='right'?Math.max(26,x-approx):x
    this.content.push(`${this.mono?'0 0 0':'0.13 0.27 0.39'} rg BT /F${bold?2:1} ${size} Tf 1 0 0 1 ${start.toFixed(1)} ${(this.height-y).toFixed(1)} Tm (${pdfString(raw)}) Tj ET`)
  }
  heading(title:string,month:string,subline:string[]){
    this.rect(0,0,this.width,8,'0.18 0.43 0.57')
    this.text(30,37,'ViviendasLeón',19,true)
    this.text(30,51,'Sosteniendo a las comunidades rurales',8)
    this.text(this.width/2,35,title,13,true)
    this.text(this.width/2,51,`PERÍODO: ${monthLabel(month)}  ·  QUETZALES`,9)
    let y=72
    for(const line of subline){this.text(30,y,cap(line,145),9);y+=15}
    this.y=Math.max(100,y+6)
  }
  table(columns:PdfColumn[],rows:PdfRow[],title?:string){
    const x0=30;const total=this.width-60
    const totalWidth=columns.reduce((a,b)=>a+b.width,0)
    const widths=columns.map(c=>c.width/totalWidth*total)
    const writeHeader=()=>{
      if(title){this.text(30,this.y,title,10,true);this.y+=17}
      this.rect(x0,this.y,total,25,'0.15 0.33 0.45')
      let x=x0
      columns.forEach((column,i)=>{
        const max=Math.floor((widths[i]-10)/5.5)
        const s=cap(column.title,max)
        // Cabeceras blancas.
        this.content.push(`1 1 1 rg BT /F2 8 Tf 1 0 0 1 ${(column.align==='right'?x+widths[i]-6-s.length*4:x+5).toFixed(1)} ${(this.height-this.y-16).toFixed(1)} Tm (${pdfString(s)}) Tj ET`)
        x+=widths[i]
      })
      this.y+=25
    }
    writeHeader()
    for(const [index,row] of rows.entries()) {
      const lines=row.map((v,i)=>{
        const limit=Math.max(7,Math.floor((widths[i]-11)/4.1))
        return wrapWords(String(v??''),limit)
      })
      const rowHeight=Math.max(24,...lines.map(v=>v.length*10+8))
      if(this.y+rowHeight>this.height-53){this.next();this.y=30;writeHeader()}
      if(index%2===1)this.rect(x0,this.y,total,rowHeight,'0.96 0.97 0.98')
      let x=x0
      lines.forEach((parts,i)=>{
        const txt=parts
        for (let k=0;k<txt.length;k++) this.text(columns[i].align==='right'?x+widths[i]-5:x+5,this.y+14+k*10,txt[k],7.6,false,columns[i].align==='right'?'right':'left')
        x+=widths[i]
      })
      this.line(x0,this.y+rowHeight,x0+total,this.y+rowHeight)
      this.y+=rowHeight
    }
    this.y+=14
  }
  total(label:string,amountValue:string){
    if(this.y>this.height-96){this.next();this.y=35}
    this.text(35,this.y,label,10,true);this.text(this.width-35,this.y,amountValue,10,true,'right');this.y+=17
  }
  signatures(){
    if(this.y>this.height-98){this.next();this.y=50}
    this.y+=25
    this.line(50,this.y,330,this.y);this.line(480,this.y,770,this.y)
    this.text(145,this.y+14,'F. RESPONSABLE',9,true)
    this.text(570,this.y+14,'F. REVISOR',9,true)
  }
  build():Buffer {
    const objects:string[]=[]
    const add=(s:string)=>{objects.push(s);return objects.length}
    const catalog=add('')
    const pagesRoot=add('')
    const normal=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
    const bold=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
    const images=this.jpegImages.map(im=>{const encoded=im.data.toString('latin1');return {name:im.name,ref:add(`<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>\nstream\n${encoded}\nendstream`)}})
    const xobjects=images.length?`/XObject << ${images.map(im=>`/${im.name} ${im.ref} 0 R`).join(' ')} >>`:''
    const ids=[] as number[]
    this.pages.forEach((commands,i)=>{
      commands.push(`0.45 0.50 0.56 rg BT /F1 8 Tf 1 0 0 1 30 20 Tm (Control financiero - Página ${i+1}/${this.pages.length}) Tj ET`)
      const stream=commands.join('\n')+'\n';const length=Buffer.byteLength(stream,'latin1')
      const body=add(`<< /Length ${length} >>\nstream\n${stream}endstream`)
      ids.push(add(`<< /Type /Page /Parent ${pagesRoot} 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Contents ${body} 0 R /Resources << /Font << /F1 ${normal} 0 R /F2 ${bold} 0 R >> ${xobjects} >> >>`))
    })
    objects[catalog-1]=`<< /Type /Catalog /Pages ${pagesRoot} 0 R >>`
    objects[pagesRoot-1]=`<< /Type /Pages /Count ${ids.length} /Kids [${ids.map(i=>`${i} 0 R`).join(' ')}] >>`
    let result='%PDF-1.4\n%\xD3\xD4\xD5\xD6\n';const offsets=[0]
    objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(result,'latin1'));result+=`${i+1} 0 obj\n${o}\nendobj\n`})
    const start=Buffer.byteLength(result,'latin1')
    result+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`
    offsets.slice(1).forEach(x=>{result+=`${String(x).padStart(10,'0')} 00000 n \n`})
    result+=`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${start}\n%%EOF\n`
    return Buffer.from(result,'latin1')
  }
}

/** Hoja bancaria con el formato y los campos del auxiliar utilizado por la ONG.
 * Solo se extrae su logotipo institucional; no se incluye la página original,
 * ni sus movimientos, firmas, números de cuenta o saldos particulares.
 */
export function makeBankLedgerPdf(month:string,account:StatementAccount,opening:string,movements:StatementMovement[]):Buffer {
  const pdf=new Pdf({width:612,height:792},true)
  const result=ledgerStatement(opening,movements)
  const logo=readFileSync(fileURLToPath(new URL('../../../assets/bank-ledger-logo.jpg',import.meta.url)))
  const boundaries=[18,37,77,159,259,458,504,550,596]
  let index=0,previous=result.opening
  let page=0
  const format=(n:number)=>n===0?'':financialMoney(n)
  function startPage(){
    if(page++>0)pdf.next()
    pdf.jpeg('ImBank',logo,1000,200,22,80,130,26)
    pdf.text(257,131,'LIBRO AUXILIAR DE BANCOS',9,true)
    pdf.text(18,143,'CUENTA BANCARIA:',8,true);pdf.text(116,143,account.nombre,8)
    pdf.text(18,157,'NÚMERO DE CUENTA:',8,true);pdf.text(116,157,account.referencia??'',8)
    pdf.text(18,171,'MES:',8,true);pdf.text(116,171,monthLabel(month),8)
    pdf.text(18,185,'MONEDA:',8,true);pdf.text(116,185,'QUETZALES',8)
    pdf.text(467,198,'SALDO INICIAL',7.1,true)
    pdf.rule(551,187,599,187);pdf.rule(551,201,599,201)
    pdf.rule(551,187,551,201);pdf.rule(599,187,599,201)
    pdf.text(595,197,financialMoney(previous),7.1,false,'right')
    pdf.rect(18,211,578,22,'0.81 0.81 0.81')
    const heads=['NO','FECHA','CHEQUE /','BENEFICIARIO','DESCRIPCIÓN','INGRESO','EGRESO','BALANCE']
    for(let i=0;i<8;i++){
      pdf.text(boundaries[i]+2,226,heads[i],6.6,true)
      if(i===2)pdf.text(boundaries[i]+2,232,'TRANSFERENCIA',6.1,true)
      pdf.rule(boundaries[i],211,boundaries[i],233)
    }
    pdf.rule(596,211,596,233);pdf.rule(18,211,596,211);pdf.rule(18,233,596,233)
    pdf.y=233
  }
  function bankRow(no:number,row:ReturnType<typeof ledgerStatement>['rows'][number]|undefined){
    const fields=[String(no),row?formatFinancialDate(row.fecha):'',row?.referencia??'',row?.beneficiario??'',row?.descripcion??'',row?format(row.ingreso):'',row?format(row.egreso):'',financialMoney(row?.saldo??previous)]
    const limits=boundaries.slice(0,-1).map((x,i)=>Math.max(3,Math.floor((boundaries[i+1]-x-4)/3.5)))
    const lines=fields.map((txt,i)=>wrapWords(txt,limits[i]))
    const height=Math.max(11.2,...lines.map(arr=>arr.length*7.3+3))
    return {lines,height}
  }
  const drawRow=(no:number,row:ReturnType<typeof ledgerStatement>['rows'][number]|undefined)=>{
    const data=bankRow(no,row)
    if(pdf.y+data.height>596) return false
    const top=pdf.y,bot=top+data.height
    if(row)previous=row.saldo
    for(let c=0;c<8;c++){
      pdf.rule(boundaries[c],top,boundaries[c],bot)
      data.lines[c].forEach((line,j)=>{
        const x=c>=5?boundaries[c+1]-3:boundaries[c]+2.5
        pdf.text(x,top+7.5+j*7.3,line,6.6,false,c>=5?'right':'left')
      })
    }
    pdf.rule(596,top,596,bot);pdf.rule(18,bot,596,bot)
    pdf.y=bot
    return true
  }
  startPage()
  while(index<result.rows.length){
    const row=result.rows[index]
    if(!drawRow(index+1,row)){
      // Cuando una descripción ocupa varias líneas, continuamos en otra página
      // en lugar de cortar el texto para obligarlo a caber en 30 renglones.
      startPage()
      if(!drawRow(index+1,row))throw Error('FILA_BANCARIA_DEMASIADO_ALTA')
    }
    index++
  }
  // Se completan renglones vacíos únicamente si caben en la misma hoja.
  // Si hay descripciones largas, nunca se parte un renglón ni se añaden
  // hojas extra solo para incluir filas vacías del modelo impreso.
  while(index<30 && pdf.y+bankRow(index+1,undefined).height<=576){
    drawRow(index+1,undefined);index++
  }
  if(pdf.y>605){startPage()}
  const y=Math.max(602,pdf.y+5)
  pdf.rule(18,y-10,596,y-10)
  pdf.text(352,y,'TOTALES',8,true)
  pdf.text(500,y,financialMoney(result.ingresos),7.2,false,'right')
  pdf.text(546,y,financialMoney(result.egresos),7.2,false,'right')
  pdf.text(594,y,financialMoney(result.closing),7.2,false,'right')
  pdf.rule(18,y+5,596,y+5)
  const signY=Math.min(694,Math.max(660,y+50))
  pdf.rule(115,signY,255,signY);pdf.rule(392,signY,540,signY)
  pdf.text(145,signY+13,'F. ADMINISTRADOR',8,true)
  pdf.text(430,signY+13,'F. CONTADOR',8,true)
  pdf.text(116,signY+27,'NOMBRE: _____________________',7.6)
  pdf.text(391,signY+27,'NOMBRE: _____________________',7.6)
  pdf.text(20,signY+58,'FECHA REVISIÓN: __________________',7.7)
  return pdf.build()
}

export function makeLedgerPdf(kind:'bancos'|'caja-chica'|'fondos-medicos',month:string,account:StatementAccount,opening:string,movements:StatementMovement[],subs:StatementSubaccount[]=[]){
  if(kind==='bancos')return makeBankLedgerPdf(month,account,opening,movements)
  const pdf=new Pdf();const result=ledgerStatement(opening,movements)
  if(kind==='caja-chica'){
    pdf.heading('LIQUIDACIÓN DE CAJA CHICA',month,[`FONDO: ${account.nombre}`,`SALDO INICIAL: ${financialMoney(result.opening)}`])
    pdf.table([{title:'No.',width:7},{title:'Fecha',width:15},{title:'Nombre / Descripción',width:65},{title:'Debe',width:16,align:'right'},{title:'Haber',width:16,align:'right'},{title:'Saldo',width:18,align:'right'}],
      result.rows.map(r=>[String(r.numero),formatFinancialDate(r.fecha),r.descripcion,financialMoney(r.ingreso),financialMoney(r.egreso),financialMoney(r.saldo)]))
    const categories=new Map<string,{incomes:number;expenses:number}>()
    result.rows.forEach(r=>{const key=r.categoria||'Sin categoría';const v=categories.get(key)||{incomes:0,expenses:0};v.incomes+=r.ingreso;v.expenses+=r.egreso;categories.set(key,v)})
    pdf.table([{title:'Cuenta de gasto',width:66},{title:'Debe',width:17,align:'right'},{title:'Haber',width:17,align:'right'}],Array.from(categories).map(([key,v])=>[key,financialMoney(v.incomes),financialMoney(v.expenses)]),'DESGLOSE POR CUENTA')
  }else{
    pdf.heading('CONTROL DE CUENTA MÉDICA',month,[`FONDO: ${account.nombre} · Ref.: ${account.referencia||'Sin referencia'}`])
    pdf.table([{title:'Subcuenta',width:40},{title:'Saldo inicial',width:15,align:'right'},{title:'Ingresos',width:15,align:'right'},{title:'Egresos',width:15,align:'right'},{title:'Saldo final',width:15,align:'right'}],subs.map(sub=>{
      const r=ledgerStatement(sub.saldoAnterior,movements.filter(m=>m.subcuentaId===sub.id))
      return [sub.nombre,financialMoney(r.opening),financialMoney(r.ingresos),financialMoney(r.egresos),financialMoney(r.closing)]
    }),'SALDOS POR PERSONA')
    pdf.table([{title:'Fecha',width:12},{title:'Documento',width:15},{title:'Descripción del movimiento',width:34},{title:'Subcuenta',width:19},{title:'Ingreso',width:12,align:'right'},{title:'Egreso',width:12,align:'right'}],result.rows.map(r=>[formatFinancialDate(r.fecha),r.referencia||'',r.descripcion,r.subcuenta||'',financialMoney(r.ingreso),financialMoney(r.egreso)]),'MOVIMIENTOS')
  }
  pdf.total('TOTAL INGRESOS',financialMoney(result.ingresos));pdf.total('TOTAL EGRESOS',financialMoney(result.egresos))
  pdf.total('SALDO FINAL',financialMoney(result.closing));pdf.signatures()
  return pdf.build()
}
export function makeMonthlyPdf(report:StatementReport){
  const pdf=new Pdf()
  pdf.heading('INFORME FINANCIERO MENSUAL',report.mes,[
    `INGRESOS EXTERNOS: ${financialMoney(report.ingresos)} · EGRESOS EXTERNOS: ${financialMoney(report.egresos)}`,
    `DIFERENCIA DEL MES: ${financialMoney(report.resultado)}`,
    'Presupuesto no registrado: no se calcula el porcentaje de ejecución.',
  ])
  pdf.table([{title:'Categoría / cuenta',width:42},{title:'Presupuesto',width:16,align:'right'},{title:'Ejecutado',width:17,align:'right'},{title:'% ejecución',width:13,align:'right'},{title:'Explicación',width:22}],
    report.categorias.filter(c=>Number(c.egresos)>0).map(c=>[c.categoria,'Sin registrar',financialMoney(c.egresos),'—','']),
    'EJECUCIÓN POR CATEGORÍA')
  pdf.total('INGRESOS EXTERNOS',financialMoney(report.ingresos));pdf.total('EGRESOS EXTERNOS',financialMoney(report.egresos))
  pdf.total('RESULTADO DEL MES',financialMoney(report.resultado));pdf.signatures()
  return pdf.build()
}
