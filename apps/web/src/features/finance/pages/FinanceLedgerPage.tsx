import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Building2, CalendarDays, Download, FileText, Plus, RefreshCw, X } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/AuthProvider'
import { isDireccionGeneral } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cancelMovement, createAccount, createMovement, createSubaccount, createTransfer, download, getAccount, getAccounts, getCategories, getLedger, uploadProof } from '../services/financeApi'
import type { Account, Category, FinanceType, Ledger, Subaccount } from '../services/financeApi'

const TYPES: Record<FinanceType,{title:string; singular:string; detail:string}> = {
  bancos: {title:'Bancos',singular:'Cuenta bancaria',detail:'Ingresos, egresos y saldos por cuenta'},
  'caja-chica':{title:'Caja chica',singular:'Fondo de caja chica',detail:'Gastos, reposiciones y liquidación del período'},
  'fondos-medicos':{title:'Fondos médicos',singular:'Fondo médico',detail:'Abonos y gastos por subcuenta'},
}
const input='w-full min-h-11 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white'
const money=(n:string|number)=>new Intl.NumberFormat('es-GT',{style:'currency',currency:'GTQ'}).format(Number(n))
const currentMonth=()=>new Date().toISOString().slice(0,7)
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Guatemala'})
const emptyMovement=()=>({fecha:today(),tipo:'EGRESO',importe:'',descripcion:'',referencia:'',beneficiario:'',categoriaId:'',subcuentaId:''})
const emptyAccount=()=>({nombre:'',referencia:'',saldoInicial:'0',fechaApertura:today()})
const firstLine=(v:unknown)=>v instanceof Error?v.message:'No fue posible completar la operación.'

export default function FinanceLedgerPage({tipo}:{tipo:FinanceType}){
  const config=TYPES[tipo]
  const {usuario}=useAuth();const online=useOnlineStatus()
  const canWrite=Boolean(usuario && (isDireccionGeneral(usuario)||usuario.permisos.includes('FINANZAS_WRITE')))
  const canCancel=Boolean(usuario && (isDireccionGeneral(usuario)||usuario.permisos.includes('FINANZAS_ANULAR')))
  const [accounts,setAccounts]=useState<Account[]>([])
  const [accountId,setAccountId]=useState<number|null>(null)
  const [detail,setDetail]=useState<(Account&{subcuentas:Subaccount[]})|null>(null)
  const [ledger,setLedger]=useState<Ledger|null>(null)
  const [categories,setCategories]=useState<Category[]>([])
  const [month,setMonth]=useState(currentMonth)
  const [page,setPage]=useState(1)
  const [reload,setReload]=useState(0)
  const [loading,setLoading]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const [accountForm,setAccountForm]=useState(false)
  const [accountDraft,setAccountDraft]=useState(emptyAccount)
  const [subName,setSubName]=useState('')
  const [subOpening,setSubOpening]=useState('0')
  const [movementDraft,setMovementDraft]=useState(emptyMovement)
  const [showTransfer,setShowTransfer]=useState(false)
  const [otherAccounts,setOtherAccounts]=useState<Array<Account&{financeType:FinanceType}>>([])
  const [destination,setDestination]=useState('')
  const [destSubs,setDestSubs]=useState<Subaccount[]>([])
  const [transferAmount,setTransferAmount]=useState('')
  const [transferDate,setTransferDate]=useState(today)
  const [transferSub,setTransferSub]=useState('')
  const [busyDownload,setBusyDownload]=useState(false)
  const [cancelId,setCancelId]=useState<number|null>(null)
  const [cancelReason,setCancelReason]=useState('')
  const availableCategories=useMemo(()=>categories.filter(c=>c.grupo===(movementDraft.tipo==='INGRESO'?'INGRESOS':'GASTOS')),[categories,movementDraft.tipo])
  const refresh=()=>setReload(v=>v+1)

  useEffect(()=>{setAccountId(null);setLedger(null);setDetail(null);setError('');setPage(1)},[tipo])
  useEffect(()=>{
    if(!config || !online)return
    const controller=new AbortController()
    getAccounts(tipo,controller.signal).then(data=>{
      if(controller.signal.aborted)return
      setAccounts(data)
      setAccountId(prev=>data.some(a=>a.id===prev)?prev:data[0]?.id??null)
    }).catch(e=>{if(!controller.signal.aborted)setError(firstLine(e))})
    return()=>controller.abort()
  },[tipo,config,online,reload])
  useEffect(()=>{
    if(!config || !online)return
    getCategories().then(setCategories).catch(()=>{})
  },[tipo,config,online])
  useEffect(()=>{
    if(!accountId||!config||!online){setLedger(null);setDetail(null);return}
    const controller=new AbortController();setLoading(true)
    Promise.all([getAccount(tipo,accountId),getLedger(tipo,accountId,month,page,controller.signal)])
      .then(([a,l])=>{if(!controller.signal.aborted){setDetail(a);setLedger(l)}})
      .catch(e=>{if(!controller.signal.aborted)setError(firstLine(e))})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    return()=>controller.abort()
  },[tipo,accountId,month,page,reload,config,online])

  const submit=async(callback:()=>Promise<unknown>,success:string)=>{
    if(saving||!online)return
    setSaving(true);setError('');setNotice('')
    try{await callback();setNotice(success);refresh()}
    catch(e){setError(firstLine(e))}finally{setSaving(false)}
  }
  const saveAccount=()=>void submit(async()=>{
    const result=await createAccount(tipo,accountDraft)
    setAccountId(result.id);setAccountDraft(emptyAccount());setAccountForm(false)
  },'Cuenta creada.')
  const saveSubaccount=()=>{if(!accountId)return;void submit(async()=>{
    await createSubaccount(accountId,{nombre:subName,saldoInicial:subOpening})
    setSubName('');setSubOpening('0')
  },'Subcuenta creada.')}
  const saveMovement=()=>{if(!accountId)return;void submit(async()=>{
    await createMovement(tipo,accountId,{...movementDraft,categoriaId:Number(movementDraft.categoriaId),subcuentaId:tipo==='fondos-medicos'?Number(movementDraft.subcuentaId):null})
    setMovementDraft(emptyMovement());setPage(1)
  },'Movimiento registrado.')}
  const confirmCancel=async()=>{
    if(cancelId===null||!cancelReason.trim()||saving)return
    setSaving(true);setError('');setNotice('')
    try {
      await cancelMovement(tipo,cancelId,cancelReason.trim())
      setCancelId(null);setCancelReason('');setNotice('Movimiento anulado.');refresh()
    }catch(e){setError(firstLine(e))}finally{setSaving(false)}
  }
  const proof=async(id:number,file:File|null)=>{
    if(!file)return
    if(file.size>5*1024*1024||!['application/pdf','image/jpeg','image/png'].includes(file.type)){setError('Selecciona un PDF, JPG o PNG de hasta 5 MB.');return}
    await submit(()=>uploadProof(tipo,id,file),'Comprobante guardado de forma privada.')
  }
  const downloadLedger=async(format:'xlsx'|'pdf')=>{
    if(!accountId)return;setBusyDownload(true);setError('')
    const name={bancos:'Libro_Auxiliar_Bancos','caja-chica':'Liquidacion_Caja_Chica','fondos-medicos':'Control_Cuenta_Medica'}[tipo]
    try{await download(`/${tipo}/cuentas/${accountId}/export.${format}?mes=${month}`,`${name}_${month}.${format}`)}
    catch(e){setError(firstLine(e))}finally{setBusyDownload(false)}
  }
  const loadTransfers=async()=>{
    setShowTransfer(v=>!v)
    if(showTransfer || !online)return
    const results=await Promise.allSettled((Object.keys(TYPES) as FinanceType[]).map(t=>getAccounts(t).then(arr=>arr.filter(a=>a.activo).map(a=>({...a,financeType:t})))) )
    setOtherAccounts(results.flatMap(r=>r.status==='fulfilled'?r.value:[]))
  }
  const destinationAccount=otherAccounts.find(a=>String(a.id)===destination)
  const loadDestination=useCallback(async(id:string)=>{
    setDestination(id);setDestSubs([]);setTransferSub('')
    const dest=otherAccounts.find(a=>String(a.id)===id)
    if(dest?.financeType==='fondos-medicos'){
      try{setDestSubs((await getAccount(dest.financeType,dest.id)).subcuentas)}catch(e){setError(firstLine(e))}
    }
  },[otherAccounts])
  const saveTransfer=()=>{if(!accountId||!destinationAccount)return
    void submit(async()=>{
      await createTransfer({origenId:accountId,destinoId:destinationAccount.id,
        subcuentaOrigenId:tipo==='fondos-medicos'?Number(movementDraft.subcuentaId)||null:null,
        subcuentaDestinoId:destinationAccount.financeType==='fondos-medicos'?Number(transferSub)||null:null,
        importe:transferAmount,fecha:transferDate})
      setTransferAmount('');setShowTransfer(false)
    },'Transferencia interna registrada en ambas cuentas.')
  }
  if(!config)return <main className="p-6">Apartado no disponible.</main>
  return <main className="dashboard-page-enter mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
    <PageMeta title={`${config.title} | Control financiero`} description={config.detail}/>
    <PageHeader title={config.title} description={config.detail} actions={<Button variant="secondary" disabled={!online} onClick={refresh}><RefreshCw size={16}/> Actualizar</Button>}/>
    {!online && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Conéctate para consultar movimientos financieros.</p>}
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice&&<p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <Card>
      <CardHeader title="Cuentas" actions={canWrite?<Button size="sm" onClick={()=>setAccountForm(v=>!v)}><Plus size={16}/> Nueva cuenta</Button>:undefined}/>
      <CardBody className="space-y-4">
        {accountForm&&<form className="grid gap-3 rounded-xl border border-brand-200 bg-brand-50/30 p-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();saveAccount()}}>
          <label className="space-y-1 text-sm">Nombre de cuenta<input required maxLength={100} className={input} value={accountDraft.nombre} onChange={e=>setAccountDraft(v=>({...v,nombre:e.target.value}))}/></label>
          <label className="space-y-1 text-sm">Referencia (opcional, últimos dígitos)<input maxLength={40} className={input} value={accountDraft.referencia} onChange={e=>setAccountDraft(v=>({...v,referencia:e.target.value}))}/></label>
          <label className="space-y-1 text-sm">Saldo inicial (Q)<input required type="number" min="0" step="0.01" className={input} disabled={tipo==='fondos-medicos'} value={accountDraft.saldoInicial} onChange={e=>setAccountDraft(v=>({...v,saldoInicial:e.target.value}))}/></label>
          <label className="space-y-1 text-sm">Fecha de apertura<input required type="date" className={input} value={accountDraft.fechaApertura} onChange={e=>setAccountDraft(v=>({...v,fechaApertura:e.target.value}))}/></label>
          <div className="sm:col-span-2 flex gap-2"><Button disabled={saving} type="submit">Guardar cuenta</Button><Button type="button" variant="secondary" onClick={()=>setAccountForm(false)}><X size={16}/> Cancelar</Button></div>
        </form>}
        {!accounts.length?<p className="text-sm text-gray-500">Todavía no hay cuentas registradas en este apartado.</p>:<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{accounts.map(account=><button type="button" key={account.id} onClick={()=>{setAccountId(account.id);setPage(1);setMovementDraft(emptyMovement())}} className={`rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm motion-reduce:transform-none ${accountId===account.id?'border-brand-400 bg-brand-50/40':'border-gray-200 hover:border-brand-200 dark:border-gray-700'}`}>
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold dark:text-white"><Building2 size={16}/>{account.nombre}</span>
          <span className="block text-xs text-gray-500">Saldo registrado</span><strong className="mt-1 block text-xl dark:text-white">{money(account.saldo)}</strong>
          <span className="mt-2 block text-xs text-gray-500">{account.movimientos} movimientos {account.referencia?'· Ref. '+account.referencia:''}</span>
        </button>)}</div>}
      </CardBody>
    </Card>
    {detail&&accountId&&<>
      {tipo==='fondos-medicos'&&<Card><CardHeader title="Subcuentas médicas" description="Saldos separados por persona"/>
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{detail.subcuentas.map(s=><div key={s.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"><p className="text-sm font-medium dark:text-white">{s.nombre}</p><strong className="mt-1 block dark:text-white">{money(s.saldo)}</strong></div>)}</div>
          {canWrite&&<form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={e=>{e.preventDefault();saveSubaccount()}}>
            <label className="flex-1 space-y-1 text-sm">Nueva subcuenta<input required maxLength={100} className={input} value={subName} onChange={e=>setSubName(e.target.value)}/></label>
            <label className="w-full space-y-1 text-sm sm:w-40">Saldo inicial Q<input type="number" min="0" step="0.01" className={input} value={subOpening} onChange={e=>setSubOpening(e.target.value)}/></label>
            <Button type="submit" disabled={saving}><Plus size={16}/> Agregar</Button>
          </form>}
        </CardBody>
      </Card>}
      {canWrite&&<Card><CardHeader title="Registrar movimiento" description="Los importes se guardan en quetzales; cada registro conserva su fecha y referencia."/>
        <CardBody>
          <form onSubmit={e=>{e.preventDefault();saveMovement()}} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1 text-sm">Tipo<select className={input} value={movementDraft.tipo} onChange={e=>setMovementDraft(v=>({...v,tipo:e.target.value,categoriaId:''}))}><option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option></select></label>
            <label className="space-y-1 text-sm">Fecha<input type="date" required className={input} value={movementDraft.fecha} onChange={e=>setMovementDraft(v=>({...v,fecha:e.target.value}))}/></label>
            <label className="space-y-1 text-sm">Importe (Q)<input type="number" min="0.01" step="0.01" required className={input} value={movementDraft.importe} onChange={e=>setMovementDraft(v=>({...v,importe:e.target.value}))}/></label>
            <label className="space-y-1 text-sm">Categoría<select required className={input} value={movementDraft.categoriaId} onChange={e=>setMovementDraft(v=>({...v,categoriaId:e.target.value}))}><option value="">Seleccionar</option>{availableCategories.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
            {tipo==='fondos-medicos'&&<label className="space-y-1 text-sm">Subcuenta<select required className={input} value={movementDraft.subcuentaId} onChange={e=>setMovementDraft(v=>({...v,subcuentaId:e.target.value}))}><option value="">Seleccionar</option>{detail.subcuentas.filter(s=>s.activa).map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>}
            <label className="space-y-1 text-sm">Número de documento<input className={input} maxLength={80} value={movementDraft.referencia} onChange={e=>setMovementDraft(v=>({...v,referencia:e.target.value}))}/></label>
            <label className="space-y-1 text-sm">Beneficiario{tipo==='bancos'?' *':''}<input required={tipo==='bancos'} className={input} maxLength={120} value={movementDraft.beneficiario} onChange={e=>setMovementDraft(v=>({...v,beneficiario:e.target.value}))}/></label>
            <label className="space-y-1 text-sm sm:col-span-2 xl:col-span-3">Descripción<textarea required rows={4} className={`${input} min-h-28 resize-y leading-relaxed`} maxLength={500} value={movementDraft.descripcion} onChange={e=>setMovementDraft(v=>({...v,descripcion:e.target.value}))} placeholder="Describe el movimiento con todos los detalles necesarios"/></label>
            <div className="flex items-end"><Button type="submit" disabled={saving||!online}><Plus size={16}/> Guardar movimiento</Button></div>
          </form>
          <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
            <Button variant="ghost" type="button" size="sm" onClick={()=>void loadTransfers()}><ArrowLeftRight size={16}/> Transferencia interna</Button>
            {showTransfer&&<form onSubmit={e=>{e.preventDefault();saveTransfer()}} className="mt-3 grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm">Cuenta destino<select required className={input} value={destination} onChange={e=>void loadDestination(e.target.value)}><option value="">Seleccionar</option>{otherAccounts.filter(a=>a.id!==accountId).map(a=><option key={a.financeType+a.id} value={a.id}>{a.nombre} · {TYPES[a.financeType].title}</option>)}</select></label>
              {tipo==='fondos-medicos'&&<label className="space-y-1 text-sm">Subcuenta origen<select required className={input} value={movementDraft.subcuentaId} onChange={e=>setMovementDraft(v=>({...v,subcuentaId:e.target.value}))}><option value="">Seleccionar</option>{detail.subcuentas.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>}
              {destinationAccount?.financeType==='fondos-medicos'&&<label className="space-y-1 text-sm">Subcuenta destino<select required className={input} value={transferSub} onChange={e=>setTransferSub(e.target.value)}><option value="">Seleccionar</option>{destSubs.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>}
              <label className="space-y-1 text-sm">Importe (Q)<input required type="number" min="0.01" step="0.01" className={input} value={transferAmount} onChange={e=>setTransferAmount(e.target.value)}/></label>
              <label className="space-y-1 text-sm">Fecha<input required type="date" className={input} value={transferDate} onChange={e=>setTransferDate(e.target.value)}/></label>
              <div className="sm:col-span-2 flex justify-end"><Button type="submit" disabled={saving||!destinationAccount}>Registrar transferencia</Button></div>
            </form>}
          </div>
        </CardBody>
      </Card>}
      <Card>
        <CardHeader title="Movimientos" actions={<div className="flex flex-wrap gap-2"><label className="flex items-center gap-2 text-xs text-gray-500"><CalendarDays size={16}/> Mes<input aria-label="Mes del libro" className={input} type="month" value={month} onChange={e=>{setMonth(e.target.value);setPage(1)}}/></label><Button variant="secondary" size="sm" onClick={()=>void downloadLedger('xlsx')} disabled={!online||busyDownload}><Download size={16}/> Excel</Button><Button variant="secondary" size="sm" onClick={()=>void downloadLedger('pdf')} disabled={!online||busyDownload}><FileText size={16}/> PDF</Button></div>}/>
        <CardBody className="space-y-3">
          {ledger&&<div className="grid gap-3 sm:grid-cols-3">{[{label:'Saldo anterior',value:money(ledger.saldoAnterior)},{label:'Ingresos del mes',value:money(ledger.resumen.ingresos)},{label:'Egresos del mes',value:money(ledger.resumen.egresos)}].map(s=><div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800" key={s.label}><p className="text-xs text-gray-500">{s.label}</p><strong className="text-lg dark:text-white">{s.value}</strong></div>)}</div>}
          {loading?<p className="text-sm text-gray-500">Cargando…</p>:!ledger?.movimientos.length?<p className="py-6 text-center text-sm text-gray-500">Sin movimientos en este período.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b text-xs text-gray-500"><th className="py-3">Fecha</th><th>Movimiento</th><th>Detalle</th><th className="text-right">Importe</th><th className="text-right">Acciones</th></tr></thead><tbody>{ledger.movimientos.map(m=><tr key={m.id} className={`border-b border-gray-100 dark:border-gray-800 ${m.anuladoEn?'opacity-60':''}`}><td className="py-3">{m.fecha}</td><td><span className={`rounded-full px-2 py-1 text-xs ${m.tipo==='INGRESO'?'bg-green-50 text-green-700':'bg-amber-50 text-amber-700'}`}>{m.trasladoId?'Transferencia':m.tipo==='INGRESO'?'Ingreso':'Egreso'}</span>{m.anuladoEn&&<span className="ml-2 text-xs text-red-600">Anulado</span>}</td><td><span className="block max-w-sm whitespace-pre-wrap break-words font-medium leading-relaxed dark:text-white" title={m.descripcion}>{m.descripcion}</span><span className="text-xs text-gray-500">{m.categoria??m.subcuenta??m.referencia??'—'}</span></td><td className="text-right font-medium">{money(m.importe)}</td><td className="space-x-2 py-2 text-right">{m.tieneComprobante?<button className="text-brand-600 underline" type="button" onClick={()=>void download(`/${tipo}/movimientos/${m.id}/comprobante`,`Comprobante_${m.id}`)}>Archivo</button>:canWrite&&!m.anuladoEn?<label className="inline-flex cursor-pointer items-center gap-1 text-brand-600"><FileText size={15}/> Adjuntar<input type="file" className="sr-only" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>void proof(m.id,e.target.files?.[0]??null)}/></label>:null}{canCancel&&!m.anuladoEn&&<button type="button" className="text-red-600 underline" onClick={()=>{setCancelId(m.id);setCancelReason('');setError('')}}>Anular</button>}</td></tr>)}</tbody></table></div>}
          {ledger&&ledger.paginas>1&&<div className="flex items-center justify-end gap-3"><Button variant="secondary" size="sm" disabled={page<=1} onClick={()=>setPage(v=>v-1)}>Anterior</Button><span className="text-xs text-gray-500">{page}/{ledger.paginas}</span><Button variant="secondary" size="sm" disabled={page>=ledger.paginas} onClick={()=>setPage(v=>v+1)}>Siguiente</Button></div>}
        </CardBody>
      </Card>
    </>}
    <Dialog open={cancelId!==null} title="Anular movimiento" description="El movimiento permanecerá en el historial." onClose={()=>{if(!saving){setCancelId(null);setCancelReason('')}}}
      actions={<><Button variant="secondary" type="button" disabled={saving} onClick={()=>{setCancelId(null);setCancelReason('')}}>Volver</Button><Button variant="danger" type="button" disabled={saving||!cancelReason.trim()||cancelReason.trim().length>300} onClick={()=>void confirmCancel()}>Confirmar anulación</Button></>}>
      <label className="block space-y-2 text-sm font-medium text-gray-800 dark:text-gray-100">Motivo de la anulación
        <textarea autoFocus rows={3} required maxLength={300} className={input} value={cancelReason} onChange={e=>setCancelReason(e.target.value)} placeholder="Indica el motivo"/>
      </label>
      {error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </Dialog>
  </main>
}
