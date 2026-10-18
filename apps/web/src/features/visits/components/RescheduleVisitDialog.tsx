import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { rescheduleVisit, type VisitListItem } from '@/features/visits/services/visitService'

export default function RescheduleVisitDialog({ visit, onClose, onSaved }: { visit: VisitListItem | null; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setDate(visit?.date ?? ''); setError('') }, [visit])
  const save = async () => {
    if (!visit || !visit.id || saving) return
    setSaving(true); setError('')
    try { await rescheduleVisit(visit.id, date); onSaved() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo reprogramar la visita.') }
    finally { setSaving(false) }
  }
  return <Dialog open={Boolean(visit)} onClose={onClose} title="Reprogramar visita"
    description={visit ? `${visit.familyName} · ${visit.community}` : ''} className="visit-followup-modal"
    actions={<><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
      <Button type="button" disabled={saving || !date || !visit?.id} onClick={()=>void save()}>{saving?'Guardando…':'Guardar fecha'}</Button></>}>
    <div className="space-y-4">
      <FormField id="reschedule-date" label="Nueva fecha"><input id="reschedule-date" className={formControlClassName} type="date" value={date} onChange={e=>setDate(e.target.value)}/></FormField>
      <p className="text-sm text-gray-500">La reprogramación se guarda en el servidor y requiere conexión. Solo se pueden cambiar visitas programadas.</p>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  </Dialog>
}
