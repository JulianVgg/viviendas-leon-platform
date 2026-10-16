import '../visits.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, CheckCheck, ChevronLeft, ChevronRight, ClipboardList, Clock3, Edit3, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import Dialog from '@/components/ui/Dialog'
import ScheduleVisitDialog from '@/features/visits/components/ScheduleVisitDialog'
import PageMeta from '@/components/common/PageMeta'
import Button from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import RescheduleVisitDialog from '@/features/visits/components/RescheduleVisitDialog'
import FollowUpEditDialog from '@/features/visits/components/FollowUpEditDialog'
import VisitDetailDialog from '@/features/visits/components/VisitDetailDialog'
import { getVisitFollowUps, getVisitList, syncPendingVisits, type VisitFollowUp, type VisitListItem } from '@/features/visits/services/visitService'

const monthLabels = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const weekdays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-GT',{ day:'numeric', month:'short', year:'numeric' })
const card = 'rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'
const visitKey = (visit: VisitListItem) => visit.operationId ?? `visit-${visit.id}`
type Reminder = { key: string; date: string | null; sortDate: string; family: string; description: string; type: 'visit' | 'followup'; visit?: VisitListItem; followup?: VisitFollowUp }
type CalendarEvent = { key: string; label: string; kind: 'visit' | 'followup'; visit?: VisitListItem; followup?: VisitFollowUp }

export default function VisitAgendaPage() {
  const { usuario } = useAuth()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [items, setItems] = useState<VisitListItem[]>([])
  const [followups, setFollowups] = useState<VisitFollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [local, setLocal] = useState(false)
  const [selected, setSelected] = useState<VisitListItem | null>(null)
  const [editing, setEditing] = useState<VisitFollowUp | null>(null)
  const [rescheduling, setRescheduling] = useState<VisitListItem | null>(null)
  const [slide, setSlide] = useState(0)
  const [schedulingDate, setSchedulingDate] = useState<string | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const carousel = useRef<HTMLDivElement>(null)
  const today = dateKey(new Date())

  const refresh = useCallback(async () => {
    if (!usuario) { setLoading(false); return }
    setLoading(true)
    try {
      await syncPendingVisits(usuario.id)
      const [visits, pending] = await Promise.all([getVisitList(usuario.id), getVisitFollowUps(usuario.id)])
      setItems(visits.items); setFollowups(pending.items); setLocal(visits.local || pending.local); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar la agenda.') }
    finally { setLoading(false) }
  }, [usuario])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const byDate = useMemo(() => {
    const map = new Map<string, VisitListItem[]>()
    for (const item of items) map.set(item.date, [...(map.get(item.date) ?? []), item])
    return map
  }, [items])
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const [day, visits] of byDate) {
      map.set(day, visits.map(visit => ({ key: `visit-${visitKey(visit)}`, label: visit.familyName, kind: 'visit', visit })))
    }
    for (const followup of followups) {
      if (followup.status === 'CUMPLIDO' || !followup.due) continue
      const list = map.get(followup.due) ?? []
      list.push({ key: `followup-${followup.id}`, label: followup.text, kind: 'followup', followup })
      map.set(followup.due, list)
    }
    return map
  }, [byDate, followups])
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const size = Math.ceil((offset + new Date(month.getFullYear(), month.getMonth()+1,0).getDate()) / 7) * 7
    return Array.from({ length:size }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index-offset+1)
      return { key: dateKey(date), date:date.getDate(), currentMonth:date.getMonth() === month.getMonth() }
    })
  }, [month])
  const reminders = useMemo<Reminder[]>(() => {
    const scheduled: Reminder[] = items.filter(v => v.status === 'PROGRAMADA' && v.date >= today).map(v => ({
      key:visitKey(v),date:v.date,sortDate:v.date,family:v.familyName,description:`Visita programada · ${v.community}${v.capture?.timeSlot ? ` · ${v.capture.timeSlot === 'MANANA' ? 'Mañana' : 'Tarde'}` : ''}`,type:'visit',visit:v,
    }))
    const followUpReminders: Reminder[] = followups.filter(f => f.status !== 'CUMPLIDO').map(f => ({
      key:f.id,date:f.due, sortDate:f.due ?? '9999-12-31', family:f.familyName,
      description:f.text,type:'followup',followup:f,
    }))
    // Los seguimientos vencidos siguen visibles: no desaparecen al pasar la fecha.
    return [...scheduled,...followUpReminders].sort((a,b) => a.sortDate.localeCompare(b.sortDate)).slice(0,24)
  }, [items,followups,today])
  const pendingCount = followups.filter(f => f.status !== 'CUMPLIDO').length
  const detailsFollowUps = selected ? followups.filter(f => f.familyId === selected.familyId && (f.status !== 'CUMPLIDO' || f.sourceVisitId === selected.id)) : []
  const move = (n: number) => setMonth(prev => new Date(prev.getFullYear(), prev.getMonth()+n,1))
  const scrollToReminder = (index: number) => {
    const root = carousel.current
    const element = root?.querySelectorAll<HTMLElement>('[data-reminder]')[index]
    if (root && element) { root.scrollTo({ top: element.offsetTop - root.offsetTop, behavior: 'smooth' }); setSlide(index) }
  }
  const openFollowUp = (f: VisitFollowUp) => { setSelected(null); setEditing(f) }
  const openReschedule = (v: VisitListItem) => { setSelected(null); setRescheduling(v) }
  return <div className="visits-enter">
    <PageMeta title="Agenda de visitas | Viviendas León" description="Agenda y compromisos de visitas técnicas" />
    <PageHeader title="Agenda de visitas" description="" />
    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">Haz doble clic en un día vacío para agendar una visita. En teléfono o con teclado, pulsa el número del día. Cada casilla muestra hasta tres registros.</p>
    {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
    {local && !error && <p className="mb-3 text-xs font-medium text-amber-700 dark:text-amber-300">Mostrando datos guardados en este dispositivo. Editar pendientes requiere conexión.</p>}
    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand-500"/>Programada</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500"/>Realizada</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500"/>Seguimiento pendiente ({pendingCount})</span>
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className={card} aria-label="Calendario de visitas">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 dark:border-gray-800 md:px-6">
          <div className="flex items-center gap-3"><CalendarDays size={20} className="text-brand-500"/><h2 className="text-base font-semibold capitalize text-gray-900 dark:text-white">{monthLabels[month.getMonth()]} {month.getFullYear()}</h2></div>
          <div className="flex items-center gap-2"><Button type="button" size="sm" variant="secondary" onClick={()=>move(-1)} aria-label="Mes anterior"><ChevronLeft size={16}/></Button>
            <Button type="button" size="sm" variant="secondary" onClick={()=>setMonth(new Date(new Date().getFullYear(),new Date().getMonth(),1))}>Hoy</Button>
            <Button type="button" size="sm" variant="secondary" onClick={()=>move(1)} aria-label="Mes siguiente"><ChevronRight size={16}/></Button></div>
        </header>
        <div className="overflow-x-auto"><div className="min-w-[560px]">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">{weekdays.map(day=><span key={day} className="py-3">{day}</span>)}</div>
          <div className="grid grid-cols-7">{cells.map((cell,index) => {
            const daily = eventsByDate.get(cell.key) ?? []
            return <div key={cell.key} onDoubleClick={() => setSchedulingDate(cell.key)}
              title={`Doble clic para agendar una visita el ${cell.key}`}
              className={`min-h-28 border-b border-r border-gray-100 p-1.5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 md:min-h-36 ${index%7===0 ? 'border-l border-gray-100 dark:border-gray-800' : ''} ${!cell.currentMonth ? 'bg-gray-50/70 dark:bg-gray-950/30' : ''}`}>
              <button type="button" onClick={() => setSchedulingDate(cell.key)}
                aria-label={`Agendar visita el ${cell.key}`}
                className={`mb-2 inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-500 ${cell.key===today?'bg-brand-500 text-white':cell.currentMonth?'text-gray-800 dark:text-gray-200':'text-gray-400'}`}>{cell.date}</button>
              <div className="space-y-1">
                {daily.slice(0,3).map(event => <button key={event.key} type="button"
                  onClick={() => event.visit ? setSelected(event.visit) : event.followup && openFollowUp(event.followup)}
                  onDoubleClick={e => e.stopPropagation()}
                  title={event.kind === 'visit' ? `Ver visita: ${event.label}` : `Editar seguimiento: ${event.label}`}
                  className={`block w-full truncate rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] font-medium transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-brand-500 ${event.kind==='followup'?'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300':event.visit?.status==='REALIZADA'?'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300':'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200'}`}>
                  {event.kind === 'followup' && <Clock3 size={10} className="mr-1 inline"/>}{event.label}
                </button>)}
                {daily.length > 3 && <button type="button" onClick={() => setExpandedDay(cell.key)}
                  onDoubleClick={e => e.stopPropagation()}
                  className="w-full rounded-md border border-dashed border-gray-300 px-1.5 py-1 text-left text-[11px] font-semibold text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:text-brand-300 dark:hover:bg-brand-500/10">
                  +{daily.length-3} más · Ver todos
                </button>}
              </div>
            </div>
          })}</div>
        </div></div>
      </section>
      <section className={`${card} self-start`} aria-label="Próximas visitas y recordatorios">
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800"><div><h2 className="font-semibold text-gray-900 dark:text-white">Próximas visitas</h2><p className="mt-1 text-xs text-gray-500">Visitas y compromisos por revisar</p></div><Button type="button" variant="ghost" size="sm" onClick={()=>void refresh()} aria-label="Actualizar agenda" disabled={loading}><RefreshCw size={16}/></Button></header>
        <div className="relative flex gap-2 p-4">
          <div ref={carousel} onScroll={event => {
            const root = event.currentTarget
            const sections = root.querySelectorAll<HTMLElement>('[data-reminder]')
            let closest = 0; let distance = Infinity
            sections.forEach((section,i)=> { const d=Math.abs(section.offsetTop-root.offsetTop-root.scrollTop); if(d<distance){closest=i;distance=d} })
            setSlide(closest)
          }} className="custom-scrollbar max-h-[450px] min-w-0 flex-1 snap-y snap-mandatory space-y-3 overflow-y-auto overscroll-contain">
            {loading ? <p className="py-8 text-center text-sm text-gray-500">Cargando…</p> : reminders.length === 0 ? <div className="py-9 text-center text-sm text-gray-500"><CheckCheck className="mx-auto mb-2 text-emerald-500" size={27}/>No hay visitas programadas ni seguimientos abiertos.</div>
            : reminders.map(item => <article key={item.key} data-reminder className="snap-start rounded-xl border border-gray-200 bg-gray-50/30 p-3 dark:border-gray-800 dark:bg-white/5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><span className={`rounded-full px-2 py-1 ${item.type==='visit'?'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300':'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>{item.type==='visit'?'Visita':'Seguimiento'}</span><span className={item.date && item.date<today?'text-rose-600':'text-gray-500'}>{item.date ? dateLabel(item.date) : 'Sin fecha de revisión'}{item.date && item.date<today?' · Vencido':''}</span></div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.family}</p>
              <p className="mt-1 line-clamp-3 text-sm leading-5 text-gray-600 dark:text-gray-300">{item.description}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-brand-600 dark:text-brand-400">
                {item.visit && <><button type="button" onClick={()=>setSelected(item.visit!)} className="hover:underline">Ver detalle →</button>
                  <button type="button" disabled={!item.visit.id || Boolean(item.visit.syncStatus && item.visit.syncStatus !== 'synced')} onClick={()=>openReschedule(item.visit!)} className="hover:underline disabled:cursor-not-allowed disabled:opacity-40">Cambiar fecha</button></>}
                {item.followup && <button type="button" onClick={()=>openFollowUp(item.followup!)} className="inline-flex items-center gap-1 hover:underline"><Edit3 size={13}/> Editar seguimiento</button>}
                <Link to={`/visitas/nueva?familia=${item.visit?.familyId ?? item.followup?.familyId}&fecha=${today}`} className="hover:underline">Registrar visita ↗</Link>
              </div>
            </article>)}
          </div>
          {reminders.length > 1 && <div className="flex shrink-0 flex-col items-center justify-start gap-1.5 pt-2" aria-label="Ir a recordatorio">
            {reminders.slice(0,16).map((item,index)=><button key={item.key} type="button" aria-label={`Ir al recordatorio ${index+1}`} aria-current={slide===index?'true':undefined}
              onClick={()=>scrollToReminder(index)} className={`size-2.5 rounded-full transition-all ${slide===index?'bg-brand-500 ring-2 ring-brand-200':'bg-gray-300 hover:bg-brand-300 dark:bg-gray-600'}`} />)}
            {reminders.length>16 && <span className="text-[10px] text-gray-500">+{reminders.length-16}</span>}
          </div>}
        </div>
        <footer className="flex flex-wrap gap-3 border-t border-gray-200 px-5 py-4 text-xs dark:border-gray-800"><ClipboardList size={16} className="text-amber-500"/><span className="text-gray-600 dark:text-gray-400">{pendingCount} compromiso(s) por revisar</span><Link to="/visitas/historial" className="ml-auto font-medium text-brand-600 hover:underline dark:text-brand-400">Ver historial →</Link></footer>
      </section>
    </div>
    <Dialog open={Boolean(expandedDay)} onClose={() => setExpandedDay(null)} title="Registros del día"
      description={expandedDay ? new Date(`${expandedDay}T12:00:00`).toLocaleDateString('es-GT', {weekday:'long', day:'numeric', month:'long', year:'numeric'}) : undefined}
      className="visit-followup-modal">
      <div className="space-y-2">
        {(expandedDay ? eventsByDate.get(expandedDay) ?? [] : []).map(event => <button type="button" key={event.key}
          onClick={() => { setExpandedDay(null); if (event.visit) setSelected(event.visit); else if (event.followup) openFollowUp(event.followup) }}
          className="flex w-full items-start gap-3 rounded-lg border border-gray-200 p-3 text-left transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-700 dark:hover:bg-gray-800">
          <span className={`mt-1 size-2.5 shrink-0 rounded-full ${event.kind==='followup'?'bg-amber-500':event.visit?.status==='REALIZADA'?'bg-emerald-500':'bg-brand-500'}`}/>
          <span className="min-w-0"><span className="block break-words text-sm font-semibold text-gray-900 dark:text-white">{event.label}</span>
          <span className="mt-1 block text-xs text-gray-500">{event.kind==='followup'?'Seguimiento pendiente':event.visit?.status==='REALIZADA'?'Visita realizada':'Visita programada'} · Abrir detalle</span></span>
        </button>)}
      </div>
    </Dialog>
    <ScheduleVisitDialog date={schedulingDate} onClose={() => setSchedulingDate(null)} onSaved={() => { setSchedulingDate(null); void refresh() }}/>
    <VisitDetailDialog key={selected?.operationId ?? selected?.id ?? 'dialog-visit'} visit={selected} onClose={()=>setSelected(null)} extra={selected ? <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Seguimientos de esta familia</h3>
      {detailsFollowUps.length===0 ? <p className="text-sm text-gray-500">Sin compromisos pendientes.</p> : <div className="space-y-2">{detailsFollowUps.map(f=><div key={f.id} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
        <p className="break-words text-gray-800 dark:text-gray-200">{f.text}</p><p className="mt-1 text-xs text-gray-500">{f.status==='CUMPLIDO'?'Cumplido':f.status==='NO_CUMPLIDO'?'No cumplido':'Pendiente'}{f.due?` · ${dateLabel(f.due)}`:''}</p>
        <button type="button" onClick={()=>openFollowUp(f)} className="mt-2 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">Editar seguimiento →</button>
      </div>)}</div>}
      <div className="mt-3 flex flex-wrap gap-4">
        {selected.status === 'PROGRAMADA' && <button type="button" disabled={!selected.id} onClick={()=>openReschedule(selected)} className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-40 dark:text-brand-400">Cambiar fecha programada</button>}
        <Link className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400" to={`/visitas/nueva?familia=${selected.familyId}`}>Registrar siguiente visita ↗</Link>
      </div>
    </section> : undefined}/>
    <RescheduleVisitDialog key={rescheduling?.operationId ?? rescheduling?.id ?? 'dialog-reschedule'} visit={rescheduling} onClose={()=>setRescheduling(null)} onSaved={()=>{setRescheduling(null);void refresh()}}/>
    <FollowUpEditDialog key={editing?.id ?? 'dialog-followup'} item={editing} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null); void refresh()}} />
  </div>
}
