import '../visits.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Button from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import { getVisitList, type VisitListItem } from '@/features/visits/services/visitService'

const monthLabels = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const weekdays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const card = 'rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'

export default function VisitAgendaPage() {
  const { usuario } = useAuth()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [items, setItems] = useState<VisitListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [local, setLocal] = useState(false)
  const today = dateKey(new Date())

  const refresh = useCallback(async () => {
    if (!usuario) { setLoading(false); return }
    setLoading(true)
    try {
      const result = await getVisitList(usuario.id)
      setItems(result.items)
      setLocal(result.local)
      setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar la agenda.') }
    finally { setLoading(false) }
  }, [usuario])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const scheduled = useMemo(() => items.filter(item => item.status === 'PROGRAMADA'), [items])
  const byDate = useMemo(() => {
    const map = new Map<string, VisitListItem[]>()
    for (const item of scheduled) map.set(item.date, [...(map.get(item.date) ?? []), item])
    return map
  }, [scheduled])
  const cells = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
    const offset = (firstDay.getDay() + 6) % 7
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const size = Math.ceil((offset + days) / 7) * 7
    return Array.from({ length: size }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1)
      return { key: dateKey(date), date: date.getDate(), currentMonth: date.getMonth() === month.getMonth() }
    })
  }, [month])
  const upcoming = useMemo(() => scheduled.filter(item => item.date >= today).sort((a,b) => a.date.localeCompare(b.date)).slice(0, 6), [scheduled, today])
  const move = (n: number) => setMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + n, 1))

  return <div className="visits-enter">
    <PageMeta title="Agenda de visitas | Viviendas León" description="Agenda de visitas técnicas" />
    <PageHeader title="Agenda de visitas" description="" actions={<Link to="/visitas/nueva" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-600"><Plus size={16} /> Programar visita</Link>} />
    {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
    {local && !error && <p className="mb-3 text-xs font-medium text-amber-700 dark:text-amber-300">Mostrando datos guardados en este dispositivo</p>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className={card} aria-label="Calendario de visitas">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 dark:border-gray-800 md:px-6">
          <div className="flex items-center gap-3"><CalendarDays size={20} className="text-brand-500"/><h2 className="text-base font-semibold capitalize text-gray-900 dark:text-white">{monthLabels[month.getMonth()]} {month.getFullYear()}</h2></div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={()=>move(-1)} aria-label="Mes anterior"><ChevronLeft size={16}/></Button>
            <Button type="button" size="sm" variant="secondary" onClick={()=>setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hoy</Button>
            <Button type="button" size="sm" variant="secondary" onClick={()=>move(1)} aria-label="Mes siguiente"><ChevronRight size={16}/></Button>
          </div>
        </header>
        <div className="overflow-x-auto"><div className="min-w-[560px]">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
            {weekdays.map(day=><span key={day} className="py-3">{day}</span>)}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell,index) => <div key={cell.key} className={`min-h-28 border-b border-r border-gray-100 p-1.5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 md:min-h-32 ${index%7===0 ? 'border-l border-gray-100 dark:border-gray-800' : ''} ${!cell.currentMonth ? 'bg-gray-50/70 dark:bg-gray-950/30' : ''}`}>
              <Link title={`Programar visita para el ${cell.key}`} to={`/visitas/nueva?fecha=${cell.key}`} className={`mb-2 inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors hover:bg-brand-100 dark:hover:bg-brand-500/20 ${cell.key === today ? 'bg-brand-500 text-white' : cell.currentMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>{cell.date}</Link>
              <div className="space-y-1">
                {(byDate.get(cell.key) ?? []).slice(0,3).map(item=><div key={item.operationId ?? `visit-${item.id}`} className={`truncate rounded-md border-l-[3px] px-1.5 py-1 text-[11px] font-medium ${item.syncStatus && item.syncStatus !== 'synced' ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200' : 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200'}`} title={item.familyName}>{item.familyName}</div>)}
                {(byDate.get(cell.key)?.length ?? 0)>3 && <span className="block px-1 text-[11px] text-gray-500">+{(byDate.get(cell.key)?.length ?? 0)-3} más</span>}
              </div>
            </div>)}
          </div>
        </div></div>
      </section>
      <section className={`${card} self-start`} aria-label="Próximas visitas">
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800"><h2 className="font-semibold text-gray-900 dark:text-white">Próximas visitas</h2><Button type="button" variant="ghost" size="sm" onClick={()=>void refresh()} aria-label="Actualizar visitas" disabled={loading}><RefreshCw size={16}/></Button></header>
        <div className="space-y-2 p-4">
          {loading ? <p className="py-8 text-center text-sm text-gray-500">Cargando…</p> : upcoming.length === 0 ? <div className="py-9 text-center text-sm text-gray-500">No hay visitas programadas</div> : upcoming.map(item=><article key={item.operationId ?? `visit-${item.id}`} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.familyName}</p>
            <p className="mt-1 text-xs text-gray-500">{item.community}</p>
            <p className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-400">{new Date(`${item.date}T12:00:00`).toLocaleDateString('es-GT',{day:'2-digit',month:'short',year:'numeric'})}</p>
            {item.syncStatus && item.syncStatus !== 'synced' && <span className="mt-1 inline-block text-xs text-amber-700 dark:text-amber-300">Pendiente de sincronización</span>}
          </article>)}
        </div>
        <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-800"><Link to="/visitas/historial" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">Ver historial →</Link></div>
      </section>
    </div>
  </div>
}
