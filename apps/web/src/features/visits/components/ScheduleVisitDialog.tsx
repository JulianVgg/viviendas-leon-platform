import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import SearchableSelect from '@/features/visits/components/SearchableSelect'
import { fetchFamilies, FamilyApiError } from '@/features/families/services/familyService'
import type { FamilyListItem } from '@/features/families/types/family'
import { getOfflineData, saveOfflineData } from '@/db/offlineDb'
import { saveVisitCapture, todayInGuatemala, type VisitCapture, type VisitTimeSlot } from '@/features/visits/services/visitService'
import { useAuth } from '@/features/auth/AuthProvider'
import { DIAS_CICLO_VISITA, getVisitPlanning, suggestedNextVisit, visitsSameCycle, type FamilyVisitPlanning } from '@/features/visits/services/visitPlanning'
import ReminderPicker from '@/features/notifications/components/ReminderPicker'
import type { ConfigRecordatorios } from '@/features/notifications/services/remindersService'

const validDate = (text: string) => /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(`${text}T12:00:00Z`)) && new Date(`${text}T12:00:00Z`).toISOString().slice(0, 10) === text

/** Una cita en agenda no es una visita realizada: se registra como PROGRAMADA. */
export default function ScheduleVisitDialog({ date, onClose, onSaved }: {
  date: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const { usuario } = useAuth()
  const dateInputRef = useRef<HTMLInputElement>(null)
  // Mostrar el nombre completo del responsable autenticado (no el nombre de su rol).
  const nombreResponsable = [usuario?.nombre?.trim(), usuario?.apellido?.trim()]
    .filter(Boolean)
    .join(' ')
  const [families, setFamilies] = useState<FamilyListItem[]>([])
  const [familyId, setFamilyId] = useState('')
  const [planning, setPlanning] = useState<FamilyVisitPlanning[]>([])
  const [planningLoading, setPlanningLoading] = useState(false)
  const [planningLocal, setPlanningLocal] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [timeSlot, setTimeSlot] = useState<VisitTimeSlot>('MANANA')
  const [recordatorios, setRecordatorios] = useState<ConfigRecordatorios>([{ tipo: 'DIA_ANTES' }])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const selected = useMemo(() => families.find(f => String(f.id) === familyId), [families, familyId])
  const coverage = useMemo(() => planning.find(item => String(item.familyId) === familyId), [planning, familyId])
  const pending = coverage?.scheduled ?? []
  const canMovePending = pending.some(v => v.responsibleUserId === usuario?.id) || Boolean(usuario?.roles.some(role => ['direccion general', 'coordinadora del programa agroforestal'].includes(role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase())))
  const proposed = suggestedNextVisit(coverage?.lastCompleted ?? null, pending.map(v => v.date))
  const overdue = pending.some(v => v.date < todayInGuatemala())
  const overlapping = pending.some(v => visitsSameCycle(v.date, scheduledDate))
  const blocked = overdue || overlapping
  const proposedDate = proposed ?? ''
  const canChooseProposed = validDate(proposedDate) && proposedDate >= todayInGuatemala()
    && !overdue && !pending.some(visit => visitsSameCycle(visit.date, proposedDate))

  useEffect(() => {
    if (!date || !usuario) return
    let mounted = true
    setScheduledDate(date)
    setFamilyId('')
    setTimeSlot('MANANA')
    setRecordatorios([{ tipo: 'DIA_ANTES' }])
    setError('')
    setSuccess('')
    setLoading(true)
    setPlanningLoading(true)
    getVisitPlanning(usuario.id).then(result => { if (mounted) { setPlanning(result.rows); setPlanningLocal(result.local) } })
      .catch(() => { if (mounted) { setPlanning([]); setPlanningLocal(true) } })
      .finally(() => { if (mounted) setPlanningLoading(false) })
    const key = `visits:family-options:v1:user:${usuario.id}`
    const controller = new AbortController()
    fetchFamilies({ limit: 100, page: 1 }, controller.signal)
      .then(result => { if (!mounted) return; setFamilies(result.data); void saveOfflineData(key, result.data).catch(() => {}) })
      .catch(async cause => {
        if (!mounted || controller.signal.aborted) return
        if (cause instanceof FamilyApiError && [401, 403].includes(cause.status)) {
          setError('Sesión no autorizada. Inicia sesión para agendar visitas.'); return
        }
        try {
          const cached = await getOfflineData<FamilyListItem[]>(key)
          if (!mounted) return
          if (cached?.data.length) setFamilies(cached.data)
          else setError('No se pudieron cargar las familias. Verifica la conexión con la API.')
        } catch { if (mounted) setError('No se pudieron cargar las familias.') }
      }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false; controller.abort() }
  }, [date, usuario])

  const chooseProposed = () => {
    if (!proposed || !canChooseProposed) return
    setScheduledDate(proposed)
    setError('')
    dateInputRef.current?.focus()
  }

  const save = async () => {
    if (saving || !date) return
    if (!usuario) { setError('Inicia sesión para programar la visita. El rol simulado no sustituye la autenticación.'); return }
    if (scheduledDate < todayInGuatemala()) { setError('No puedes programar visitas en fechas pasadas. Usa Reprogramar para citas anteriores.'); return }
    if (!selected || !validDate(scheduledDate)) { setError('Selecciona una familia y una fecha válida.'); return }
    if (planningLoading) { setError('Verificando la agenda familiar.'); return }
    if (blocked) { setError('Ya existe una visita en este período o una visita vencida. Revisa la agenda.'); return }
    const payload: VisitCapture = {
      familyId: selected.id, date: scheduledDate, status: 'PROGRAMADA', timeSlot, recordatorios,
      weather: '', checkIn: '', crops: [], recommendation: '', treatment: '', observations: '',
      commitments: [], reviews: [],
    }
    setSaving(true); setError(''); setSuccess('')
    try {
      const result = await saveVisitCapture(usuario.id, selected.nombreReferencia, selected.comunidad.nombre, payload)
      if (result.status === 'synced') { onSaved(); return }
      // Persistida en IndexedDB, pero no confirmada por el servidor.
      setSuccess('Pendiente de sincronización.')
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo agendar la visita.') }
    finally { setSaving(false) }
  }

  return <Dialog open={Boolean(date)} onClose={onClose} title="Agendar visita"
    className="visit-followup-modal"
    actions={<><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
      <Button type="button" onClick={() => void save()} disabled={saving || loading || planningLoading || blocked || !selected || !usuario || Boolean(success) || !validDate(scheduledDate) || scheduledDate < todayInGuatemala()}>
        {saving ? 'Guardando…' : 'Agendar visita'}
      </Button></>}>
    <div className="space-y-4">
      <SearchableSelect id="schedule-family" label="Familia a visitar" required value={familyId} onChange={setFamilyId}
        disabled={loading || saving || Boolean(success)} placeholder={loading ? 'Cargando familias…' : 'Buscar familia o comunidad…'}
        options={families.map(f => {
          const info = planning.find(v => v.familyId === f.id)
          return { value: String(f.id), label: `${f.nombreReferencia} — ${f.comunidad.nombre}${info?.scheduled.some(v => visitsSameCycle(v.date, scheduledDate)) ? ' · Con visita' : ''}` }
        })}/>
      {selected && <div className={`rounded-lg border p-3 text-sm ${blocked ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-200' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">Cobertura · {DIAS_CICLO_VISITA} días</span>
          {planningLocal && <span className="text-xs">Datos locales</span>}
        </div>
        {planningLoading ? <p className="mt-1">Consultando agenda…</p> : <>
          {coverage?.lastCompleted && <p className="mt-1">Última visita: {coverage.lastCompleted}</p>}
          {proposed && <div className="mt-1 flex flex-wrap items-center gap-2">
            <span>Próxima sugerida: <strong>{proposed}</strong></span>
            {canChooseProposed && (proposed === scheduledDate
              ? <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Seleccionada</span>
              : <button type="button" onClick={chooseProposed} disabled={saving || Boolean(success)}
                  aria-controls="schedule-date"
                  className="rounded-md border border-brand-400 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-50 dark:border-brand-500 dark:text-brand-300 dark:hover:bg-brand-500/10">Seleccionar fecha</button>)}
          </div>}
          {pending.length ? <div className="mt-2 space-y-1">
            {pending.map(v => <p key={v.id}>{v.date} · {v.responsibleName}{visitsSameCycle(v.date, scheduledDate) ? ' · Ciclo cubierto' : ''}{v.date < todayInGuatemala() ? ' · Vencida' : ''}</p>)}
            {canMovePending && <Link className="inline-block font-semibold text-brand-700 underline dark:text-brand-300" to="/visitas/agenda" onClick={onClose}>Reprogramar visita</Link>}
          </div> : <p className="mt-1 text-gray-600 dark:text-gray-300">{proposed && proposed <= todayInGuatemala() ? 'Por programar' : 'Sin visita asignada'}</p>}
        </>}
      </div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="schedule-date" label="Fecha de visita" required>
          <input ref={dateInputRef} id="schedule-date" type="date" min={todayInGuatemala()} value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} disabled={saving || Boolean(success)} className={formControlClassName}/>
        </FormField>
        <FormField id="schedule-shift" label="Horario estimado" required>
          <select id="schedule-shift" value={timeSlot} onChange={e => setTimeSlot(e.target.value as VisitTimeSlot)} disabled={saving || Boolean(success)} className={formControlClassName}>
            <option value="MANANA">Mañana</option><option value="TARDE">Tarde</option>
          </select>
        </FormField>
      </div>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/40">
        <p className="font-medium text-gray-800 dark:text-gray-200">Responsable</p>
        <p className="mt-1 font-medium text-gray-800 dark:text-gray-100">{nombreResponsable || 'No hay una sesión autenticada'}</p>
      </div>
      <ReminderPicker value={recordatorios} date={scheduledDate} onChange={setRecordatorios} disabled={saving || Boolean(success)} />
      {success && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{success}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
    </div>
  </Dialog>
}
