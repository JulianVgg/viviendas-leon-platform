import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Link } from 'react-router'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, isDireccionGeneral } from '@/features/auth/screenPermissions'
import InstitutionalEventDialog from '../components/InstitutionalEventDialog'
import {
  eventColor, eventDisplayTitle, loadCalendarView, loadParticipants, removeEvent, saveEvent,
  type CalendarEvent, type CalendarEventInput, type CalendarPerson, type CalendarTechnicalVisit,
} from '../services/calendarService'

const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const weekNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']
function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const todayKey = () => dayKey(new Date())
const readableDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-GT', {
  day: 'numeric', month: 'long', year: 'numeric',
})
function roleNormal(role: string) {
  return role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

// Sólo es una unión para la interfaz. Las visitas siguen en la tabla Visita.
type CalendarItem =
  | { key: string; kind: 'institutional'; event: CalendarEvent }
  | { key: string; kind: 'technical'; visit: CalendarTechnicalVisit }

const technicalTitle = (visit: CalendarTechnicalVisit) => `Visita técnica · ${visit.familia}`
function itemTitle(item: CalendarItem): string {
  return item.kind === 'institutional' ? eventDisplayTitle(item.event) : technicalTitle(item.visit)
}
function itemColor(item: CalendarItem): string {
  if (item.kind === 'institutional') return eventColor(item.event.categoria)
  return item.visit.estado === 'REALIZADA'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200'
    : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-500/15 dark:text-blue-200'
}

export default function InstitutionalCalendarPage() {
  const { usuario } = useAuth()
  const editable = Boolean(usuario && (
    isDireccionGeneral(usuario) ||
    usuario.roles.some(role => roleNormal(role) === 'coordinadora del programa agroforestal')
  ))
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [technicalVisits, setTechnicalVisits] = useState<CalendarTechnicalVisit[]>([])
  const [users, setUsers] = useState<CalendarPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [selectedVisit, setSelectedVisit] = useState<CalendarTechnicalVisit | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [eventDialogOpen, setEventDialogOpen] = useState(false)
  const [dayList, setDayList] = useState<string | null>(null)

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
      setUsers(people)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar el calendario.')
    } finally {
      setLoading(false)
    }
  }, [from, to, editable])
  useEffect(() => { void refresh() }, [refresh])

  const byDay = useMemo(() => {
    const result = new Map<string, CalendarItem[]>()
    for (const cell of monthCells) result.set(cell.key, [])
    for (const event of events) {
      for (const cell of monthCells) {
        // Incluye registros previos de varios días, sin modificar sus datos.
        if (cell.key >= event.fechaInicio && cell.key <= event.fechaFin) {
          result.get(cell.key)?.push({ key: `institutional-${event.id}`, kind: 'institutional', event })
        }
      }
    }
    for (const visit of technicalVisits) {
      result.get(visit.fecha)?.push({ key: `technical-${visit.id}`, kind: 'technical', visit })
    }
    return result
  }, [events, technicalVisits, monthCells])

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
    setSelectedVisit(item.visit)
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
  const canOpenVisitAgenda = Boolean(usuario && editable && canViewPath(usuario, '/visitas/agenda'))

  return (
    <>
      <PageMeta title="Calendario institucional | Viviendas León" description="Calendario de actividades institucionales" />
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

        <div className="overflow-x-auto">
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
                          title={itemTitle(event)}
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
        {loading && <p role="status" className="border-t border-gray-100 p-3 text-center text-sm text-gray-500 dark:border-gray-800">Cargando eventos…</p>}
      </section>

      <InstitutionalEventDialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        selected={selected}
        date={selectedDate}
        users={users}
        editable={editable}
        onSave={save}
        onDelete={erase}
      />
      <Dialog
        open={selectedVisit !== null}
        title="Visita técnica"
        description={selectedVisit ? readableDate(selectedVisit.fecha) : undefined}
        onClose={() => setSelectedVisit(null)}
      >
        {selectedVisit && (
          <div className="space-y-4 text-sm">
            <div>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${selectedVisit.estado === 'REALIZADA'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200'
                : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-500/15 dark:text-blue-200'}`}>
                {selectedVisit.estado === 'REALIZADA' ? 'Realizada' : 'Programada'}
              </span>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Familia</dt>
                <dd className="mt-1 break-words font-medium text-gray-900 dark:text-gray-100">{selectedVisit.familia}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Comunidad</dt>
                <dd className="mt-1 break-words text-gray-900 dark:text-gray-100">{selectedVisit.comunidad}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Responsable</dt>
                <dd className="mt-1 break-words text-gray-900 dark:text-gray-100">{selectedVisit.responsable}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Fecha</dt>
                <dd className="mt-1 text-gray-900 dark:text-gray-100">{readableDate(selectedVisit.fecha)}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <Button type="button" variant="secondary" onClick={() => setSelectedVisit(null)}>Cerrar</Button>
              {canOpenVisitAgenda && (
                <Link
                  to={`/visitas/agenda?visitId=${selectedVisit.id}`}
                  onClick={() => setSelectedVisit(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-brand-500"
                >
                  Gestionar en agenda de visitas
                </Link>
              )}
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
