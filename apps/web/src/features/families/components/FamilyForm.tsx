import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Form, FormActions, FormGrid, FormSection } from '@/components/forms'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { FamilyApiError } from '@/features/families/services/familyService'
import type { CommunityOption, FamilyCreateInput, FamilyDetail } from '@/features/families/types/family'

type FamilyFormProps = {
  communities: CommunityOption[]
  onSave: (input: FamilyCreateInput) => Promise<FamilyDetail>
  onCreated: (family: FamilyDetail) => void
  onCancel: () => void
}

export default function FamilyForm({ communities, onSave, onCreated, onCancel }: FamilyFormProps) {
  const [referenceName, setReferenceName] = useState('')
  const [communityId, setCommunityId] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [observations, setObservations] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const submitting = useRef(false)

  function focusField(field: string) {
    document.getElementById(`family-${field}`)?.focus()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const nextErrors: Record<string, string> = {}
    if (!referenceName.trim() || referenceName.trim().length > 150) nextErrors.nombreReferencia = 'Introduce un nombre de hasta 150 caracteres.'
    if (!communities.some((community) => community.id === Number(communityId))) nextErrors.comunidadId = 'Selecciona una comunidad disponible.'
    if (observations.trim().length > 2000) nextErrors.observaciones = 'Las observaciones admiten hasta 2000 caracteres.'
    if (entryDate) {
      const parsed = new Date(`${entryDate}T00:00:00.000Z`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate) || entryDate.startsWith('0000') || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== entryDate) {
        nextErrors.fechaIngreso = 'Introduce una fecha existente en formato YYYY-MM-DD.'
      }
    }
    setErrors(nextErrors)
    setGeneralError(undefined)
    if (Object.keys(nextErrors).length) {
      focusField(Object.keys(nextErrors)[0])
      return
    }
    submitting.current = true
    setSaving(true)
    let created: FamilyDetail | undefined
    try {
      created = await onSave({
        nombreReferencia: referenceName.trim(), comunidadId: Number(communityId),
        ...(entryDate && { fechaIngreso: entryDate }),
        ...(observations.trim() && { observaciones: observations.trim() }),
      })
    } catch (cause) {
      const details = cause instanceof FamilyApiError ? cause.details : []
      setErrors(Object.fromEntries(details.map(({ field, message }) => [field, message])))
      setGeneralError(cause instanceof Error ? cause.message : 'No fue posible guardar la familia.')
    } finally {
      submitting.current = false
      setSaving(false)
    }
    if (created) onCreated(created)
  }

  function fieldAttributes(field: string) {
    return { id: `family-${field}`, 'aria-invalid': Boolean(errors[field]), 'aria-describedby': errors[field] ? `family-${field}-error` : undefined }
  }

  return <Form mode="create" status={saving ? 'saving' : generalError ? 'error' : 'idle'} generalError={generalError} onSubmit={handleSubmit} noValidate
    actions={<FormActions submitting={saving} disabled={!communities.length} onCancel={onCancel} />}>
    <FormSection title="Datos de la familia" description="Los campos con asterisco son obligatorios. La familia se registrará como activa." variant="card">
      <FormGrid>
        <FormField id="family-nombreReferencia" label="Nombre de referencia" required error={errors.nombreReferencia}>
          <input {...fieldAttributes('nombreReferencia')} className={formControlClassName} required aria-required="true" maxLength={150} value={referenceName} onChange={(event) => setReferenceName(event.target.value)} />
        </FormField>
        <FormField id="family-comunidadId" label="Comunidad" required error={errors.comunidadId}>
          <select {...fieldAttributes('comunidadId')} className={formControlClassName} required aria-required="true" value={communityId} onChange={(event) => setCommunityId(event.target.value)}>
            <option value="">Selecciona una comunidad</option>
            {communities.map((community) => <option key={community.id} value={community.id}>{community.nombre} — {community.municipio.nombre}</option>)}
          </select>
        </FormField>
        <FormField id="family-fechaIngreso" label="Fecha de ingreso" error={errors.fechaIngreso}>
          <input {...fieldAttributes('fechaIngreso')} type="date" className={formControlClassName} value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
        </FormField>
      </FormGrid>
      <div className="mt-4">
        <FormField id="family-observaciones" label="Observaciones" error={errors.observaciones} hint="Máximo 2000 caracteres.">
          <textarea {...fieldAttributes('observaciones')} className={`${formControlClassName} h-auto min-h-28 py-2`} rows={4} maxLength={2000} value={observations} onChange={(event) => setObservations(event.target.value)} />
        </FormField>
      </div>
    </FormSection>
  </Form>
}
