import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { useAuth } from '@/features/auth/AuthProvider'
import ScheduleTrainingDialog from '../components/ScheduleTrainingDialog'
import { getTrainings, type Training } from '../services/trainingService'

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const readableDate = (text: string) => new Date(`${text}T12:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })
const card = 'rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'
const isDirector = (roles: string[]) => roles.some(name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'direccion general')

export default function TrainingAgendaPage() {
  const { usuario } = useAuth()
  const canCreate = Boolean(usuario && (isDirector(usuario.roles) || usuario.permisos.includes('CAPACITACIONES_WRITE')))
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [items, setItems] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [schedulingDate, setSchedulingDate] = useState<string | null>(null)
  const [selected, setSelected] = useState<Training | null>(null)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const today = dateKey(new Date())

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await getTrainings())
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron consultar las capacitaciones.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const byDate = useMemo(() => {
    const result = new Map<string, Training[]>()
    for (const item of items) result.set(item.fecha, [...(result.get(item.fecha) ?? []), item])
    return result
  }, [items])

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const offset = (first.getDay() + 6) % 7
    const size = Math.ceil((offset + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7) * 7
    return Array.from({ length: size }, (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index - offset + 1)
      return { key: dateKey(date), day: date.getDate(), inMonth: date.getMonth() === month.getMonth() }
    })
  }, [month])

  const openForm = (day: string) => {
    if (canCreate) { setMessage(''); setSchedulingDate(day) }
  }

  const onSaved = (created: Training) => {
    setSchedulingDate(null)
    setItems(previous => [created, ...previous.filter(item => item.id !== created.id)])
    setMonth(new Date(`${created.fecha}T12:00:00`))
    setMessage(`Capacitación «${created.tema}» registrada correctamente.`)
  }

  return <div>
    <PageMeta title="Agendar citas | Viviendas León" description="Agenda y registro de capacitaciones" />
    <PageHeader title="Agendar citas" description="Selecciona una fecha para registrar una capacitación o consulta las actividades existentes."
      actions={canCreate ? <Button type="button" onClick={() => openForm(today)}><Plus size={16} /> Nueva capacitación</Button> : undefined} />
    {message && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{message}</p>}
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{canCreate ? 'Haz doble clic en una casilla o pulsa su número para crear una capacitación.' : 'Puedes consultar las capacitaciones registradas en el calendario.'} Pulsa una capacitación para ver sus datos.</p>
    <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
      <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-brand-500" /> Programada</span>
      <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /> Realizada</span>
    </div>
    <section className={card} aria-label="Calendario de capacitaciones">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 dark:border-gray-800 md:px-6">
        <div className="flex items-center gap-3"><CalendarDays size={20} className="text-brand-500" /><h2 className="font-semibold text-gray-900 dark:text-white">{months[month.getMonth()]} {month.getFullYear()}</h2></div>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))} aria-label="Mes anterior"><ChevronLeft size={16} /></Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hoy</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setMonth(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))} aria-label="Mes siguiente"><ChevronRight size={16} /></Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => { void refresh() }} aria-label="Actualizar capacitaciones" disabled={loading}><RefreshCw size={16} /></Button>
        </div>
      </header>
      <div className="overflow-x-auto"><div className="min-w-[560px]">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
          {weekdays.map(day => <span key={day} className="py-3">{day}</span>)}
        </div>
        <div className="grid grid-cols-7">{cells.map((cell, index) => {
          const events = byDate.get(cell.key) ?? []
          return <div key={cell.key} onDoubleClick={() => openForm(cell.key)}
            className={`min-h-28 border-b border-r border-gray-100 p-1.5 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 md:min-h-36 ${index % 7 === 0 ? 'border-l border-gray-100 dark:border-gray-800' : ''} ${!cell.inMonth ? 'bg-gray-50/70 dark:bg-gray-950/30' : ''}`}>
            {canCreate ? <button type="button" onClick={() => openForm(cell.key)} aria-label={`Registrar capacitación el ${cell.key}`}
              className={`mb-2 inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-brand-500 ${cell.key === today ? 'bg-brand-500 text-white' : cell.inMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>{cell.day}</button>
              : <span className={`mb-2 inline-flex size-7 items-center justify-center text-xs font-semibold ${cell.inMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400'}`}>{cell.day}</span>}
            <div className="space-y-1">{events.slice(0, 3).map(item => <button key={item.id} type="button"
              onClick={() => setSelected(item)} onDoubleClick={event => event.stopPropagation()}
              title={`Ver capacitación: ${item.tema}`}
              className={`block w-full truncate rounded-md border-l-[3px] px-1.5 py-1 text-left text-[11px] font-medium transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-brand-500 ${item.estado === 'REALIZADA' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200'}`}>{item.tema}</button>)}
              {events.length > 3 && <button type="button" onClick={() => setExpandedDay(cell.key)} onDoubleClick={event => event.stopPropagation()}
                className="w-full rounded border border-dashed border-gray-300 px-1.5 py-1 text-left text-xs font-medium text-brand-600 dark:border-gray-700 dark:text-brand-300">+{events.length - 3} más</button>}
            </div>
          </div>
        })}</div>
      </div></div>
      {loading && <p role="status" className="border-t border-gray-100 p-4 text-sm text-gray-500 dark:border-gray-800">Cargando capacitaciones…</p>}
      {!loading && items.length === 0 && !error && <p className="border-t border-gray-100 p-4 text-sm text-gray-500 dark:border-gray-800">Aún no hay capacitaciones registradas.</p>}
    </section>

    <ScheduleTrainingDialog date={schedulingDate} onClose={() => setSchedulingDate(null)} onSaved={onSaved} />
    <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.tema ?? 'Capacitación'}
      description={selected ? `${readableDate(selected.fecha)} · ${selected.estado === 'REALIZADA' ? 'Realizada' : 'Programada'}` : ''}
      actions={<>
        <Button type="button" variant="secondary" onClick={() => setSelected(null)}>Cerrar</Button>
        {selected && canCreate && <Link to={`/actividades/capacitaciones/registrar?capacitacion=${selected.id}`} className="inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600">Registrar asistencia</Link>}
      </>}>
      {selected && <dl className="space-y-3 text-sm">
        <div><dt className="font-semibold text-gray-800 dark:text-gray-200">Comunidad</dt><dd>{selected.comunidad?.nombre ?? 'Sin comunidad asignada'}</dd></div>
        <div><dt className="font-semibold text-gray-800 dark:text-gray-200">Horario</dt><dd>{selected.horaInicio ?? 'Sin horario'}{selected.horaFin ? ` – ${selected.horaFin}` : ''}</dd></div>
        <div><dt className="font-semibold text-gray-800 dark:text-gray-200">Facilitador</dt><dd>{selected.facilitadorNombre || 'No especificado'}</dd></div>
        <div><dt className="font-semibold text-gray-800 dark:text-gray-200">Descripción</dt><dd className="whitespace-pre-wrap">{selected.descripcion || 'Sin descripción'}</dd></div>
        <div><dt className="font-semibold text-gray-800 dark:text-gray-200">Observaciones</dt><dd className="whitespace-pre-wrap">{selected.observaciones || 'Sin observaciones'}</dd></div>
      </dl>}
    </Dialog>
    <Dialog open={Boolean(expandedDay)} onClose={() => setExpandedDay(null)} title="Capacitaciones del día"
      description={expandedDay ? readableDate(expandedDay) : ''}>
      <div className="space-y-2">{(expandedDay ? byDate.get(expandedDay) ?? [] : []).map(item => <button key={item.id} type="button"
        onClick={() => { setExpandedDay(null); setSelected(item) }}
        className="w-full rounded-lg border border-gray-200 p-3 text-left text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
        <span className="block font-semibold text-gray-900 dark:text-white">{item.tema}</span>
        <span className="text-gray-500">{item.estado === 'REALIZADA' ? 'Realizada' : 'Programada'} · {item.comunidad?.nombre ?? 'Sin comunidad'}</span>
      </button>)}</div>
    </Dialog>
  </div>
}
