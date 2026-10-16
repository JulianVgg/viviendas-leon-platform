import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { updateVisitFollowUp, type VisitFollowUp, type FollowUpStatus } from '@/features/visits/services/visitService'

const statuses: { id: FollowUpStatus; name: string }[] = [
  { id: 'PENDIENTE', name: 'Pendiente' }, { id: 'CUMPLIDO', name: 'Cumplido' }, { id: 'NO_CUMPLIDO', name: 'No cumplido' },
]
export default function FollowUpEditDialog({ item, onClose, onSaved }: { item: VisitFollowUp | null; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<FollowUpStatus>('PENDIENTE')
  const [text, setText] = useState('')
  const [due, setDue] = useState('')
  const [observation, setObservation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!item) return
    setStatus(item.status); setText(item.text); setDue(item.due ?? '')
    setObservation(item.observation ?? ''); setError('')
  }, [item])
  const save = async () => {
    if (!item || saving) return
    if (item.local) { setError('Primero sincroniza la visita de origen para editar este compromiso.'); return }
    setSaving(true); setError('')
    try {
      await updateVisitFollowUp(item.id, { status, text: text.trim(), due: due || null, observation })
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el compromiso.') }
    finally { setSaving(false) }
  }
  return <Dialog open={Boolean(item)} title="Editar seguimiento" description={item ? `${item.familyName} · ${item.community}` : ''}
    className="visit-followup-modal" onClose={onClose}
    actions={<><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button><Button type="button" onClick={() => void save()} disabled={saving || Boolean(item?.local) || !text.trim()}>{saving ? 'Guardando…' : 'Guardar cambios'}</Button></>}>
    {item && <div className="space-y-4">
      <FormField id="followup-text" label="Compromiso"><textarea id="followup-text" className={`${formControlClassName} min-h-24`} value={text} maxLength={500} onChange={e => setText(e.target.value)} /></FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="followup-status" label="Estado"><select id="followup-status" className={formControlClassName} value={status} onChange={e=>setStatus(e.target.value as FollowUpStatus)}>{statuses.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></FormField>
        <FormField id="followup-due" label="Fecha de seguimiento"><input id="followup-due" type="date" className={formControlClassName} value={due} onChange={e=>setDue(e.target.value)}/></FormField>
      </div>
      <FormField id="followup-observation" label="Observación de seguimiento"><textarea id="followup-observation" maxLength={2000} className={`${formControlClassName} min-h-20`} value={observation} onChange={e=>setObservation(e.target.value)} /></FormField>
      {item.local && <p className="text-sm text-amber-700 dark:text-amber-300">Este compromiso está guardado en el dispositivo. Para editarlo desde la agenda, primero debe sincronizarse.</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>}
  </Dialog>
}
