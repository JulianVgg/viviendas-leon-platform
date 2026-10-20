import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Search } from 'lucide-react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { categories, type CalendarEvent, type CalendarEventInput, type CalendarPerson, type InstitutionalCategory } from '../services/calendarService'

const inputClass = 'min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200'
const isoToday = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}-${String(date.getDate()).padStart(2,'0')}` }
const starting = (date: string, currentUser: number): CalendarEventInput => ({ titulo:'', categoria:'OTRO', descripcion:'', lugar:'', fechaInicio:date || isoToday(), fechaFin:date || isoToday(), horaInicio:null, horaFin:null, responsableId:currentUser, participantesIds:[] })
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

type Props = { open: boolean; selected: CalendarEvent | null; date: string; users: CalendarPerson[]; currentUserId: number; editable: boolean; onClose: () => void; onSave: (input: CalendarEventInput, id?: number) => Promise<void>; onDelete: (id: number) => Promise<void> }
export default function InstitutionalEventDialog({ open, selected, date, users, currentUserId, editable, onClose, onSave, onDelete }: Props) {
  const [data, setData] = useState<CalendarEventInput>(() => starting(date, currentUserId))
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  useEffect(() => {
    if (!open) return
    setData(selected ? {
      titulo:selected.titulo, categoria:selected.categoria, descripcion:selected.descripcion, lugar:selected.lugar,
      fechaInicio:selected.fechaInicio, fechaFin:selected.fechaFin, horaInicio:selected.horaInicio, horaFin:selected.horaFin,
      responsableId:selected.responsable.id, participantesIds:selected.participantes.map(p => p.id),
    } : starting(date, currentUserId))
    setError(''); setFilter(''); setBusy(false); setConfirmDelete(false)
  }, [open, selected, date, currentUserId])
  const matched = useMemo(() => users.filter(user => normalize(`${user.nombre} ${user.cargos.join(' ')}`).includes(normalize(filter))).slice(0, 100), [users, filter])
  const patch = <K extends keyof CalendarEventInput>(key: K, value: CalendarEventInput[K]) => setData(prev => ({ ...prev, [key]: value }))
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!data.titulo.trim()) { setError('Escribe un título para el evento.'); return }
    if (data.fechaFin < data.fechaInicio) { setError('La fecha final no puede ser anterior a la inicial.'); return }
    if (!data.responsableId) { setError('Selecciona una persona responsable.'); return }
    if ((data.horaInicio && !data.horaFin) || (!data.horaInicio && data.horaFin) || (data.horaInicio && data.horaFin && data.horaInicio >= data.horaFin)) { setError('Comprueba el horario estimado.'); return }
    setBusy(true);setError('')
    try { await onSave(data, selected?.id); onClose() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar.'); setBusy(false) }
  }
  async function erase() {
    if (!selected) return
    setBusy(true);setError('')
    try { await onDelete(selected.id); onClose() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo eliminar.'); setBusy(false) }
  }
  return <Dialog open={open} title={selected ? (editable ? 'Editar evento institucional' : 'Detalle del evento') : 'Nuevo evento institucional'} description="Actividades generales de Viviendas León · independiente de las visitas técnicas" onClose={onClose} className="max-w-2xl">
    <form onSubmit={submit} className="space-y-5">
      <div><label htmlFor="institutional-title" className={labelClass}>Nombre del evento *</label><input id="institutional-title" required maxLength={160} disabled={!editable || busy} className={inputClass} value={data.titulo} onChange={e=>patch('titulo',e.target.value)} placeholder="Ej. Entrega de pilones, Oficina Panajachel" /></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><label htmlFor="institutional-category" className={labelClass}>Categoría</label><select id="institutional-category" disabled={!editable || busy} className={inputClass} value={data.categoria} onChange={e=>patch('categoria',e.target.value as InstitutionalCategory)}>{categories.map(c=><option key={c.id} value={c.id}>{c.text}</option>)}</select></div>
        <div><label htmlFor="institutional-place" className={labelClass}>Lugar (opcional)</label><input id="institutional-place" disabled={!editable || busy} maxLength={180} className={inputClass} value={data.lugar} onChange={e=>patch('lugar',e.target.value)} placeholder="Oficina, comunidad..." /></div>
        <div><label htmlFor="institutional-start" className={labelClass}>Fecha de inicio *</label><input id="institutional-start" type="date" required disabled={!editable || busy} className={inputClass} value={data.fechaInicio} onChange={e=>setData(prev=>({...prev,fechaInicio:e.target.value, fechaFin:prev.fechaFin < e.target.value ? e.target.value : prev.fechaFin}))}/></div>
        <div><label htmlFor="institutional-end" className={labelClass}>Fecha de finalización *</label><input id="institutional-end" type="date" required min={data.fechaInicio} disabled={!editable || busy} className={inputClass} value={data.fechaFin} onChange={e=>patch('fechaFin',e.target.value)}/></div>
        <div><label htmlFor="institutional-hour-start" className={labelClass}>Hora inicio (opcional)</label><input id="institutional-hour-start" type="time" disabled={!editable || busy} className={inputClass} value={data.horaInicio ?? ''} onChange={e=>patch('horaInicio',e.target.value || null)}/></div>
        <div><label htmlFor="institutional-hour-end" className={labelClass}>Hora final (opcional)</label><input id="institutional-hour-end" type="time" disabled={!editable || busy} className={inputClass} value={data.horaFin ?? ''} onChange={e=>patch('horaFin',e.target.value || null)}/></div>
      </div>
      <div><label htmlFor="institutional-responsible" className={labelClass}>Responsable *</label><select id="institutional-responsible" disabled={!editable || busy} required className={inputClass} value={data.responsableId || ''} onChange={e=>patch('responsableId',Number(e.target.value))}>{!users.some(u=>u.id===data.responsableId) && selected && <option value={data.responsableId}>{selected.responsable.nombre}</option>}{users.map(u=><option key={u.id} value={u.id}>{u.nombre} — {u.cargos.join(', ') || 'Sin cargo'}</option>)}</select></div>
      <div><label htmlFor="institutional-description" className={labelClass}>Descripción / indicaciones</label><textarea id="institutional-description" rows={3} maxLength={2000} disabled={!editable || busy} className={inputClass} value={data.descripcion} onChange={e=>patch('descripcion',e.target.value)} placeholder="Objetivo, detalles y observaciones de la actividad" /></div>
      <fieldset className="rounded-xl border border-gray-200 p-4 dark:border-gray-700" disabled={!editable || busy}>
        <legend className="px-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Participantes ({data.participantesIds.length})</legend>
        <p className="mb-3 text-xs text-gray-500">Usuarios de la organización. Los cargos se obtienen de su cuenta. Seleccionar asistentes no envía invitaciones todavía.</p>
        <div className="relative mb-3"><Search size={16} className="absolute left-3 top-3.5 text-gray-400"/><input aria-label="Buscar participantes por nombre o cargo" className={`${inputClass} pl-9`} value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar por nombre o cargo..." /></div>
        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-2 dark:bg-gray-800/50">{matched.map(u=><label key={u.id} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-white dark:hover:bg-gray-800"><input type="checkbox" checked={data.participantesIds.includes(u.id)} onChange={e=>patch('participantesIds',e.target.checked ? [...data.participantesIds, u.id] : data.participantesIds.filter(id=>id!==u.id))} className="mt-1 accent-brand-500"/><span><span className="block text-gray-900 dark:text-gray-100">{u.nombre}</span><span className="text-xs text-gray-500">{u.cargos.join(', ') || 'Sin cargo'}</span></span></label>)}{!matched.length && <p className="p-2 text-sm text-gray-500">Sin coincidencias.</p>}</div>
      </fieldset>
      {selected && <p className="text-xs text-gray-500">Creado originalmente por: {selected.creadoPor}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
      <div className="flex flex-wrap justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div>{selected && editable && <Button type="button" variant="danger" disabled={busy} onClick={()=>confirmDelete ? void erase() : setConfirmDelete(true)}>{confirmDelete ? 'Confirmar eliminación' : 'Eliminar evento'}</Button>}</div>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cerrar</Button>{editable && <Button type="submit" disabled={busy}>{busy ? 'Guardando...' : selected ? 'Guardar cambios' : 'Crear evento'}</Button>}</div>
      </div>
      {confirmDelete && <p role="alert" className="text-sm text-red-700 dark:text-red-300">Eliminará este evento y sus asignaciones de participantes. Pulsa «Confirmar eliminación» para continuar.</p>}
    </form>
  </Dialog>
}
