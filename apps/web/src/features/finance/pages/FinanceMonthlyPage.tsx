import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { BarChart3, Download, RefreshCw, WalletCards, Landmark, FileSpreadsheet } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { download, request } from '../services/financeApi'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

type Report = {mes:string;preliminar:boolean;ingresos:string;egresos:string;resultado:string;cuentas:Array<{tipo:string;cuentas:number;saldo:string}>;categorias:Array<{grupo:string;categoria:string;ingresos:string;egresos:string;movimientos:number}>;movimientos:Array<{fecha:string;cuenta:string;categoria:string|null;tipo:string;descripcion:string;importe:string}>}
const fmt = (value:string|number)=>new Intl.NumberFormat('es-GT',{style:'currency',currency:'GTQ'}).format(Number(value))
const monthNow=()=>new Date().toISOString().slice(0,7)
export default function FinanceMonthlyPage(){
  const online=useOnlineStatus()
  const [month,setMonth]=useState(monthNow)
  const [report,setReport]=useState<Report|null>(null)
  const [loading,setLoading]=useState(false)
  const [exporting,setExporting]=useState(false)
  const [error,setError]=useState('')
  const [revision,setRevision]=useState(0)
  useEffect(()=>{
    if(!online)return
    let active=true;setLoading(true);setError('')
    request<Report>(`/informe-mensual?mes=${month}`).then(r=>{if(active)setReport(r)}).catch(e=>{if(active){setReport(null);setError(e instanceof Error?e.message:'No se pudo cargar el informe.')}}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[month,revision,online])
  const exportar=async(format:'xlsx'|'pdf')=>{
    setExporting(true);setError('')
    try{await download(`/informe-mensual.${format}?mes=${month}`,`Informe_Financiero_${month}.${format}`)}
    catch(e){setError(e instanceof Error?e.message:'No se pudo exportar.')}
    finally{setExporting(false)}
  }
  return <main className="dashboard-page-enter mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
    <PageMeta title="Informe mensual | Control financiero" description="Ingresos y egresos registrados"/>
    <PageHeader title="Informe mensual" description="Movimientos contables registrados por categoría" actions={<Button variant="secondary" disabled={!online} onClick={()=>setRevision(v=>v+1)}><RefreshCw size={16}/> Actualizar</Button>}/>
    <Card><CardBody className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <label className="space-y-1 text-sm">Mes de consulta<input type="month" className="block min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" value={month} onChange={e=>setMonth(e.target.value)}/></label>
      <div className="flex flex-wrap gap-2"><Button disabled={!online||!report||exporting} onClick={()=>void exportar('xlsx')}><Download size={16}/> {exporting?'Generando…':'Excel'}</Button><Button variant="secondary" disabled={!online||!report||exporting} onClick={()=>void exportar('pdf')}><FileSpreadsheet size={16}/> PDF</Button></div>
    </CardBody></Card>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!online&&<p className="text-sm text-amber-700">Conéctate para consultar el informe.</p>}
    {loading&&<p className="text-sm text-gray-500">Cargando…</p>}
    {report&&<>
      <section aria-label="Resumen financiero" className="grid gap-3 sm:grid-cols-3">{[
        {name:'Ingresos externos',value:report.ingresos,icon:Landmark},
        {name:'Egresos externos',value:report.egresos,icon:WalletCards},
        {name:'Diferencia del mes',value:report.resultado,icon:BarChart3},
      ].map(item=><Card key={item.name}><CardBody><item.icon className="mb-3 text-brand-600" size={22}/><p className="text-sm text-gray-500">{item.name}</p><p className="mt-2 text-xl font-semibold dark:text-white">{fmt(item.value)}</p></CardBody></Card>)}</section>
      <Card><CardHeader title="Ejecución por categoría" description="Movimientos externos registrados durante el mes"/><CardBody>
        {!report.categorias.length?<p className="text-sm text-gray-500">Todavía no hay movimientos para este período.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr className="border-b text-gray-500"><th className="p-2">Categoría</th><th className="p-2 text-right">Ingresos</th><th className="p-2 text-right">Egresos</th></tr></thead><tbody>{report.categorias.map((c,i)=><tr key={`${c.categoria}-${i}`} className="border-b border-gray-100 dark:border-gray-800"><td className="p-2"><span className="block font-medium dark:text-white">{c.categoria}</span><span className="text-xs text-gray-500">{c.movimientos} movimientos</span></td><td className="p-2 text-right">{fmt(c.ingresos)}</td><td className="p-2 text-right">{fmt(c.egresos)}</td></tr>)}</tbody></table></div>}
      </CardBody></Card>
      <Card><CardHeader title="Cuentas y fondos"/><CardBody className="grid gap-3 sm:grid-cols-3">{report.cuentas.map(c=><div key={c.tipo} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"><p className="text-sm text-gray-500">{c.tipo==='BANCO'?'Bancos':c.tipo==='CAJA_CHICA'?'Caja chica':'Fondos médicos'}</p><p className="mt-1 text-lg font-semibold dark:text-white">{fmt(c.saldo)}</p><p className="text-xs text-gray-500">{c.cuentas} cuenta(s)</p></div>)}</CardBody></Card>
      <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-100"><p className="flex items-center gap-2 font-medium"><FileSpreadsheet size={17}/> Informe preliminar</p><p>No incluye transferencias internas como ingresos o egresos externos. Todavía no compara presupuesto contra ejecución ni sustituye conciliaciones bancarias. La automatización presupuestaria será la siguiente etapa.</p><Link to="/auditoria/control-financiero" className="text-brand-600 underline">Consultar ventas agrícolas del sistema</Link></div>
    </>}
  </main>
}
