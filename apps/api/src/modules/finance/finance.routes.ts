import { Router, raw } from 'express'
import { randomUUID } from 'node:crypto'
import { makeLedgerWorkbook, makeMonthlyWorkbook, type StatementMovement, type StatementSubaccount } from './finance.statements.js'
import { makeLedgerPdf, makeMonthlyPdf } from './finance.statement-pdf.js'
import { Prisma } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import { requirePermission, esDireccionGeneral } from '../auth/require-permission.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { FIN_TYPES, isFinType, validAmount, validDay, validMonth, textField, positiveId, externalTotals } from './finance.rules.js'

export const financeRouter = Router()
type Account = { id: number; tipo: string; nombre: string; referencia: string | null; saldoInicial: string; fechaApertura: string; activo: boolean; saldo: string; movimientos: number }
type Movement = { id: number; cuentaId: number; subcuentaId: number | null; subcuenta: string | null; categoria: string | null; categoriaId: number | null; fecha: string; tipo: string; importe: string; descripcion: string; referencia: string | null; beneficiario: string | null; trasladoId: string | null; creadoEn: string; anuladoEn: string | null; tieneComprobante: boolean }
type Subaccount = { id: number; nombre: string; saldoInicial: string; activa: boolean; saldo: string }
type Category = { id: number; nombre: string; grupo: string }
const db = () => getPrismaClient()
const error = (res: import('express').Response, message: string, status = 400) => res.status(status).json({ error: { code: status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message } })
const mesActual = () => new Date().toISOString().slice(0, 7)
const parsePeriod = (value: unknown) => {
  const month = value === undefined ? mesActual() : value
  if (!validMonth(month)) return null
  const [y, m] = month.split('-').map(Number)
  const start = `${month}-01`
  const end = `${new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10)}`
  return { month, start, end }
}
const safeExcelText = (value: unknown) => {
  const str = String(value ?? '')
  return /^[\s]*[=+@\-]/.test(str) ? `'${str}` : str
}
// Las bitácoras financieras se escriben en la MISMA transacción que el movimiento.
const auditInsert = async (tx: Prisma.TransactionClient, actor: number, entity: string, record: number, action: string) => tx.$executeRaw`
  INSERT INTO bitacora (usuario_id, entidad, registro_id, accion, fecha, descripcion)
  VALUES (${actor}, ${entity}, ${String(record)}, ${action}, NOW(), ${`${action} ${entity} #${record}`})`

async function readAccount(id: number, tipo: string): Promise<Account | null> {
  const rows = await db().$queryRaw<Account[]>`
    SELECT c.id, c.tipo, c.nombre, c.referencia, c.saldo_inicial::text AS "saldoInicial", c.fecha_apertura::text AS "fechaApertura", c.activo,
      (c.saldo_inicial + COALESCE((SELECT SUM(s.saldo_inicial) FROM fin_subcuenta s WHERE s.cuenta_id = c.id), 0)
      + COALESCE((SELECT SUM(CASE WHEN m.tipo = 'INGRESO' THEN m.importe ELSE -m.importe END) FROM fin_movimiento m WHERE m.cuenta_id = c.id AND m.anulado_en IS NULL), 0))::text AS saldo,
      (SELECT COUNT(*)::int FROM fin_movimiento m WHERE m.cuenta_id = c.id AND m.anulado_en IS NULL) AS movimientos
    FROM fin_cuenta c WHERE c.id = ${id} AND c.tipo = ${tipo} LIMIT 1`
  return rows[0] ?? null
}
const readSubaccounts = async (accountId: number) => db().$queryRaw<Subaccount[]>`
  SELECT s.id, s.nombre, s.saldo_inicial::text AS "saldoInicial", s.activa,
    (s.saldo_inicial + COALESCE((SELECT SUM(CASE WHEN m.tipo='INGRESO' THEN m.importe ELSE -m.importe END)
      FROM fin_movimiento m WHERE m.subcuenta_id = s.id AND m.anulado_en IS NULL),0))::text AS saldo
  FROM fin_subcuenta s WHERE s.cuenta_id=${accountId} ORDER BY s.nombre, s.id`

financeRouter.get('/categorias', requirePermission('PANTALLA_CONTROL_FINANCIERO'), async (_req, res, next) => {
  try { res.json({ data: await db().$queryRaw<Category[]>`SELECT id,nombre,grupo FROM fin_categoria WHERE activa = TRUE ORDER BY grupo,nombre` }) }
  catch (e) { next(e) }
})

async function readMonthReport(month: string, start: string, end: string) {
  const [cuentas, categorias, movimientos] = await Promise.all([
    db().$queryRaw<Array<{ tipo: string; cuentas: number; saldo: string }>>`
      SELECT c.tipo, COUNT(*)::int AS cuentas,
      (COALESCE(SUM(c.saldo_inicial),0) + COALESCE((SELECT SUM(s.saldo_inicial) FROM fin_subcuenta s),0)
       * CASE WHEN c.tipo='FONDO_MEDICO' THEN 1 ELSE 0 END
       + COALESCE((SELECT SUM(CASE WHEN m.tipo='INGRESO' THEN m.importe ELSE -m.importe END)
           FROM fin_movimiento m JOIN fin_cuenta x ON x.id=m.cuenta_id
           WHERE x.tipo=c.tipo AND m.anulado_en IS NULL AND m.fecha < ${end}::date),0))::text AS saldo
      FROM fin_cuenta c GROUP BY c.tipo ORDER BY c.tipo`,
    db().$queryRaw<Array<{ grupo: string; categoria: string; ingresos: string; egresos: string; movimientos: number }>>`
      SELECT COALESCE(cat.grupo,'OTROS') AS grupo, COALESCE(cat.nombre,'Sin categoría') AS categoria,
      COALESCE(SUM(m.importe) FILTER (WHERE m.tipo='INGRESO'),0)::text AS ingresos,
      COALESCE(SUM(m.importe) FILTER (WHERE m.tipo='EGRESO'),0)::text AS egresos,
      COUNT(*)::int AS movimientos FROM fin_movimiento m
      LEFT JOIN fin_categoria cat ON cat.id=m.categoria_id
      WHERE m.anulado_en IS NULL AND m.traslado_id IS NULL AND m.fecha >= ${start}::date AND m.fecha < ${end}::date
      GROUP BY cat.grupo,cat.nombre ORDER BY grupo,categoria`,
    db().$queryRaw<Array<{ id: number; fecha: string; cuenta: string; categoria: string | null; tipo: string; descripcion: string; importe: string }>>`
      SELECT m.id,m.fecha::text AS fecha,c.nombre AS cuenta,cat.nombre AS categoria,m.tipo,m.descripcion,m.importe::text
      FROM fin_movimiento m JOIN fin_cuenta c ON c.id=m.cuenta_id
      LEFT JOIN fin_categoria cat ON cat.id=m.categoria_id
      WHERE m.anulado_en IS NULL AND m.traslado_id IS NULL AND m.fecha >= ${start}::date AND m.fecha < ${end}::date
      ORDER BY m.fecha,m.id LIMIT 2000`,
  ])
  return { mes: month, preliminar: true, ...externalTotals(categorias), cuentas, categorias, movimientos }
}

financeRouter.get('/informe-mensual', requirePermission('PANTALLA_FINANZAS_INFORME'), async (req, res, next) => {
  const period = parsePeriod(req.query.mes)
  if (!period) { error(res, 'Mes no válido.'); return }
  try { res.setHeader('Cache-Control', 'no-store, private'); res.json({ data: await readMonthReport(period.month, period.start, period.end) }) }
  catch (e) { next(e) }
})

async function exportMonthly(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction, format: 'xlsx'|'pdf') {
  const period = parsePeriod(req.query.mes)
  if (!period) {error(res, 'Mes no válido.'); return}
  try {
    const report = await readMonthReport(period.month, period.start, period.end)
    const bytes = format === 'pdf' ? makeMonthlyPdf(report) : Buffer.from(await makeMonthlyWorkbook(report).xlsx.writeBuffer())
    sendFinancialFile(res, bytes, `Informe_Financiero_${period.month}.${format}`, format)
  } catch(e) { next(e) }
}
function sendFinancialFile(res: import('express').Response, bytes: Buffer, filename: string, format: 'pdf'|'xlsx') {
  res.setHeader('Content-Type', format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(bytes)
}
financeRouter.get('/informe-mensual.xlsx', requirePermission('PANTALLA_FINANZAS_INFORME'), (req,res,next) => void exportMonthly(req,res,next,'xlsx'))
financeRouter.get('/informe-mensual.pdf', requirePermission('PANTALLA_FINANZAS_INFORME'), (req,res,next) => void exportMonthly(req,res,next,'pdf'))

// La pantalla solo permite transferencias internas entre cuentas registradas; jamás suma ambas caras a ingresos externos.
financeRouter.post('/transferencias', requirePermission('FINANZAS_WRITE'), async (req, res, next) => {
  const from = positiveId(req.body?.origenId); const to = positiveId(req.body?.destinoId)
  const fromSub = req.body?.subcuentaOrigenId == null ? null : positiveId(req.body.subcuentaOrigenId)
  const toSub = req.body?.subcuentaDestinoId == null ? null : positiveId(req.body.subcuentaDestinoId)
  const amount = req.body?.importe
  const date = req.body?.fecha
  if (!from || !to || from === to || !validAmount(amount) || !validDay(date) || (req.body?.subcuentaOrigenId != null && !fromSub) || (req.body?.subcuentaDestinoId != null && !toSub)) { error(res,'Revisa los datos de la transferencia.'); return }
  try {
    const actor = req.session.userId!
    const result = await db().$transaction(async tx => {
      const accounts = await tx.$queryRaw<Array<{ id:number; tipo:string; activo:boolean; fechaApertura:string }>>`SELECT id,tipo,activo,fecha_apertura::text AS "fechaApertura" FROM fin_cuenta WHERE id IN (${from},${to}) ORDER BY id FOR UPDATE`
      if (accounts.length !== 2 || accounts.some(x => !x.activo || date<x.fechaApertura)) throw Error('CUENTA_INVALIDA')
      const user = await getAuthenticatedUser(actor)
      if (!user || (!esDireccionGeneral(user.roles) && accounts.some(x => !Object.values(FIN_TYPES).some(t => t.code === x.tipo && user.permisos.includes(t.permission))))) throw Error('NO_PERMITIDO')
      if ((accounts.find(x=>x.id===from)?.tipo === 'FONDO_MEDICO') !== Boolean(fromSub) || (accounts.find(x=>x.id===to)?.tipo === 'FONDO_MEDICO') !== Boolean(toSub)) throw Error('SUBCUENTA_REQUERIDA')
      if (fromSub || toSub) {
        const sub = await tx.$queryRaw<Array<{ id:number; cuentaId:number }>>`SELECT id,cuenta_id AS "cuentaId" FROM fin_subcuenta WHERE activa=TRUE AND id IN (${fromSub ?? -1},${toSub ?? -1})`
        if ((fromSub && !sub.some(s=>s.id===fromSub && s.cuentaId===from)) || (toSub && !sub.some(s=>s.id===toSub && s.cuentaId===to))) throw Error('SUBCUENTA_INVALIDA')
      }
      const group = randomUUID()
      const left = await tx.$queryRaw<Array<{id:number}>>`INSERT INTO fin_movimiento(cuenta_id,subcuenta_id,fecha,tipo,importe,descripcion,traslado_id,creado_por_id) VALUES(${from},${fromSub},${date}::date,'EGRESO',${String(amount)}::numeric,'Transferencia interna',${group}::uuid,${actor}) RETURNING id`
      const right = await tx.$queryRaw<Array<{id:number}>>`INSERT INTO fin_movimiento(cuenta_id,subcuenta_id,fecha,tipo,importe,descripcion,traslado_id,creado_por_id) VALUES(${to},${toSub},${date}::date,'INGRESO',${String(amount)}::numeric,'Transferencia interna',${group}::uuid,${actor}) RETURNING id`
      await auditInsert(tx,actor,'fin_movimiento',left[0].id,'CREAR')
      await auditInsert(tx,actor,'fin_movimiento',right[0].id,'CREAR')
      return { origenId: left[0].id, destinoId: right[0].id }
    })
    res.status(201).json({ data: result })
  } catch (e) {
    if (e instanceof Error && ['CUENTA_INVALIDA','SUBCUENTA_REQUERIDA','SUBCUENTA_INVALIDA','NO_PERMITIDO'].includes(e.message)) { error(res,'No se puede registrar esta transferencia.',403); return }
    next(e)
  }
})

financeRouter.param('tipo',(req,res,next,value) => {
  if (!isFinType(value)) { error(res,'Apartado desconocido.',404); return }
  void requirePermission(FIN_TYPES[value].permission)(req,res,next)
})

financeRouter.get('/:tipo/cuentas', async (req,res,next) => {
  const tipo = FIN_TYPES[req.params.tipo as keyof typeof FIN_TYPES].code
  try {
    const cuentas = await db().$queryRaw<Account[]>`
      SELECT c.id,c.tipo,c.nombre,c.referencia,c.saldo_inicial::text AS "saldoInicial",c.fecha_apertura::text AS "fechaApertura",c.activo,
      (c.saldo_inicial + COALESCE((SELECT SUM(s.saldo_inicial) FROM fin_subcuenta s WHERE s.cuenta_id=c.id),0)
       + COALESCE((SELECT SUM(CASE WHEN m.tipo='INGRESO' THEN m.importe ELSE -m.importe END) FROM fin_movimiento m WHERE m.cuenta_id=c.id AND m.anulado_en IS NULL),0))::text AS saldo,
      (SELECT COUNT(*)::int FROM fin_movimiento m WHERE m.cuenta_id=c.id AND m.anulado_en IS NULL) AS movimientos
      FROM fin_cuenta c WHERE c.tipo=${tipo} ORDER BY c.activo DESC,c.nombre,c.id`
    res.setHeader('Cache-Control','no-store, private'); res.json({ data: cuentas })
  } catch(e) { next(e) }
})

financeRouter.post('/:tipo/cuentas', requirePermission('FINANZAS_WRITE'), async (req,res,next) => {
  const tipo = FIN_TYPES[req.params.tipo as keyof typeof FIN_TYPES].code
  const name=textField(req.body?.nombre,100,true); const ref=textField(req.body?.referencia,40)
  const value=req.body?.saldoInicial ?? '0'; const opened=req.body?.fechaApertura
  if (name===null || ref===null || !validAmount(value,true) || !validDay(opened) || (tipo==='FONDO_MEDICO' && Number(value)!==0)) { error(res,'Revisa el nombre, la fecha y el saldo inicial.'); return }
  try {
    const created=await db().$transaction(async tx=>{
      const rows=await tx.$queryRaw<Array<{id:number}>>`
        INSERT INTO fin_cuenta(tipo,nombre,referencia,saldo_inicial,fecha_apertura,creado_por_id)
        VALUES(${tipo},${name},${ref || null},${String(value)}::numeric,${opened}::date,${req.session.userId!}) RETURNING id`
      await auditInsert(tx,req.session.userId!,'fin_cuenta',rows[0].id,'CREAR')
      return rows[0]
    })
    res.status(201).json({ data:{id:created.id} })
  } catch(e) { next(e) }
})

financeRouter.get('/:tipo/cuentas/:id',async(req,res,next)=>{
  const id=positiveId(req.params.id); const tipo=FIN_TYPES[req.params.tipo as keyof typeof FIN_TYPES].code
  if(!id) { error(res,'Cuenta inválida.'); return }
  try {
    const cuenta=await readAccount(id,tipo)
    if(!cuenta) { error(res,'Cuenta no encontrada.',404); return }
    res.json({ data:{ ...cuenta, subcuentas: tipo==='FONDO_MEDICO'? await readSubaccounts(id):[] } })
  } catch(e) { next(e) }
})

financeRouter.post('/:tipo/cuentas/:id/subcuentas',requirePermission('FINANZAS_WRITE'),async(req,res,next)=>{
  const id=positiveId(req.params.id); const name=textField(req.body?.nombre,100,true); const opening=req.body?.saldoInicial ?? '0'
  if (!id || !name || !validAmount(opening,true) || req.params.tipo!=='fondos-medicos') { error(res,'Subcuenta inválida.'); return }
  try {
    const account=await readAccount(id,'FONDO_MEDICO')
    if(!account?.activo) { error(res,'Fondo no disponible.',404); return }
    const created=await db().$transaction(async tx=>{
      const row=await tx.$queryRaw<Array<{id:number}>>`INSERT INTO fin_subcuenta(cuenta_id,nombre,saldo_inicial) VALUES (${id},${name},${String(opening)}::numeric) ON CONFLICT (cuenta_id,nombre) DO NOTHING RETURNING id`
      if(row.length) await auditInsert(tx,req.session.userId!,'fin_subcuenta',row[0].id,'CREAR')
      return row[0] ?? null
    })
    if(!created) { error(res,'Ya existe una subcuenta con ese nombre.',409); return }
    res.status(201).json({data:{id:created.id}})
  }catch(e){next(e)}
})

financeRouter.get('/:tipo/cuentas/:id/movimientos',async(req,res,next)=>{
  const id=positiveId(req.params.id); const tipo=FIN_TYPES[req.params.tipo as keyof typeof FIN_TYPES].code
  const period=parsePeriod(req.query.mes); const page=positiveId(req.query.pagina ?? '1')
  if(!id || !period || !page || page>10000) { error(res,'Filtros no válidos.'); return }
  try {
    const account=await readAccount(id,tipo)
    if(!account) {error(res,'Cuenta no encontrada.',404);return}
    const items=await db().$queryRaw<Movement[]>`
      SELECT m.id,m.cuenta_id AS "cuentaId",m.subcuenta_id AS "subcuentaId",s.nombre AS subcuenta,
       m.categoria_id AS "categoriaId",cat.nombre AS categoria,m.fecha::text,m.tipo,m.importe::text,m.descripcion,m.referencia,m.beneficiario,
       m.traslado_id::text AS "trasladoId",m.creado_en::text AS "creadoEn",m.anulado_en::text AS "anuladoEn",
       EXISTS(SELECT 1 FROM fin_comprobante f WHERE f.movimiento_id=m.id) AS "tieneComprobante"
      FROM fin_movimiento m LEFT JOIN fin_categoria cat ON cat.id=m.categoria_id LEFT JOIN fin_subcuenta s ON s.id=m.subcuenta_id
      WHERE m.cuenta_id=${id} AND m.fecha>=${period.start}::date AND m.fecha<${period.end}::date
      ORDER BY m.fecha DESC,m.id DESC LIMIT 50 OFFSET ${(page-1)*50}`
    const sums=await db().$queryRaw<Array<{ingresos:string;egresos:string;total:number}>>`
      SELECT COALESCE(SUM(m.importe) FILTER(WHERE m.tipo='INGRESO' AND m.anulado_en IS NULL),0)::text AS ingresos,
             COALESCE(SUM(m.importe) FILTER(WHERE m.tipo='EGRESO' AND m.anulado_en IS NULL),0)::text AS egresos,
             COUNT(*)::int AS total FROM fin_movimiento m
      WHERE m.cuenta_id=${id} AND m.fecha>=${period.start}::date AND m.fecha<${period.end}::date`
    const previous=await db().$queryRaw<Array<{saldo:string}>>`
      SELECT (c.saldo_inicial+COALESCE((SELECT SUM(s.saldo_inicial) FROM fin_subcuenta s WHERE s.cuenta_id=c.id),0)
       + COALESCE((SELECT SUM(CASE WHEN m.tipo='INGRESO' THEN m.importe ELSE -m.importe END)
         FROM fin_movimiento m WHERE m.cuenta_id=c.id AND m.anulado_en IS NULL AND m.fecha<${period.start}::date),0))::text AS saldo
      FROM fin_cuenta c WHERE c.id=${id}`
    res.setHeader('Cache-Control','private, no-store')
    res.json({ data:{ cuenta:account, mes:period.month, saldoAnterior:previous[0].saldo, resumen:sums[0], movimientos:items, pagina:page, paginas:Math.ceil(Number(sums[0].total)/50) } })
  }catch(e){next(e)}
})

financeRouter.post('/:tipo/cuentas/:id/movimientos',requirePermission('FINANZAS_WRITE'),async(req,res,next)=>{
  const id=positiveId(req.params.id); const tipoCuenta=FIN_TYPES[req.params.tipo as keyof typeof FIN_TYPES].code
  const tipo=req.body?.tipo; const amount=req.body?.importe; const date=req.body?.fecha
  const description=textField(req.body?.descripcion,500,true); const reference=textField(req.body?.referencia,80)
  const beneficiary=textField(req.body?.beneficiario,120,tipoCuenta==='BANCO')
  const catId=req.body?.categoriaId == null ? null : positiveId(req.body.categoriaId)
  const subId=req.body?.subcuentaId == null ? null : positiveId(req.body.subcuentaId)
  if(!id || !['INGRESO','EGRESO'].includes(tipo) || !validAmount(amount) || !validDay(date) || !description || reference===null || beneficiary===null || (tipoCuenta==='BANCO' && !beneficiary) || !catId || (tipoCuenta==='FONDO_MEDICO' && !subId) || (tipoCuenta!=='FONDO_MEDICO' && subId)) {error(res,'Revisa los datos del movimiento.');return}
  try {
    const created=await db().$transaction(async tx=>{
      const accounts=await tx.$queryRaw<Array<{id:number;activo:boolean;fechaApertura:string}>>`SELECT id,activo,fecha_apertura::text AS "fechaApertura" FROM fin_cuenta WHERE id=${id} AND tipo=${tipoCuenta} FOR UPDATE`
      if(!accounts[0]?.activo || date<accounts[0].fechaApertura) throw Error('CUENTA_INVALIDA')
      const cats=await tx.$queryRaw<Array<{id:number}>>`SELECT id FROM fin_categoria WHERE id=${catId} AND grupo=${tipo==='INGRESO'?'INGRESOS':'GASTOS'} AND activa=TRUE`
      if(!cats.length) throw Error('CATEGORIA_INVALIDA')
      if(subId) {
        const subs=await tx.$queryRaw<Array<{id:number}>>`SELECT id FROM fin_subcuenta WHERE id=${subId} AND cuenta_id=${id} AND activa=TRUE`
        if(!subs.length) throw Error('SUBCUENTA_INVALIDA')
      }
      const row=await tx.$queryRaw<Array<{id:number}>>`
        INSERT INTO fin_movimiento(cuenta_id,subcuenta_id,categoria_id,fecha,tipo,importe,descripcion,referencia,beneficiario,creado_por_id)
        VALUES (${id},${subId},${catId},${date}::date,${tipo},${String(amount)}::numeric,${description},${reference||null},${beneficiary||null},${req.session.userId!}) RETURNING id`
      await auditInsert(tx,req.session.userId!,'fin_movimiento',row[0].id,'CREAR')
      return row[0]
    })
    res.status(201).json({ data:created })
  }catch(e){if(e instanceof Error&&e.message.endsWith('_INVALIDA')){error(res,'Cuenta, categoría o subcuenta inválida.');return}next(e)}
})

financeRouter.post('/:tipo/movimientos/:id/anular',requirePermission('FINANZAS_ANULAR'),async(req,res,next)=>{
  const id=positiveId(req.params.id), motivo=textField(req.body?.motivo,300,true)
  const tipo=FIN_TYPES[req.params.tipo as keyof typeof FIN_TYPES].code
  if(!id||!motivo){error(res,'Indica el motivo de anulación.');return}
  try {
    const updated=await db().$transaction(async tx=>{
      const found=await tx.$queryRaw<Array<{id:number;trasladoId:string|null}>>`
        SELECT m.id,m.traslado_id::text AS "trasladoId" FROM fin_movimiento m JOIN fin_cuenta c ON c.id=m.cuenta_id
        WHERE m.id=${id} AND c.tipo=${tipo} AND m.anulado_en IS NULL FOR UPDATE OF m`
      if(!found.length) return 0
      // Una transferencia se anula por ambos lados para no alterar saldos de forma unilateral.
      const ids=await tx.$queryRaw<Array<{id:number}>>`
        UPDATE fin_movimiento SET anulado_en=NOW(),anulado_por_id=${req.session.userId!},motivo_anulacion=${motivo}
        WHERE anulado_en IS NULL AND (id=${id} OR (${found[0].trasladoId}::uuid IS NOT NULL AND traslado_id=${found[0].trasladoId}::uuid)) RETURNING id`
      for(const record of ids) await auditInsert(tx,req.session.userId!,'fin_movimiento',record.id,'ANULAR')
      return ids.length
    })
    if(!updated){error(res,'Movimiento no encontrado o ya anulado.',404);return}
    res.json({ data:{anulados:updated} })
  }catch(e){next(e)}
})

// Documento privado: un único comprobante PDF/JPEG/PNG por movimiento, máximo 5 MB. No se publican URLs abiertas.
financeRouter.post('/:tipo/movimientos/:id/comprobante',requirePermission('FINANZAS_WRITE'),raw({type:['application/pdf','image/jpeg','image/png'],limit:'5mb'}),async(req,res,next)=>{
  const id=positiveId(req.params.id); const tipo=FIN_TYPES[req.params.tipo as keyof typeof FIN_TYPES].code
  const mime=String(req.headers['content-type']??'').split(';')[0]
  const buffer=req.body
  const valid=Buffer.isBuffer(buffer)&&buffer.length>0&&buffer.length<=5*1024*1024&&(
    (mime==='application/pdf'&&buffer.subarray(0,5).toString()==='%PDF-') ||
    (mime==='image/png'&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ||
    (mime==='image/jpeg'&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff))
  if(!id||!valid){error(res,'Adjunta un PDF, JPG o PNG válido (máx. 5 MB).');return}
  try{
    const row=await db().$queryRaw<Array<{id:number}>>`
      INSERT INTO fin_comprobante(movimiento_id,nombre,mime,contenido,creado_por_id)
      SELECT m.id,${`Comprobante_${id}.${mime==='application/pdf'?'pdf':mime==='image/png'?'png':'jpg'}`},${mime},${buffer},${req.session.userId!}
      FROM fin_movimiento m JOIN fin_cuenta c ON c.id=m.cuenta_id
      WHERE m.id=${id} AND c.tipo=${tipo} AND m.anulado_en IS NULL
        AND NOT EXISTS(SELECT 1 FROM fin_comprobante f WHERE f.movimiento_id=m.id)
      RETURNING id`
    if(!row.length){error(res,'Movimiento inválido o ya tiene comprobante.',409);return}
    res.status(201).json({data:{id:row[0].id}})
  }catch(e){next(e)}
})

financeRouter.get('/:tipo/movimientos/:id/comprobante',async(req,res,next)=>{
  const id=positiveId(req.params.id),tipo=FIN_TYPES[req.params.tipo as keyof typeof FIN_TYPES].code
  if(!id){error(res,'Movimiento inválido.');return}
  try{
    const rows=await db().$queryRaw<Array<{nombre:string;mime:string;contenido:Uint8Array}>>`
      SELECT f.nombre,f.mime,f.contenido FROM fin_comprobante f JOIN fin_movimiento m ON m.id=f.movimiento_id
      JOIN fin_cuenta c ON c.id=m.cuenta_id WHERE m.id=${id} AND c.tipo=${tipo}`
    if(!rows.length){error(res,'Comprobante no encontrado.',404);return}
    res.setHeader('Content-Type',rows[0].mime)
    res.setHeader('Content-Disposition',`attachment; filename="${rows[0].nombre}"`)
    res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff')
    res.end(Buffer.from(rows[0].contenido))
  }catch(e){next(e)}
})

// Formatos basados en los cuatro documentos institucionales, sin copiar sus datos privados.
async function exportLedger(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction, format: 'xlsx'|'pdf') {
  const id = positiveId(req.params.id)
  const tipoRuta = req.params.tipo as keyof typeof FIN_TYPES
  const tipo = FIN_TYPES[tipoRuta].code
  const period = parsePeriod(req.query.mes)
  if (!id || !period) {error(res,'Cuenta o mes inválido.'); return}
  try {
    const cuenta = await readAccount(id,tipo)
    if (!cuenta) {error(res,'Cuenta no encontrada.',404); return}
    const [{rowsCount}] = await db().$queryRaw<Array<{rowsCount:number}>>`
      SELECT COUNT(*)::int AS "rowsCount" FROM fin_movimiento WHERE cuenta_id=${id} AND fecha >= ${period.start}::date AND fecha < ${period.end}::date`
    if (rowsCount > 5000) {error(res,'Este mes supera el máximo de exportación. Divide el período o solicita una exportación ampliada.',413); return}
    const rows = await db().$queryRaw<StatementMovement[]>`
      SELECT m.id,m.fecha::text,m.tipo,m.importe::text,m.descripcion,m.referencia,m.beneficiario,
        cat.nombre AS categoria,s.id AS "subcuentaId",s.nombre AS subcuenta,
        m.traslado_id::text AS "trasladoId",m.anulado_en::text AS "anuladoEn"
      FROM fin_movimiento m
      LEFT JOIN fin_categoria cat ON cat.id=m.categoria_id
      LEFT JOIN fin_subcuenta s ON s.id=m.subcuenta_id
      WHERE m.cuenta_id=${id} AND m.fecha>=${period.start}::date AND m.fecha<${period.end}::date
      ORDER BY m.fecha,m.id LIMIT 5001`
    const [previous] = await db().$queryRaw<Array<{saldo:string}>>`
      SELECT (c.saldo_inicial + COALESCE((SELECT SUM(s.saldo_inicial) FROM fin_subcuenta s WHERE s.cuenta_id=c.id),0)
        + COALESCE((SELECT SUM(CASE WHEN m.tipo='INGRESO' THEN m.importe ELSE -m.importe END)
         FROM fin_movimiento m WHERE m.cuenta_id=c.id AND m.anulado_en IS NULL AND m.fecha < ${period.start}::date),0))::text AS saldo
      FROM fin_cuenta c WHERE c.id=${id}`
    let subaccounts:StatementSubaccount[]=[]
    if (tipo==='FONDO_MEDICO') {
      subaccounts = await db().$queryRaw<StatementSubaccount[]>`
        SELECT s.id,s.nombre,s.saldo_inicial::text AS "saldoInicial",
        (s.saldo_inicial + COALESCE((SELECT SUM(CASE WHEN m.tipo='INGRESO' THEN m.importe ELSE -m.importe END)
         FROM fin_movimiento m WHERE m.subcuenta_id=s.id AND m.anulado_en IS NULL AND m.fecha < ${period.start}::date),0))::text AS "saldoAnterior"
        FROM fin_subcuenta s WHERE s.cuenta_id=${id} ORDER BY s.nombre,s.id`
    }
    const kind = tipoRuta as 'bancos'|'caja-chica'|'fondos-medicos'
    const bytes = format==='pdf' ? makeLedgerPdf(kind,period.month,cuenta,previous.saldo,rows,subaccounts)
      : Buffer.from(await makeLedgerWorkbook(kind,period.month,cuenta,previous.saldo,rows,subaccounts).xlsx.writeBuffer())
    const filename = {bancos:'Libro_Auxiliar_Bancos','caja-chica':'Liquidacion_Caja_Chica','fondos-medicos':'Control_Cuenta_Medica'}[kind]
    sendFinancialFile(res,bytes,`${filename}_${period.month}.${format}`,format)
  } catch(e) {next(e)}
}
financeRouter.get('/:tipo/cuentas/:id/export.xlsx', (req,res,next)=>void exportLedger(req,res,next,'xlsx'))
financeRouter.get('/:tipo/cuentas/:id/export.pdf', (req,res,next)=>void exportLedger(req,res,next,'pdf'))
