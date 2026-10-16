import '../visits.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { RefreshCw, Search } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Button from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import VisitDetailDialog from '@/features/visits/components/VisitDetailDialog'
import { getVisitList, syncPendingVisits, type VisitListItem } from '@/features/visits/services/visitService'

const card = 'rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'
const statusName = (item: VisitListItem) => item.syncStatus && item.syncStatus !== 'synced'
  ? item.syncStatus === 'failed' ? 'Error de sincronización' : 'Pendiente de sincronización'
  : item.status === 'PROGRAMADA' ? 'Programada' : 'Realizada'

export default function VisitHistoryPage() {
  const { usuario } = useAuth()
  const [rows, setRows] = useState<VisitListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [local, setLocal] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('TODAS')
  const [selected, setSelected] = useState<VisitListItem | null>(null)
  const refresh = useCallback(async () => {
    if (!usuario) { setLoading(false); return }
    setLoading(true)
    try {
      // Reintenta las operaciones pendientes o fallidas antes de refrescar el historial.
      await syncPendingVisits(usuario.id)
      const result = await getVisitList(usuario.id)
      setRows(result.items); setLocal(result.local); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial.') }
    finally { setLoading(false) }
  }, [usuario])
  useEffect(()=>{ void refresh() },[refresh])
  useEffect(()=>{ const onFocus=()=>{void refresh()}; window.addEventListener('focus',onFocus); return ()=>window.removeEventListener('focus',onFocus) },[refresh])
  const visible = useMemo(()=>rows.filter(row=>{
    const term=search.trim().toLocaleLowerCase('es')
    if(term && !`${row.familyName} ${row.community}`.toLocaleLowerCase('es').includes(term)) return false
    if(filter==='PENDIENTES') return row.syncStatus==='pending'||row.syncStatus==='syncing'||row.syncStatus==='failed'
    if(filter==='PROGRAMADA'||filter==='REALIZADA') return row.status===filter
    return true
  }),[rows,search,filter])
  const completed = rows.filter(row=>row.status==='REALIZADA').length
  const upcoming = rows.filter(row=>row.status==='PROGRAMADA').length
  const pending = rows.filter(row=>row.syncStatus && !['synced'].includes(row.syncStatus)).length
  return <div className="visits-enter">
    <PageMeta title="Historial de visitas | Viviendas León" description="Registro de visitas técnicas" />
    <PageHeader title="Historial de visitas" description="" actions={<Link to="/visitas/nueva" className="inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600">+ Registrar visita</Link>} />
    {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
    {local && !error && <p className="mb-3 text-xs font-medium text-amber-700 dark:text-amber-300">Mostrando datos guardados en este dispositivo</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      {[['Visitas realizadas',completed],['Programadas',upcoming],['Pendientes de sincronizar',pending]].map(([title,count])=><div key={title} className={`${card} p-5`}><p className="text-sm text-gray-500 dark:text-gray-400">{title}</p><p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{count}</p></div>)}
    </div>
    <section className={card} aria-label="Registro de visitas">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800"><h2 className="font-semibold text-gray-900 dark:text-white">Registro de visitas</h2><Button size="sm" variant="secondary" type="button" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={15}/> Actualizar</Button></header>
      <div className="grid gap-3 p-5 md:grid-cols-[1fr_220px]">
        <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900"><Search size={17} className="text-gray-400"/><input aria-label="Buscar por familia o comunidad" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar familia o comunidad" className="h-11 min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none dark:text-white"/></label>
        <select aria-label="Filtrar por estado" value={filter} onChange={e=>setFilter(e.target.value)} className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"><option value="TODAS">Todos los estados</option><option value="REALIZADA">Realizadas</option><option value="PROGRAMADA">Programadas</option><option value="PENDIENTES">Pendientes de sincronizar</option></select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[690px] text-left text-sm"><thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800/40"><tr><th className="px-5 py-3">Familia</th><th className="px-5 py-3">Comunidad</th><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Detalle</th></tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {visible.map(row=>{ const key=row.operationId??`visit-${row.id}`; return <tr key={key} className="align-top text-gray-700 dark:text-gray-300"><td className="px-5 py-4 font-medium text-gray-900 dark:text-white">{row.familyName}</td><td className="px-5 py-4">{row.community}</td><td className="px-5 py-4">{new Date(`${row.date}T12:00:00`).toLocaleDateString('es-GT')}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.syncStatus && row.syncStatus!=='synced' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200' : 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-200'}`}>{statusName(row)}</span></td><td className="px-5 py-4"><button type="button" onClick={()=>setSelected(row)} className="text-sm font-semibold text-brand-600 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-brand-400">Ver detalle</button></td></tr> })}
        </tbody></table>
        {!loading && visible.length===0 && <div className="px-5 py-14 text-center text-sm text-gray-500">No se encontraron visitas</div>}
        {loading && <div className="px-5 py-14 text-center text-sm text-gray-500">Cargando visitas…</div>}
      </div>
      <footer className="border-t border-gray-200 px-5 py-4 text-xs text-gray-500 dark:border-gray-800">{visible.length} visita(s)</footer>
    </section>
    <VisitDetailDialog key={selected?.operationId ?? selected?.id ?? 'none'} visit={selected} onClose={() => setSelected(null)} />
  </div>
}
