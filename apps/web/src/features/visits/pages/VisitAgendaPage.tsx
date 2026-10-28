import '../visits.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, CheckCheck, ChevronLeft, ChevronRight, ClipboardList, Clock3, Edit3, RefreshCw, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import Dialog from '@/components/ui/Dialog'
import ScheduleVisitDialog from '@/features/visits/components/ScheduleVisitDialog'
import PageMeta from '@/components/common/PageMeta'
import Button from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import RescheduleVisitDialog from '@/features/visits/components/RescheduleVisitDialog'
import FollowUpEditDialog from '@/features/visits/components/FollowUpEditDialog'
import VisitDetailDialog from '@/features/visits/components/VisitDetailDialog'
import InvitacionDetalleDialog from '@/features/notifications/components/InvitacionDetalleDialog'
import { obtenerMisInvitaciones, type DetalleInvitacion } from '@/features/notifications/services/invitationsService'
import { filtrarAgenda, filtrosIniciales, type FiltrosAgenda } from '@/features/visits/services/personalCalendarFilters'
import { deleteScheduledVisit, getVisitFollowUps, getVisitList, syncPendingVisits, todayInGuatemala, type VisitFollowUp, type VisitListItem } from '@/features/visits/services/visitService'

const monthLabels = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const weekdays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-GT',{ day:'numeric', month:'short', year:'numeric' })
const card = 'rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'
const visitKey = (visit: VisitListItem) => visit.operationId ?? `visit-${visit.id}`
type Reminder = { key: string; date: string | null; sortDate: string; family: string; description: string; type: 'visit' | 'followup' | 'institutional'; visit?: VisitListItem; followup?: VisitFollowUp; invitation?: DetalleInvitacion }
type CalendarEvent = { key: string; label: string; kind: 'visit' | 'followup' | 'visit-history' | 'followup-history' | 'institutional'; visit?: VisitListItem; followup?: VisitFollowUp; movedTo?: string; invitation?: DetalleInvitacion }

export default function VisitAgendaPage() {
  const { usuario } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const targetVisitId = searchParams.get('visitId')
  const targetSeguimientoId = searchParams.get('seguimiento')
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [items, setItems] = useState<VisitListItem[]>([])
  const [followups, setFollowups] = useState<VisitFollowUp[]>([])
  const [invitaciones, setInvitaciones] = useState<DetalleInvitacion[]>([])
  const [filtros, setFiltros] = useState<FiltrosAgenda>(filtrosIniciales)
  const [eventoAbierto, setEventoAbierto] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [local, setLocal] = useState(false)
  const [selected, setSelected] = useState<VisitListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VisitListItem | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [editing, setEditing] = useState<VisitFollowUp | null>(null)
  const [rescheduling, setRescheduling] = useState<VisitListItem | null>(null)
  const [slide, setSlide] = useState(0)
  const [schedulingDate, setSchedulingDate] = useState<string | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const carousel = useRef<HTMLDivElement>(null)
  const today = todayInGuatemala()
  // VIS-05: Dirección puede consultar todos los eventos. Las modificaciones
  // de una visita o compromiso ajeno permanecen reservadas a su responsable.
  const institutionManager = Boolean(usuario?.roles.some(role => {
    const normalized = role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    return normalized === 'direccion general' || normalized === 'coordinadora del programa agroforestal'
  }))
  const visitOwner = (visit: VisitListItem) => visit.responsibleUserId === usuario?.id
  const canManageVisit = (visit: VisitListItem) => visitOwner(visit) || (institutionManager && visit.status === 'PROGRAMADA' && visit.id !== null)
  const canManageFollowUp = (followup: VisitFollowUp) => followup.responsibleUserId === usuario?.id

  const refresh = useCallback(async () => {
    if (!usuario) { setLoading(false); return }
    setLoading(true)
    try {
      await syncPendingVisits(usuario.id)
      const [visits, pending, eventos] = await Promise.all([
        getVisitList(usuario.id), getVisitFollowUps(usuario.id),
        obtenerMisInvitaciones().catch(() => ({ data: [] as DetalleInvitacion[] })),
      ])
      setItems(visits.items); setFollowups(pending.items)
      setInvitaciones(eventos.data.filter(e => ['ACEPTADA','ASIGNADO'].includes(e.estado ?? '')))
      setLocal(visits.local || pending.local); setError('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cargar la agenda.') }
    finally { setLoading(false) }
  }, [usuario])

  useEffect(() => { void refresh() }, [refresh])
  // Enlace del calendario institucional: abre la visita original, sin copiarla.
  useEffect(() => {
    if (!targetVisitId || loading) return
    const target = items.find(item => item.id !== null && String(item.id) === targetVisitId)
    if (target) {
      setMonth(new Date(`${target.date}T12:00:00`))
      setSelected(target)
    } else {
      setError('La visita no está disponible en tu agenda o no tienes permiso para consultarla.')
    }
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete('visitId')
      next.delete('fecha')
      return next
    }, {replace: true})
  }, [targetVisitId, loading, items, setSearchParams])
  // NTF-07: abrir directamente el compromiso mencionado en el aviso.
  useEffect(() => {
    if (!targetSeguimientoId || loading) return
    const found = followups.find(item => item.id === targetSeguimientoId)
    if (found) {
      setSelected(null)
      setEditing(found)
      if (found.due) setMonth(new Date(`${found.due}T12:00:00`))
    } else {
      setError('El seguimiento no está disponible o no tienes permiso para consultarlo.')
    }
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete('seguimiento')
      return next
    }, { replace: true })
  }, [targetSeguimientoId, loading, followups, setSearchParams])
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
      if (followup.status === 'CUMPLIDO') continue
      const scheduledNext = followup.nextVisit ? items
        .filter(v => v.familyId === followup.familyId && v.status === 'PROGRAMADA' && v.date >= followup.date)
        .sort((a, b) => a.date.localeCompare(b.date))[0]?.date : null
      const displayDate = followup.nextVisit ? scheduledNext : followup.due
      if (!displayDate) continue
      const list = map.get(displayDate) ?? []
      list.push({ key: `followup-${followup.id}`, label: followup.text, kind: 'followup', followup })
      map.set(displayDate, list)
    }
    // En la fecha antigua dejamos una huella visual, sin crear una segunda visita.
    for (const visit of items) for (const h of visit.reprogramaciones ?? []) {
      const prior = map.get(h.oldDate ?? '') ?? []
      prior.push({ key: `visit-trace-${visit.id}-${h.id}`, label: `Reprogramada · ${visit.familyName}`, kind: 'visit-history', visit, movedTo: h.newDate })
      if (h.oldDate) map.set(h.oldDate, prior)
    }
    for (const followup of followups) for (const h of followup.reprogramaciones ?? []) {
      if (!h.oldDate) continue
      const prior = map.get(h.oldDate) ?? []
      prior.push({ key: `followup-trace-${followup.id}-${h.id}`, label: `Reprogramado · ${followup.text}`, kind: 'followup-history', followup, movedTo: h.newDate })
      map.set(h.oldDate, prior)
    }
    // Las invitaciones aceptadas son referencias de solo lectura al evento institucional.
    // No se copian a visita ni se programan visitas automáticamente.
    for (const invitacion of invitaciones) {
      let cursor = invitacion.fechaInicio
      const limite = invitacion.fechaFin
      for (let i = 0; i < 370 && cursor <= limite; i++) {
        const lista = map.get(cursor) ?? []
        lista.push({ key: `institutional-${invitacion.eventoId}`, label: invitacion.titulo, kind: 'institutional', invitation: invitacion })
        map.set(cursor, lista)
        const fecha = new Date(`${cursor}T12:00:00Z`)
        fecha.setUTCDate(fecha.getUTCDate()+1)
        cursor=fecha.toISOString().slice(0,10)
      }
    }
    return map
  }, [byDate, followups, items, invitaciones])
  const eventosVisibles = useMemo(() => new Map([...eventsByDate].map(([fecha, eventos]) =>
    [fecha, filtrarAgenda(eventos, filtros, today)] as const)), [eventsByDate, filtros, today])
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
    const scheduled: Reminder[] = items.filter(v => v.status === 'PROGRAMADA').map(v => ({
      key:visitKey(v),date:v.date,sortDate:v.date,family:v.familyName,description:`${v.date < today ? 'Visita vencida · Reprogramar' : 'Visita programada'} · ${v.community}${v.capture?.timeSlot ? ` · ${v.capture.timeSlot === 'MANANA' ? 'Mañana' : 'Tarde'}` : ''}`,type:'visit',visit:v,
    }))
    const followUpReminders: Reminder[] = followups.filter(f => f.status !== 'CUMPLIDO').map(f => ({
      key:f.id,date:f.nextVisit ? null : f.due, sortDate:f.nextVisit ? '9999-12-31' : f.due ?? '9999-12-31', family:f.familyName,
      description:f.text,type:'followup',followup:f,
    }))
    const institutional: Reminder[] = invitaciones.map(e => ({
      key: `event-${e.eventoId}`, date: e.fechaInicio, sortDate: e.fechaInicio,
      family: e.titulo, description: [e.categoria, e.lugar].filter(Boolean).join(' · '),
      type: 'institutional', invitation: e,
    }))
    // La lista lateral utiliza los mismos filtros que el calendario mensual.
    const todos = [...scheduled, ...followUpReminders, ...institutional]
    return todos.filter(item => filtrarAgenda([{
      key: item.key, label: item.family, kind: item.type === 'institutional' ? 'institutional' : item.type,
      visit: item.visit, followup: item.followup, invitation: item.invitation,
    }], filtros, today).length > 0).sort((a,b) => a.sortDate.localeCompare(b.sortDate)).slice(0,24)
  }, [items,followups,invitaciones,today,filtros])
  const pendingCount = followups.filter(f => f.status !== 'CUMPLIDO').length
  useEffect(() => { setSlide(0) }, [filtros])
  const detailsFollowUps = selected ? followups.filter(f => f.familyId === selected.familyId && (f.status !== 'CUMPLIDO' || f.sourceVisitId === selected.id)) : []
  const move = (n: number) => setMonth(prev => new Date(prev.getFullYear(), prev.getMonth()+n,1))
  const scrollToReminder = (index: number) => {
    const root = carousel.current
    const element = root?.querySelectorAll<HTMLElement>('[data-reminder]')[index]
    if (root && element) { root.scrollTo({ top: element.offsetTop - root.offsetTop, behavior: 'smooth' }); setSlide(index) }
  }
  const openFollowUp = (f: VisitFollowUp) => { setSelected(null); setEditing(f) }
  const openReschedule = (v: VisitListItem) => { setSelected(null); setRescheduling(v) }
  const requestDelete = (v: VisitListItem) => {
    if (!canManageVisit(v) || v.status !== 'PROGRAMADA' || !v.id || (v.syncStatus && v.syncStatus !== 'synced')) return
    setSelected(null)
    setDeleteError('')
    setDeleteTarget(v)
  }
  const confirmDelete = async () => {
    if (!deleteTarget?.id || deleteBusy) return
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await deleteScheduledVisit(deleteTarget.id)
      setDeleteTarget(null)
      await refresh()
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'No se pudo eliminar la visita.')
    } finally {
      setDeleteBusy(false)
    }
  }
  return <div className="visits-enter">
    <PageMeta title="Agenda de visitas | Viviendas León" description="Agenda y compromisos de visitas técnicas" />
    <PageHeader title="Agenda de visitas" description="" />
    {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
    {local && !error && <p className="mb-3 text-xs font-medium text-amber-700 dark:text-amber-300">Mostrando datos guardados en este dispositivo. Editar pendientes requiere conexión.</p>}
    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand-500"/>Programada</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-violet-500"/>Evento</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500"/>Visita vencida</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-400"/>Reprogramación</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500"/>Realizada</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-500"/>Seguimiento pendiente</span>
      <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-500"/>No cumplido</span>
    </div>
    <div className={`${card} mb-4 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_minmax(220px,1.5fr)_auto] xl:items-end`} aria-label="Filtros de Mi calendario">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Actividad
        <select aria-label="Filtrar por actividad" className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white" value={filtros.tipo}
          onChange={e => setFiltros(old => ({...old, tipo:e.target.value as FiltrosAgenda['tipo']}))}>
          <option value="todos">Todas</option><option value="visitas">Visitas</option><option value="compromisos">Compromisos</option>
          <option value="eventos">Eventos</option><option value="reprogramaciones">Reprogramaciones</option>
        </select>
      </label>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Estado
        <select aria-label="Filtrar por estado" className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white" value={filtros.estado}
          onChange={e => setFiltros(old => ({...old, estado:e.target.value as FiltrosAgenda['estado']}))}>
          <option value="todos">Todos</option><option value="programadas">Programadas</option><option value="vencidas">Vencidas</option>
          <option value="realizadas">Realizadas</option><option value="finalizadas">Finalizadas</option><option value="pendientes">Pendientes</option><option value="no-cumplido">No cumplido</option>
        </select>
      </label>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">Buscar
        <input aria-label="Buscar familia, comunidad o evento" type="search" placeholder="Familia, comunidad o evento" value={filtros.busqueda}
          onChange={e => setFiltros(old => ({...old, busqueda:e.target.value}))}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
      </label>
      <Button type="button" size="sm" variant="secondary" onClick={() => setFiltros(filtrosIniciales)}
        disabled={filtros.tipo === 'todos' && filtros.estado === 'todos' && !filtros.busqueda}>Limpiar</Button>
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
            const daily = eventosVisibles.get(cell.key) ?? []
            return <div key={cell.key} onDoubleClick={() => { if (cell.key >= today) setSchedulingDate(cell.key) }}
              title={cell.key >= today ? `Agendar visita el ${cell.key}` : undefined}
              className={`min-h-28 border-b border-r border-gray-100 p-1.5 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 md:min-h-36 ${index%7===0 ? 'border-l border-gray-100 dark:border-gray-800' : ''} ${!cell.currentMonth ? 'bg-gray-50/70 dark:bg-gray-950/30' : ''}`}>
              <button type="button" onClick={() => { if (cell.key >= today) setSchedulingDate(cell.key) }}
                disabled={cell.key < today}
                aria-label={cell.key < today ? `Día ${cell.key}` : `Agendar visita el ${cell.key}`}
                className={`mb-2 inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand-500 ${cell.key < today ? 'cursor-default text-gray-400 dark:text-gray-500' : 'hover:bg-brand-100'} ${cell.key===today?'bg-brand-500 text-white':cell.currentMonth?'text-gray-800 dark:text-gray-200':'text-gray-400'}`}>{cell.date}</button>
              <div className="space-y-1">
                {daily.slice(0,3).map(event => <button key={event.key} type="button"
                  onClick={() => event.invitation ? setEventoAbierto(event.invitation.eventoId) : event.visit ? setSelected(event.visit) : event.followup && openFollowUp(event.followup)}
                  onDoubleClick={e => e.stopPropagation()}
                  title={event.movedTo ? `Reprogramado para ${dateLabel(event.movedTo)}` : event.kind === 'institutional' ? `Ver evento: ${event.label}` : event.kind === 'visit' ? `Ver visita: ${event.label}` : `Ver seguimiento: ${event.label}`}
                  className={`block w-full truncate rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] font-medium transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-brand-500 ${event.kind==='institutional' ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200' : event.kind.endsWith('history') ? 'border-slate-400 border-dashed bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : event.kind==='visit' && event.visit?.status==='PROGRAMADA' && event.visit.date < today ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300' : event.kind==='followup' ? event.followup?.status === 'NO_CUMPLIDO' ? 'border-red-500 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300' : 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300' :event.visit?.status==='REALIZADA'?'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300':'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200'}`}>
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
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800"><div><h2 className="font-semibold text-gray-900 dark:text-white">Próximas actividades</h2></div><Button type="button" variant="ghost" size="sm" onClick={()=>void refresh()} aria-label="Actualizar agenda" disabled={loading}><RefreshCw size={16}/></Button></header>
        <div className="relative flex gap-2 p-4">
          <div ref={carousel} onScroll={event => {
            const root = event.currentTarget
            const sections = root.querySelectorAll<HTMLElement>('[data-reminder]')
            let closest = 0; let distance = Infinity
            sections.forEach((section,i)=> { const d=Math.abs(section.offsetTop-root.offsetTop-root.scrollTop); if(d<distance){closest=i;distance=d} })
            setSlide(closest)
          }} className="custom-scrollbar max-h-[450px] min-w-0 flex-1 snap-y snap-mandatory space-y-3 overflow-y-auto overscroll-contain">
            {loading ? <p className="py-8 text-center text-sm text-gray-500">Cargando…</p> : reminders.length === 0 ? <div className="py-9 text-center text-sm text-gray-500"><CheckCheck className="mx-auto mb-2 text-emerald-500" size={27}/>Sin actividades para estos filtros.</div>
            : reminders.map(item => <article key={item.key} data-reminder className="snap-start rounded-xl border border-gray-200 bg-gray-50/30 p-3 dark:border-gray-800 dark:bg-white/5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><span className={`rounded-full px-2 py-1 ${item.type==='institutional' ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300' : item.type==='visit' ? item.date && item.date < today ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : item.followup?.status === 'NO_CUMPLIDO' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>{item.type==='institutional' ? 'Evento' : item.type==='visit' ? item.date && item.date < today ? 'Visita vencida' : 'Visita programada' : item.followup?.status === 'NO_CUMPLIDO' ? 'No cumplido' : 'Seguimiento'}</span><span className={item.date && item.date<today?'text-rose-600':'text-gray-500'}>{item.date ? dateLabel(item.date) : item.followup?.nextVisit ? 'Próxima visita' : 'Sin fecha'}{item.date && item.date<today?' · Vencido':''}</span></div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.family}</p>
              <p className="mt-1 line-clamp-3 text-sm leading-5 text-gray-600 dark:text-gray-300">{item.description}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-brand-600 dark:text-brand-400">
                {item.invitation && <button type="button" onClick={() => setEventoAbierto(item.invitation!.eventoId)} className="hover:underline">Ver evento →</button>}
                {item.visit && <><button type="button" onClick={()=>setSelected(item.visit!)} className="hover:underline">Ver detalle →</button>
                  {canManageVisit(item.visit) && <button type="button" disabled={!item.visit.id || Boolean(item.visit.syncStatus && item.visit.syncStatus !== 'synced')} onClick={()=>openReschedule(item.visit!)} className="hover:underline disabled:cursor-not-allowed disabled:opacity-40">Cambiar fecha</button>}</>}
                {item.followup && <button type="button" onClick={()=>openFollowUp(item.followup!)} className="inline-flex items-center gap-1 hover:underline"><Edit3 size={13}/> {canManageFollowUp(item.followup) ? 'Editar seguimiento' : 'Ver seguimiento'}</button>}
                {item.visit && item.visit.date < today && canManageVisit(item.visit) && <button type="button" className="font-semibold text-rose-700 underline" onClick={()=>openReschedule(item.visit!)}>Reprogramar primero ↗</button>}
                {item.visit ? (canManageVisit(item.visit) && item.visit.date === today && <Link to={`/visitas/nueva?familia=${item.visit.familyId}&fecha=${today}${item.visit.id && item.visit.status === 'PROGRAMADA' ? `&programada=${item.visit.id}` : ''}`} className="hover:underline">Registrar visita ↗</Link>) : (item.followup && canManageFollowUp(item.followup) && <Link to={`/visitas/nueva?familia=${item.followup.familyId}&fecha=${today}`} className="hover:underline">Registrar visita ↗</Link>)}
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
        {(expandedDay ? eventosVisibles.get(expandedDay) ?? [] : []).map(event => <button type="button" key={event.key}
          onClick={() => { setExpandedDay(null); if (event.invitation) setEventoAbierto(event.invitation.eventoId); else if (event.visit) setSelected(event.visit); else if (event.followup) openFollowUp(event.followup) }}
          className="flex w-full items-start gap-3 rounded-lg border border-gray-200 p-3 text-left transition hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-700 dark:hover:bg-gray-800">
          <span className={`mt-1 size-2.5 shrink-0 rounded-full ${event.kind==='institutional' ? 'bg-violet-500' : event.kind.endsWith('history') ? 'bg-slate-400' : event.kind==='visit' && event.visit?.status==='PROGRAMADA' && event.visit.date < today ? 'bg-rose-500' : event.kind==='followup' ? event.followup?.status === 'NO_CUMPLIDO' ? 'bg-red-500' : 'bg-amber-500' :event.visit?.status==='REALIZADA'?'bg-emerald-500':'bg-brand-500'}`}/>
          <span className="min-w-0"><span className="block break-words text-sm font-semibold text-gray-900 dark:text-white">{event.label}</span>
          <span className="mt-1 block text-xs text-gray-500">{event.movedTo ? `Se trasladó al ${dateLabel(event.movedTo)}` : event.kind==='institutional' ? 'Actividad institucional' : event.kind==='followup'?'Seguimiento pendiente':event.visit?.status==='REALIZADA'?'Visita realizada':event.visit?.date && event.visit.date < today ? 'Visita vencida':'Visita programada'} · Abrir detalle</span></span>
        </button>)}
      </div>
    </Dialog>
    <InvitacionDetalleDialog eventoId={eventoAbierto} onClose={()=>setEventoAbierto(null)} onResponded={()=>{void refresh()}} />
    <ScheduleVisitDialog date={schedulingDate} onClose={() => setSchedulingDate(null)} onSaved={() => { setSchedulingDate(null); void refresh() }}/>
    <VisitDetailDialog key={selected?.operationId ?? selected?.id ?? 'dialog-visit'} visit={selected} onClose={()=>setSelected(null)} extra={selected ? <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      {Boolean(selected.reprogramaciones?.length) && <section className="mb-4 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-800"><h4 className="mb-2 font-semibold">Reprogramaciones</h4>{selected.reprogramaciones?.map(h=><p className="mb-1" key={h.id}>{h.oldDate} → {h.newDate} · {new Date(h.at).toLocaleString('es-GT')}{h.reason ? ` · ${h.reason}` : ''}</p>)}</section>}
      {selected.status === 'PROGRAMADA' && selected.date < today && <div role="alert" className="mb-3 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">Esta visita está vencida. Reprográmala antes de registrarla.</div>}
      <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Seguimientos de esta familia</h3>
      {detailsFollowUps.length===0 ? <p className="text-sm text-gray-500">Sin compromisos pendientes.</p> : <div className="space-y-2">{detailsFollowUps.map(f=><div key={f.id} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
        <p className="break-words text-gray-800 dark:text-gray-200">{f.text}</p><p className="mt-1 text-xs text-gray-500">{f.status==='CUMPLIDO'?'Cumplido':f.status==='NO_CUMPLIDO'?'No cumplido':'Pendiente'}{f.nextVisit ? ' · Próxima visita' : f.due ? ` · ${dateLabel(f.due)}` : ''}</p>
        <button type="button" onClick={()=>openFollowUp(f)} className="mt-2 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400">{canManageFollowUp(f) ? 'Editar seguimiento →' : 'Ver seguimiento →'}</button>
      </div>)}</div>}
      <div className="mt-3 flex flex-wrap gap-4">
        {canManageVisit(selected) && selected.status === 'PROGRAMADA' && <button type="button" disabled={!selected.id} onClick={()=>openReschedule(selected)} className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-40 dark:text-brand-400">Cambiar fecha programada</button>}
        {canManageVisit(selected) && selected.status === 'PROGRAMADA' && <button type="button" disabled={!selected.id || Boolean(selected.syncStatus && selected.syncStatus !== 'synced')} onClick={()=>requestDelete(selected)} className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"><Trash2 size={14}/> Eliminar visita</button>}
        {visitOwner(selected) && !(selected.status === 'PROGRAMADA' && selected.date < today) && <Link className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400" to={`/visitas/nueva?familia=${selected.familyId}${selected.id && selected.status === 'PROGRAMADA' ? `&programada=${selected.id}` : ''}`}>Registrar siguiente visita ↗</Link>}
      </div>
    </section> : undefined}/>
    <Dialog open={Boolean(deleteTarget)} onClose={() => { if (!deleteBusy) setDeleteTarget(null) }}
      title="Eliminar visita programada"
      description={deleteTarget ? `${deleteTarget.familyName} · ${dateLabel(deleteTarget.date)}` : ''}
      actions={<>
        <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleteBusy}>Cancelar</Button>
        <Button type="button" variant="danger" onClick={() => void confirmDelete()} disabled={deleteBusy}>
          <Trash2 size={16}/> {deleteBusy ? 'Eliminando…' : 'Sí, eliminar visita'}
        </Button>
      </>}>
      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
        La cita se eliminará del calendario y de Próximas visitas. Esta acción no se puede deshacer.
      </p>
      {deleteError && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
    </Dialog>
    <RescheduleVisitDialog key={rescheduling?.operationId ?? rescheduling?.id ?? 'dialog-reschedule'} visit={rescheduling} onClose={()=>setRescheduling(null)} onSaved={()=>{setRescheduling(null);void refresh()}}/>
    <FollowUpEditDialog key={editing?.id ?? 'dialog-followup'} item={editing} readOnly={Boolean(editing && !canManageFollowUp(editing))} onClose={()=>setEditing(null)} onSaved={()=>{setEditing(null); void refresh()}} />
  </div>
}
