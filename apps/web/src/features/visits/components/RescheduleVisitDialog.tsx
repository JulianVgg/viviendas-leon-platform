import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { rescheduleVisit, todayInGuatemala, type VisitListItem } from '@/features/visits/services/visitService'

export default function RescheduleVisitDialog({ visit, onClose, onSaved }: { visit: VisitListItem | null; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const today = todayInGuatemala()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setDate(visit && visit.date >= todayInGuatemala() ? visit.date : todayInGuatemala()); setReason(''); setError('') }, [visit])
  const save = async () => {
    if (!visit || !visit.id || saving) return
    if (date < today) { setError('La nueva fecha no puede ser anterior a hoy.'); return }
    setSaving(true); setError('')
    try { await rescheduleVisit(visit.id, date, reason); onSaved() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo reprogramar la visita.') }
    finally { setSaving(false) }
  }
  return <Dialog open={Boolean(visit)} onClose={onClose} title="Reprogramar visita"
    description={visit ? `${visit.familyName} · ${visit.community}` : ''} className="visit-followup-modal"
    actions={<><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
      <Button type="button" disabled={saving || !date || date < today || !visit?.id || date === visit.date} onClick={()=>void save()}>{saving?'Guardando…':'Guardar fecha'}</Button></>}>
    <div className="space-y-4">
      <FormField id="reschedule-date" label="Nueva fecha"><input id="reschedule-date" className={formControlClassName} type="date" min={today} value={date} onChange={e=>setDate(e.target.value)}/></FormField>
      {visit && visit.date < today && <p className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">Visita vencida · {visit.date}</p>}
      <FormField id="reschedule-reason" label="Motivo (opcional)"><textarea id="reschedule-reason" value={reason} maxLength={500} onChange={e=>setReason(e.target.value)} className={`${formControlClassName} min-h-20`} placeholder="Ej. No se pudo visitar por lluvia" /></FormField>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  </Dialog>
}
