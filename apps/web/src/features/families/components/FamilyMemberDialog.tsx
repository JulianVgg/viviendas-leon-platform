import { useMemo, useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { createFamilyMember, FamilyApiError, updateFamilyMember } from '../services/familyService'
import { memberRelationshipOptions, memberSexOptions } from '../services/familyWizard'
import type { FamilyMemberRecord } from '../types/familyIntegral'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { buildMemberCreate, buildMemberUpdate, memberDraftFrom, validateMemberDraft, type MemberEditDraft, type MemberEditErrors } from '../services/familyManagement'

export default function FamilyMemberDialog({ familyId, member, onClose, onSaved }: {
  familyId: number
  member?: FamilyMemberRecord
  onClose: () => void
  onSaved: (member: FamilyMemberRecord) => void
}) {
  const initial = useMemo(() => memberDraftFrom(member), [member])
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<MemberEditErrors>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const [uncertain, setUncertain] = useState(false)
  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const isOnline = useOnlineStatus()
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial)

  function close() {
    if (!dirty || window.confirm('¿Cerrar el formulario y descartar el borrador?')) onClose()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving || uncertain) return
    if (!isOnline) { setError('Se requiere conexión con el servidor. El borrador permanece únicamente en memoria.'); return }
    const nextErrors = validateMemberDraft(draft, !member)
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return }
    setSaving(true); setError(undefined)
    try {
      let saved: FamilyMemberRecord
      if (member) {
        const changes = buildMemberUpdate(member, draft, initial)
        if (Object.keys(changes).length === 1) { onClose(); return }
        saved = await updateFamilyMember(familyId, member.id, changes)
      } else {
        saved = await createFamilyMember(familyId, buildMemberCreate(draft), idempotencyKey)
      }
      onSaved(saved)
    } catch (cause) {
      if (cause instanceof FamilyApiError) {
        setErrors(Object.fromEntries(cause.details.map(({ field, message }) => [field, message])) as MemberEditErrors)
        setError(cause.status === 409 ? cause.message : cause.message || 'Revisa los datos del integrante.')
      } else {
        setError(member ? 'No fue posible guardar los cambios.' : 'La respuesta de la creación es incierta. Verifica el expediente antes de volver a intentarlo.')
        if (!member) setUncertain(true)
      }
    } finally { setSaving(false) }
  }

  const field = (key: keyof MemberEditDraft, label: string, options?: readonly string[]) => <FormField id={`member-${key}`} label={label} required={!member && ['nombreCompleto', 'fechaNacimiento', 'sexo', 'parentesco'].includes(key)} error={errors[key]}>
    {options ? <select id={`member-${key}`} className={formControlClassName} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}><option value="">Sin dato registrado</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input id={`member-${key}`} type={key === 'fechaNacimiento' ? 'date' : key === 'telefono' ? 'tel' : 'text'} className={formControlClassName} value={draft[key]} maxLength={key === 'nombreCompleto' ? 150 : key === 'telefono' ? 30 : undefined} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />}
  </FormField>

  return <Dialog open title={member ? 'Editar integrante' : 'Agregar integrante'} description={member ? 'Los datos reales se muestran precargados. Los campos no modificados se conservarán.' : 'La persona quedará asociada únicamente a este expediente.'} onClose={close} className="max-w-2xl" actions={<><Button type="button" variant="secondary" disabled={saving} onClick={close}>Cancelar</Button><Button type="submit" form="member-form" disabled={saving || uncertain || !isOnline}>{saving && <LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" />}{saving ? 'Guardando...' : member ? 'Guardar cambios' : 'Agregar integrante'}</Button></>}>
    <form id="member-form" noValidate onSubmit={submit} className="space-y-5">
      {!isOnline && <Alert variant="warning" title="Sin conexión">No se enviará ninguna escritura. El borrador se conserva mientras este modal permanezca abierto.</Alert>}
      {error && <Alert variant="error" title="No se pudo completar la operación"><p>{error}</p>{uncertain && <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => window.location.reload()}>Recargar y verificar expediente</Button>}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">{field('nombreCompleto', 'Nombre completo')}{field('fechaNacimiento', 'Fecha de nacimiento')}{field('sexo', 'Sexo', memberSexOptions)}{field('parentesco', 'Parentesco', memberRelationshipOptions)}{field('telefono', 'Teléfono')}</div>
      <FormField id="member-observaciones" label="Observaciones" error={errors.observaciones} hint="Máximo 2000 caracteres."><textarea id="member-observaciones" className={`${formControlClassName} h-auto`} rows={4} maxLength={2000} value={draft.observaciones} onChange={(event) => setDraft({ ...draft, observaciones: event.target.value })} /></FormField>
    </form>
  </Dialog>
}
