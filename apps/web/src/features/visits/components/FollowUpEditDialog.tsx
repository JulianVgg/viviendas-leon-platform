import { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { todayInGuatemala, updateVisitFollowUp, type VisitFollowUp, type FollowUpStatus } from '@/features/visits/services/visitService'

const statuses: { id: FollowUpStatus; name: string }[] = [
  { id: 'PENDIENTE', name: 'Pendiente' }, { id: 'CUMPLIDO', name: 'Cumplido' },
]
export default function FollowUpEditDialog({ item, onClose, onSaved, readOnly = false }: { item: VisitFollowUp | null; onClose: () => void; onSaved: () => void; readOnly?: boolean }) {
  const [status, setStatus] = useState<FollowUpStatus>('PENDIENTE')
  const [text, setText] = useState('')
  const [due, setDue] = useState('')
  const [observation, setObservation] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [reason, setReason] = useState('')
  const today = todayInGuatemala()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!item) return
    setStatus(item.status); setText(item.text); setDue(item.due ?? ''); setRescheduling(false); setReason('')
    setObservation(item.observation ?? ''); setError('')
  }, [item])
  const save = async () => {
    if (!item || saving || readOnly) return
    if (item.local) { setError('Primero sincroniza la visita de origen para editar este compromiso.'); return }
    if (rescheduling && (!due || due < today || due === item.due)) { setError('Selecciona una nueva fecha a partir de hoy, distinta de la actual.'); return }
    setSaving(true); setError('')
    try {
      await updateVisitFollowUp(item.id, { status: rescheduling ? 'PENDIENTE' : status, text: text.trim(), due: due || null, observation, reprogramar: rescheduling, reason })
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el compromiso.') }
    finally { setSaving(false) }
  }
  return <Dialog open={Boolean(item)} title={readOnly ? "Detalle del seguimiento" : "Editar seguimiento"} description={item ? `${item.familyName} · ${item.community}` : ''}
    className="visit-followup-modal" onClose={onClose}
    actions={<><Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>{!readOnly && <Button type="button" onClick={() => void save()} disabled={saving || Boolean(item?.local) || !text.trim()}>{saving ? 'Guardando…' : rescheduling ? 'Confirmar reprogramación' : 'Guardar cambios'}</Button>}</>}>
    {item && <div className="space-y-4">
      <FormField id="followup-text" label="Compromiso"><textarea id="followup-text" readOnly={readOnly} className={`${formControlClassName} min-h-24`} value={text} maxLength={500} onChange={e => setText(e.target.value)} /></FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="followup-status" label="Estado"><select id="followup-status" disabled={readOnly || rescheduling} className={formControlClassName} value={status} onChange={e=>setStatus(e.target.value as FollowUpStatus)}>{status === 'NO_CUMPLIDO' && <option value="NO_CUMPLIDO" disabled>No cumplido</option>}{statuses.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></FormField>
        {(!item.nextVisit || rescheduling) ? <FormField id="followup-due" label={rescheduling ? 'Nueva fecha' : 'Fecha de seguimiento'}><input id="followup-due" type="date" min={rescheduling ? today : undefined} disabled={readOnly || !rescheduling} className={formControlClassName} value={due} onChange={e=>setDue(e.target.value)}/></FormField> : <div className="flex items-end pb-2 text-sm text-gray-700 dark:text-gray-300"><span>Revisión: <strong>Próxima visita</strong></span></div>}
      </div>
      {!readOnly && status !== 'CUMPLIDO' && <button type="button" className="rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700 dark:text-brand-300" onClick={()=>{ setRescheduling(!rescheduling); setDue(item.due ?? ''); setError('') }}>{rescheduling ? 'Cancelar reprogramación' : 'Reprogramar compromiso'}</button>}
      {rescheduling && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
        <FormField id="followup-reason" label="Motivo (opcional)"><input id="followup-reason" maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} className={formControlClassName}/></FormField>
      </div>}
      {Boolean(item.reprogramaciones?.length) && <section className="rounded-lg border border-gray-200 p-3 text-xs dark:border-gray-700"><h4 className="mb-2 font-semibold">Reprogramaciones</h4>{item.reprogramaciones?.map(h=><p key={h.id} className="mb-1">{h.oldDate ?? 'Sin fecha'} → {h.newDate} · {new Date(h.at).toLocaleString('es-GT')}{h.reason ? ` · ${h.reason}` : ''}</p>)}</section>}
      <FormField id="followup-observation" label="Observación de seguimiento"><textarea id="followup-observation" readOnly={readOnly} maxLength={2000} className={`${formControlClassName} min-h-20`} value={observation} onChange={e=>setObservation(e.target.value)} /></FormField>
      {item.local && <p className="text-sm text-amber-700 dark:text-amber-300">Este compromiso está guardado en el dispositivo. Para editarlo desde la agenda, primero debe sincronizarse.</p>}
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>}
  </Dialog>
}
