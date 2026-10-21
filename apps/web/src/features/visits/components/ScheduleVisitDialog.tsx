import { useEffect, useMemo, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import SearchableSelect from '@/features/visits/components/SearchableSelect'
import { fetchFamilies, FamilyApiError } from '@/features/families/services/familyService'
import type { FamilyListItem } from '@/features/families/types/family'
import { getOfflineData, saveOfflineData } from '@/db/offlineDb'
import { saveVisitCapture, type VisitCapture, type VisitTimeSlot } from '@/features/visits/services/visitService'
import { useAuth } from '@/features/auth/AuthProvider'
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
  // Mostrar el nombre completo del responsable autenticado (no el nombre de su rol).
  const nombreResponsable = [usuario?.nombre?.trim(), usuario?.apellido?.trim()]
    .filter(Boolean)
    .join(' ')
  const [families, setFamilies] = useState<FamilyListItem[]>([])
  const [familyId, setFamilyId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [timeSlot, setTimeSlot] = useState<VisitTimeSlot>('MANANA')
  const [recordatorios, setRecordatorios] = useState<ConfigRecordatorios>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const selected = useMemo(() => families.find(f => String(f.id) === familyId), [families, familyId])

  useEffect(() => {
    if (!date || !usuario) return
    let mounted = true
    setScheduledDate(date)
    setFamilyId('')
    setTimeSlot('MANANA')
    setRecordatorios(null)
    setError('')
    setSuccess('')
    setLoading(true)
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

  const save = async () => {
    if (saving || !date) return
    if (!usuario) { setError('Inicia sesión para programar la visita. El rol simulado no sustituye la autenticación.'); return }
    if (!selected || !validDate(scheduledDate)) { setError('Selecciona una familia y una fecha válida.'); return }
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
      setSuccess('La visita está guardada en este dispositivo. Aparecerá como pendiente de sincronización hasta que el servidor la confirme.')
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo agendar la visita.') }
    finally { setSaving(false) }
  }

  return <Dialog open={Boolean(date)} onClose={onClose} title="Agendar próxima visita"
    description="Selecciona la familia, la fecha y el turno estimado." className="visit-followup-modal"
    actions={<><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
      <Button type="button" onClick={() => void save()} disabled={saving || loading || !selected || !usuario || Boolean(success)}>
        {saving ? 'Guardando…' : 'Agendar visita'}
      </Button></>}>
    <div className="space-y-4">
      <SearchableSelect id="schedule-family" label="Familia a visitar" required value={familyId} onChange={setFamilyId}
        disabled={loading || saving || Boolean(success)} placeholder={loading ? 'Cargando familias…' : 'Buscar familia o comunidad…'}
        options={families.map(f => ({ value: String(f.id), label: `${f.nombreReferencia} — ${f.comunidad.nombre}` }))}/>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="schedule-date" label="Fecha de visita" required>
          <input id="schedule-date" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} disabled={saving || Boolean(success)} className={formControlClassName}/>
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
        {usuario && <p className="mt-1 text-xs text-gray-500">Rol: {usuario.roles.join(', ') || 'Sin rol asignado'}</p>}
      </div>
      <ReminderPicker value={recordatorios} date={scheduledDate} onChange={setRecordatorios} disabled={saving || Boolean(success)} />
      {success && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{success}</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
    </div>
  </Dialog>
}
