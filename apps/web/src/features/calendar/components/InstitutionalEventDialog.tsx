import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import Dialog from '@/components/ui/Dialog'
import ReminderPicker from '@/features/notifications/components/ReminderPicker'
import Button from '@/components/ui/Button'
import { eventoHaPasado } from '../services/eventHistory'
import { todayInGuatemala } from '@/features/visits/services/visitService'
import RespuestasParticipantesEvento from './RespuestasParticipantesEvento'
import {
  eventTypes, eventDisplayTitle,
  type CalendarEvent, type CalendarEventInput, type CalendarPerson,
  type InstitutionalCategory,
} from '../services/calendarService'

const inputClass = 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200'
const initial = (date: string): CalendarEventInput => ({
  categoria: 'SOPORTE', titulo: 'Visita de soporte técnico',
  fechaInicio: date, descripcion: '', todoElDia: true, horaInicio: null, horaFin: null, participantesIds: [], recordatorios: [{ tipo: 'DIA_ANTES' }],
})
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const isSelectableType = (category: string) => eventTypes.some(item => item.id === category)

type Props = {
  open: boolean
  selected: CalendarEvent | null
  date: string
  users: CalendarPerson[]
  editable: boolean
  puedeConsultarRespuestas?: boolean
  onClose: () => void
  onSave: (input: CalendarEventInput, id?: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

export default function InstitutionalEventDialog({
  open, selected, date, users, editable, puedeConsultarRespuestas = false, onClose, onSave, onDelete,
}: Props) {
  const [data, setData] = useState<CalendarEventInput>(() => initial(date))
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setData(selected ? {
      // Eventos de categorías anteriores siguen siendo editables como «Otro».
      categoria: isSelectableType(selected.categoria) ? selected.categoria : 'OTRO',
      titulo: isSelectableType(selected.categoria) ? eventDisplayTitle(selected) : selected.titulo,
      fechaInicio: selected.fechaInicio,
      todoElDia: !selected.horaInicio || !selected.horaFin,
      horaInicio: selected.horaInicio, horaFin: selected.horaFin,
      descripcion: selected.descripcion,
      participantesIds: selected.participantes.map(person => person.id),
      recordatorios: selected.recordatorios === null ? [{ tipo: 'DIA_ANTES' }] : selected.recordatorios.filter(item => item.tipo !== 'PERSONALIZADO'),
    } : initial(date))
    setSearch('')
    setBusy(false)
    setError('')
    setConfirmDelete(false)
  }, [open, selected, date])

  const displayedUsers = useMemo(
    () => editable ? users : (selected?.participantes ?? []),
    [editable, users, selected],
  )
  const matches = useMemo(() => displayedUsers.filter(user =>
    normalize(`${user.nombre} ${user.cargos.join(' ')}`).includes(normalize(search)),
  ), [displayedUsers, search])
  const participantIds = users.map(user => user.id)
  const allSelected = participantIds.length > 0 && participantIds.every(id => data.participantesIds.includes(id))

  const updateType = (category: InstitutionalCategory) => {
    const predefined = eventTypes.find(item => item.id === category)
    setData(current => ({
      ...current,
      categoria: category,
      titulo: category === 'OTRO' ? (current.categoria === 'OTRO' ? current.titulo : '') : (predefined?.text ?? ''),
    }))
  }
  const updateParticipant = (id: number, checked: boolean) => {
    setData(current => ({
      ...current,
      participantesIds: checked
        ? Array.from(new Set([...current.participantesIds, id]))
        : current.participantesIds.filter(value => value !== id),
    }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!editable || (selected && eventoHaPasado(selected.fechaFin))) return
    const title = data.categoria === 'OTRO'
      ? data.titulo.trim()
      : (eventTypes.find(item => item.id === data.categoria)?.text ?? '')
    if (!title || title.length > 160) {
      setError('Escribe un nombre válido de hasta 160 caracteres para el evento.')
      return
    }
    if (!data.fechaInicio || data.fechaInicio < todayInGuatemala()) {
      setError('Selecciona una fecha a partir de hoy.')
      return
    }
    if (!data.todoElDia && (!data.horaInicio || !data.horaFin || data.horaInicio >= data.horaFin)) {
      setError('La hora de finalización debe ser posterior a la hora de inicio.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSave({ ...data, titulo: title }, selected?.id)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el evento.')
      setBusy(false)
    }
  }

  async function erase() {
    if (!selected || !editable || eventoHaPasado(selected.fechaFin)) return
    setBusy(true)
    setError('')
    try {
      await onDelete(selected.id)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el evento.')
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={selected ? (editable ? 'Editar evento' : 'Detalle del evento') : 'Crear evento'}
      onClose={onClose}
      className="max-w-2xl"
    >
      <form onSubmit={event => void submit(event)} className="space-y-5">
        {selected && eventoHaPasado(selected.fechaFin) && <p role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">Esta actividad ya finalizó.</p>}
        <div>
          <label htmlFor="institutional-event-type" className={labelClass}>Tipo de evento *</label>
          <select
            id="institutional-event-type"
            value={data.categoria}
            onChange={event => updateType(event.target.value as InstitutionalCategory)}
            disabled={!editable || busy}
            className={inputClass}
          >
            {eventTypes.map(type => <option key={type.id} value={type.id}>{type.text}</option>)}
          </select>
        </div>

        {data.categoria === 'OTRO' && (
          <div>
            <label htmlFor="institutional-custom-title" className={labelClass}>Nombre del evento *</label>
            <input
              id="institutional-custom-title"
              required
              maxLength={160}
              disabled={!editable || busy}
              value={data.titulo}
              onChange={event => setData(current => ({ ...current, titulo: event.target.value }))}
              className={inputClass}
              placeholder="Ej. Reunión con donantes"
            />
          </div>
        )}

        <div>
          <label htmlFor="institutional-event-date" className={labelClass}>Fecha *</label>
          <input
            id="institutional-event-date"
            type="date"
            min={todayInGuatemala()}
            required
            disabled={!editable || busy}
            className={inputClass}
            value={data.fechaInicio}
            onChange={event => setData(current => ({ ...current, fechaInicio: event.target.value }))}
          />
        </div>

        <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700" disabled={!editable || busy}>
          <legend className="px-1 text-sm font-semibold text-gray-800 dark:text-gray-100">Horario</legend>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            <input type="checkbox" checked={data.todoElDia} onChange={event => setData(current => ({ ...current,
              todoElDia: event.target.checked, horaInicio: event.target.checked ? null : '08:00', horaFin: event.target.checked ? null : '09:00',
            }))} className="size-4 accent-brand-500" /> Todo el día
          </label>
          {!data.todoElDia && <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>Desde
              <input type="time" required value={data.horaInicio ?? ''} onChange={event => setData(current => ({...current, horaInicio: event.target.value}))} className={`${inputClass} mt-1.5`} />
            </label>
            <label className={labelClass}>Hasta
              <input type="time" required min={data.horaInicio ?? undefined} value={data.horaFin ?? ''} onChange={event => setData(current => ({...current, horaFin: event.target.value}))} className={`${inputClass} mt-1.5`} />
            </label>
          </div>}
        </fieldset>

        <div>
          <label htmlFor="institutional-description" className={labelClass}>Descripción (opcional)</label>
          <textarea
            id="institutional-description"
            rows={3}
            maxLength={2000}
            disabled={!editable || busy}
            className={inputClass}
            value={data.descripcion}
            onChange={event => setData(current => ({ ...current, descripcion: event.target.value }))}
            placeholder="Detalles de la actividad"
          />
        </div>

        <fieldset className="rounded-xl border border-gray-200 p-4 dark:border-gray-700" disabled={!editable || busy}>
          <legend className="px-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
            Participantes ({data.participantesIds.length})
          </legend>
          {editable && <label className="mb-3 flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
            <input
              type="checkbox"
              className="size-4 accent-brand-500"
              checked={allSelected}
              onChange={event => setData(current => ({
                ...current,
                participantesIds: event.target.checked ? participantIds : [],
              }))}
              disabled={participantIds.length === 0}
            />
            Todos
          </label>}
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              aria-label="Buscar participantes por nombre o cargo"
              className={`${inputClass} pl-9`}
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Buscar por nombre o cargo..."
            />
          </div>
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-2 dark:bg-gray-800/50">
            {matches.map(person => (
              <label key={person.id} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-white dark:hover:bg-gray-800">
                <input
                  type="checkbox"
                  checked={data.participantesIds.includes(person.id)}
                  onChange={event => updateParticipant(person.id, event.target.checked)}
                  className="mt-1 size-4 accent-brand-500"
                />
                <span>
                  <span className="block text-gray-900 dark:text-gray-100">{person.nombre}</span>
                  <span className="text-xs text-gray-500">{person.cargos.join(', ') || 'Sin cargo'}</span>
                </span>
              </label>
            ))}
            {matches.length === 0 && <p className="p-2 text-sm text-gray-500">Sin coincidencias.</p>}
          </div>
        </fieldset>

        {selected && puedeConsultarRespuestas && <RespuestasParticipantesEvento eventoId={selected.id} />}

        <ReminderPicker disabled={!editable || busy} value={data.recordatorios} date={data.fechaInicio} onChange={recordatorios => setData(current => ({ ...current, recordatorios }))} />

        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
        <div className="flex flex-wrap justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <div>
            {selected && editable && (
              <Button type="button" variant="danger" disabled={busy} onClick={() => confirmDelete ? void erase() : setConfirmDelete(true)}>
                {confirmDelete ? 'Confirmar eliminación' : 'Eliminar evento'}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>Cerrar</Button>
            {editable && <Button type="submit" disabled={busy}>{busy ? 'Guardando...' : selected ? 'Guardar cambios' : 'Crear evento'}</Button>}
          </div>
        </div>
      </form>
    </Dialog>
  )
}
