import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, List, CalendarDays } from 'lucide-react'

import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import VisitDetailDialog from '@/features/visits/components/VisitDetailDialog'
import type { VisitListItem } from '@/features/visits/services/visitService'
import { useAuth } from '@/features/auth/AuthProvider'
import { esSupervisorCalendario } from '@/features/auth/calendarAccess'
import InstitutionalEventDialog from '../components/InstitutionalEventDialog'
import { eventoHaPasado } from '../services/eventHistory'
import {
  eventColor, eventDisplayTitle, loadCalendarView, loadParticipants, loadSupervisionVisitDetail, removeEvent, saveEvent,
  type CalendarEvent, type CalendarEventInput, type CalendarPerson, type CalendarTechnicalVisit, type CalendarTraining,
} from '../services/calendarService'
import { filtrarActividades, responsableActividad, comunidadActividad, estadoActividad, fechaActividad, type ActividadEquipo, type ActividadFiltro, type EstadoFiltro } from '../services/calendarFilters'

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const weekNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const todayKey = () => dayKey(new Date())
const readableDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-GT', {
  day: 'numeric', month: 'long', year: 'numeric',
})

// Sólo es una unión para la interfaz. Las visitas siguen en la tabla Visita.
type CalendarItem = ActividadEquipo

const technicalTitle = (visit: CalendarTechnicalVisit) => `Visita técnica · ${visit.familia}`
function itemTitle(item: CalendarItem): string {
  if (item.kind === 'institutional') return eventDisplayTitle(item.event)
  if (item.kind === 'technical') return technicalTitle(item.visit)
  return `Capacitación · ${item.training.tema}`
}
function itemColor(item: CalendarItem): string {
  if (item.kind === 'institutional') return eventColor(item.event.categoria)
  if (item.kind === 'training') return 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-500/15 dark:text-violet-200'
  return item.visit.estado === 'REALIZADA'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200'
    : item.visit.fecha < todayKey() ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-500/15 dark:text-rose-200'
    : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-500/15 dark:text-blue-200'
}

export default function InstitutionalCalendarPage() {
  const { usuario } = useAuth()
  const editable = Boolean(usuario && esSupervisorCalendario(usuario))
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [technicalVisits, setTechnicalVisits] = useState<CalendarTechnicalVisit[]>([])
  const [trainings, setTrainings] = useState<CalendarTraining[]>([])
  const [users, setUsers] = useState<CalendarPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [selectedVisit, setSelectedVisit] = useState<CalendarTechnicalVisit | null>(null)
  const [fullVisit, setFullVisit] = useState<VisitListItem | null>(null)
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedTraining, setSelectedTraining] = useState<CalendarTraining | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [dayList, setDayList] = useState<string | null>(null)
  const [tipo, setTipo] = useState<ActividadFiltro>('todos')
  const [estado, setEstado] = useState<EstadoFiltro>('todos')
  const [responsable, setResponsable] = useState('')
  const [comunidad, setComunidad] = useState('')
  const [vista, setVista] = useState<'mes'|'lista'>('mes')

  useEffect(() => {
    if (!selectedVisit) { setFullVisit(null); setDetailError(''); setDetailLoading(false); return }
    const controller = new AbortController()
    setFullVisit(null)
    setDetailError('')
    setDetailLoading(true)
    void loadSupervisionVisitDetail(selectedVisit.id, controller.signal)
      .then(item => { if (!controller.signal.aborted) setFullVisit(item) })
      .catch(error => { if (!controller.signal.aborted) setDetailError(error instanceof Error ? error.message : 'No se pudo consultar la visita.') })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => controller.abort()
  }, [selectedVisit])

  const monthCells = useMemo(() => {
    const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const count = Math.ceil((offset + lastDay) / 7) * 7
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1)
      return { key: dayKey(date), number: date.getDate(), inMonth: date.getMonth() === month.getMonth() }
    })
  }, [month])
  const from = monthCells[0]?.key ?? todayKey()
  const to = monthCells.at(-1)?.key ?? todayKey()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [result, people] = await Promise.all([
        loadCalendarView(from, to),
        editable ? loadParticipants() : Promise.resolve([]),
      ])
      setEvents(result.events)
      setTechnicalVisits(result.visits)
      setTrainings(result.trainings)
      setUsers(people)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar el calendario.')
    } finally {
      setLoading(false)
    }
  }, [from, to, editable])
  useEffect(() => { void refresh() }, [refresh])

  const allItems = useMemo<CalendarItem[]>(() => [
    ...events.map(event => ({key:`institutional-${event.id}`,kind:'institutional' as const,event})),
    ...technicalVisits.map(visit => ({key:`technical-${visit.id}`,kind:'technical' as const,visit})),
    ...trainings.map(training => ({key:`training-${training.id}`,kind:'training' as const,training})),
  ], [events,technicalVisits,trainings])
  const empleados = useMemo(() => [...new Set(allItems.map(responsableActividad).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')), [allItems])
  const comunidades = useMemo(() => [...new Set(allItems.map(comunidadActividad).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')), [allItems])
  const filtradas = useMemo(() => filtrarActividades(allItems,{tipo,estado,responsable,comunidad},todayKey()),[allItems,tipo,estado,responsable,comunidad])
  const listadas = useMemo(() => [...filtradas].sort((a,b)=>fechaActividad(a).localeCompare(fechaActividad(b))||a.key.localeCompare(b.key)),[filtradas])
  const byDay = useMemo(() => {
    const result = new Map<string, CalendarItem[]>()
    for (const cell of monthCells) result.set(cell.key, [])
    for (const event of filtradas.filter((item):item is Extract<CalendarItem,{kind:'institutional'}> => item.kind === 'institutional').map(item=>item.event)) {
      for (const cell of monthCells) {
        // Incluye registros previos de varios días, sin modificar sus datos.
        if (cell.key >= event.fechaInicio && cell.key <= event.fechaFin) {
          result.get(cell.key)?.push({ key: `institutional-${event.id}`, kind: 'institutional', event })
        }
      }
    }
    for (const visit of filtradas.filter((item):item is Extract<CalendarItem,{kind:'technical'}> => item.kind === 'technical').map(item=>item.visit)) {
      result.get(visit.fecha)?.push({ key: `technical-${visit.id}`, kind: 'technical', visit })
    }
    for (const training of filtradas.filter((item):item is Extract<CalendarItem,{kind:'training'}> => item.kind === 'training').map(item=>item.training)) {
      result.get(training.fecha)?.push({ key: `training-${training.id}`, kind: 'training', training })
    }
    return result
  }, [filtradas, monthCells])

  const createEvent = (date = todayKey()) => {
    if (!editable) return
    setSelected(null)
    setSelectedDate(date)
    setDayList(null)
    setEventDialogOpen(true)
  }
  const viewEvent = (event: CalendarEvent) => {
    setSelected(event)
    setSelectedDate(event.fechaInicio)
    setDayList(null)
    setEventDialogOpen(true)
  }
  const viewItem = (item: CalendarItem) => {
    if (item.kind === 'institutional') {
      viewEvent(item.event)
      return
    }
    if (item.kind === 'technical') {
      setSelectedVisit(item.visit)
      setDayList(null)
      return
    }
    setSelectedTraining(item.training)
    setDayList(null)
  }
  const save = async (payload: CalendarEventInput, id?: number) => {
    await saveEvent(payload, id)
    await refresh()
  }
  const erase = async (id: number) => {
    await removeEvent(id)
    await refresh()
  }
  const changeMonth = (delta: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  const showToday = () => {
    const today = new Date()
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }
  const selectedDayEvents = dayList ? (byDay.get(dayList) ?? []) : []


  return (
    <>
      <PageMeta title="Calendario | Viviendas León" description="Calendario de actividades institucionales" />
      <PageHeader title="Calendario" description="" />
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}
      <section aria-label="Calendario institucional mensual" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-800 sm:grid-cols-[1fr_auto_1fr] sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" aria-label="Mes anterior" onClick={() => changeMonth(-1)}>
              <ChevronLeft size={18} />
            </Button>
            <Button type="button" variant="secondary" size="sm" aria-label="Mes siguiente" onClick={() => changeMonth(1)}>
              <ChevronRight size={18} />
            </Button>
            {editable && (
              <Button type="button" size="sm" onClick={() => createEvent()}>
                <Plus size={17} /> Crear evento
              </Button>
            )}
          </div>
          <h2 className="text-center text-base font-semibold text-gray-800 dark:text-white sm:text-lg" aria-live="polite">
            {monthNames[month.getMonth()]} {month.getFullYear()}
          </h2>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={showToday}>Hoy</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4 dark:border-gray-800">
          <label className="text-sm text-gray-500">Actividad
            <select aria-label="Filtrar por actividad" value={tipo} onChange={e=>setTipo(e.target.value as ActividadFiltro)} className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <option value="todos">Todas</option><option value="evento">Eventos</option><option value="visita">Visitas</option><option value="capacitacion">Capacitaciones</option>
            </select>
          </label>
          <label className="text-sm text-gray-500">Responsable
            <select aria-label="Filtrar por responsable" value={responsable} onChange={e=>setResponsable(e.target.value)} className="mt-1 block max-w-52 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <option value="">Todos</option>{empleados.map(nombre=><option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </label>
          <label className="text-sm text-gray-500">Estado
            <select aria-label="Filtrar por estado" value={estado} onChange={e=>setEstado(e.target.value as EstadoFiltro)} className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <option value="todos">Todos</option><option value="programada">Programadas</option><option value="realizada">Realizadas</option><option value="vencida">Vencidas</option><option value="finalizada">Finalizadas</option>
            </select>
          </label>
          <label className="text-sm text-gray-500">Comunidad
            <select aria-label="Filtrar por comunidad" value={comunidad} onChange={e=>setComunidad(e.target.value)} className="mt-1 block max-w-52 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
              <option value="">Todas</option>{comunidades.map(nombre=><option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </label>
          <button type="button" className="mt-5 text-sm font-medium text-brand-600 hover:underline" onClick={()=>{setTipo('todos');setResponsable('');setEstado('todos');setComunidad('')}}>Limpiar</button>
          <span className="ml-auto mt-5 text-xs text-gray-500" aria-live="polite">{filtradas.length} actividades</span>
          <div className="mt-4 flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-700">
            <button type="button" aria-pressed={vista==='mes'} onClick={()=>setVista('mes')} className={`rounded-md px-3 py-1.5 text-xs ${vista==='mes'?'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300':'text-gray-500'}`}><CalendarDays size={14} className="mr-1 inline"/> Mes</button>
            <button type="button" aria-pressed={vista==='lista'} onClick={()=>setVista('lista')} className={`rounded-md px-3 py-1.5 text-xs ${vista==='lista'?'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300':'text-gray-500'}`}><List size={14} className="mr-1 inline"/> Lista</button>
          </div>
        </div>
        {vista==='mes' ? <div className="overflow-x-auto">
          <div className="min-w-[650px]">
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-400 dark:border-gray-800 dark:bg-gray-800/40">
              {weekNames.map(day => <div key={day} className="py-4">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {monthCells.map(cell => {
                const dayEvents = byDay.get(cell.key) ?? []
                return (
                  <div
                    key={cell.key}
                    onDoubleClick={() => createEvent(cell.key)}
                    className={`min-h-35 border-b border-r border-gray-100 p-2 sm:min-h-40 sm:p-3 dark:border-gray-800 ${cell.inMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/65 dark:bg-gray-800/20'} ${editable ? 'hover:bg-brand-50/30 dark:hover:bg-brand-500/5' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => editable ? createEvent(cell.key) : setDayList(cell.key)}
                      title={editable ? 'Crear evento este día' : 'Consultar actividades del día'}
                      className={`mb-2 ml-auto flex size-7 items-center justify-center rounded-full text-xs font-medium ${cell.key === todayKey() ? 'bg-brand-500 text-white' : cell.inMonth ? 'text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800' : 'text-gray-400'}`}
                    >
                      {cell.number}
                    </button>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <button
                          key={event.key}
                          type="button"
                          onDoubleClick={click => click.stopPropagation()}
                          onClick={() => viewItem(event)}
                          title={`${itemTitle(event)} · ${responsableActividad(event) || 'Sin responsable'}`}
                          className={`block w-full truncate rounded-md border border-l-[3px] px-2 py-1.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-brand-500 ${itemColor(event)}`}
                        >
                          {itemTitle(event)}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <button
                          type="button"
                          onClick={() => setDayList(cell.key)}
                          className="w-full text-left text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                        >
                          +{dayEvents.length - 3} más · Ver todos
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        : <div className="max-h-[620px] space-y-2 overflow-y-auto p-4">
          {listadas.map(item => <button key={item.key} type="button" onClick={()=>viewItem(item)} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
            <span className="min-w-0"><span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">{itemTitle(item)}</span><span className="mt-1 block text-xs text-gray-500">{responsableActividad(item)||'Sin responsable'}{comunidadActividad(item)?` · ${comunidadActividad(item)}`:''}</span></span>
            <span className="text-right text-xs text-gray-500">{readableDate(fechaActividad(item))}<span className="block capitalize">{estadoActividad(item,todayKey())}</span></span>
          </button>)}
          {!listadas.length && <p className="p-6 text-center text-sm text-gray-500">Sin actividades.</p>}
        </div>}
        {loading && <p role="status" className="border-t border-gray-100 p-3 text-center text-sm text-gray-500 dark:border-gray-800">Cargando eventos…</p>}
      </section>

      <InstitutionalEventDialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        selected={selected}
        date={selectedDate}
        users={users}
        editable={editable && (!selected || !eventoHaPasado(selected.fechaFin))}
        puedeConsultarRespuestas={editable}
        onSave={save}
        onDelete={erase}
      />
      {fullVisit && fullVisit.id === selectedVisit?.id && <VisitDetailDialog key={fullVisit.id} visit={fullVisit} onClose={() => setSelectedVisit(null)} />}
      <Dialog open={Boolean(selectedVisit) && fullVisit?.id !== selectedVisit?.id} title="Detalle de visita" description={selectedVisit ? readableDate(selectedVisit.fecha) : undefined} onClose={() => setSelectedVisit(null)}>
        <div role={detailError ? 'alert' : 'status'} className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {detailLoading ? 'Cargando detalle…' : detailError || 'Sin información adicional.'}
        </div>
      </Dialog>
      <Dialog
        open={selectedTraining !== null}
        title="Capacitación"
        description={selectedTraining ? readableDate(selectedTraining.fecha) : undefined}
        onClose={() => setSelectedTraining(null)}
      >
        {selectedTraining && (
          <div className="space-y-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Tema</dt>
                <dd className="mt-1 break-words font-medium text-gray-900 dark:text-gray-100">{selectedTraining.tema}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Estado</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{selectedTraining.estado}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Comunidad</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{selectedTraining.comunidad || 'Sin comunidad'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Facilitador</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{selectedTraining.facilitador || 'Sin asignar'}</dd>
              </div>
            </dl>
            <div className="flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button type="button" variant="secondary" onClick={() => setSelectedTraining(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Dialog>
      <Dialog open={dayList !== null} title={dayList ? `Actividades del ${readableDate(dayList)}` : 'Actividades'} onClose={() => setDayList(null)}>
        <div className="space-y-2">
          {selectedDayEvents.map(event => (
            <button
              key={event.key}
              type="button"
              onClick={() => viewItem(event)}
              className={`block w-full rounded-lg border border-l-4 p-3 text-left text-sm ${itemColor(event)}`}
            >
              {itemTitle(event)}
            </button>
          ))}
          {selectedDayEvents.length === 0 && <p className="text-sm text-gray-500">No hay eventos para este día.</p>}
        </div>
        {editable && dayList && (
          <div className="mt-4 flex justify-end">
            <Button type="button" onClick={() => createEvent(dayList)}><Plus size={16} /> Crear evento</Button>
          </div>
        )}
      </Dialog>
    </>
  )
}
