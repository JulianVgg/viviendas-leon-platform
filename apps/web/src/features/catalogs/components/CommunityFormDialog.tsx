import { useEffect, useState, type FormEvent } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import Alert from '@/components/ui/Alert'
import type { AdminCommunity, CommunityFormData, MunicipalityOption } from '../types/community'
import { CommunitiesApiError, createCommunity, editCommunity } from '../services/communitiesService'

type Props = {
  open: boolean
  community: AdminCommunity | null
  municipalities: MunicipalityOption[]
  onClose: () => void
  onSaved: (community: AdminCommunity) => void
}

export default function CommunityFormDialog({ open, community, municipalities, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [municipalityId, setMunicipalityId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setName(community?.nombre ?? '')
    setMunicipalityId(community ? String(community.municipio.id) : '')
    setError('')
    setErrors({})
  }, [open, community])

  function close() {
    if (saving) return
    onClose()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const nombre = name.normalize('NFC').trim().replace(/\s+/g, ' ')
    const municipioId = Number(municipalityId)
    const nextErrors: Record<string, string> = {}
    if (!nombre || nombre.length > 120) nextErrors.nombre = 'Ingresa un nombre de máximo 120 caracteres.'
    if (!municipalityId || !Number.isSafeInteger(municipioId) || !municipalities.some((m) => m.id === municipioId)) {
      nextErrors.municipioId = 'Selecciona un municipio activo.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    const input: CommunityFormData = { nombre, municipioId }
    setSaving(true)
    setError('')
    try {
      const result = community ? await editCommunity(community.id, input) : await createCommunity(input)
      onSaved(result)
    } catch (cause) {
      if (cause instanceof CommunitiesApiError) {
        setError(cause.message)
        setErrors(Object.fromEntries(cause.details.map(({ field, message }) => [field, message])))
      } else setError('No fue posible confirmar el guardado. Comprueba el listado antes de volver a intentarlo.')
    } finally { setSaving(false) }
  }

  return <Dialog open={open} onClose={close} title={community ? 'Editar comunidad' : 'Nueva comunidad'} description="Los datos se utilizarán en el expediente de familias y las actividades institucionales.">
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      {error && <Alert variant="error" title="No se pudo guardar">{error}</Alert>}
      <FormField id="community-name" label="Nombre de la comunidad" required error={errors.nombre}>
        <input className={formControlClassName} id="community-name" value={name} maxLength={120} required autoFocus onChange={(e) => setName(e.target.value)} placeholder="Ej. Los Planes" />
      </FormField>
      <FormField id="community-municipality" label="Municipio" required error={errors.municipioId}>
        <select id="community-municipality" className={formControlClassName} value={municipalityId} required onChange={(e) => setMunicipalityId(e.target.value)}>
          <option value="">Selecciona un municipio</option>
          {municipalities.map((option) => <option key={option.id} value={option.id}>{option.nombre}</option>)}
        </select>
      </FormField>
      {community && !community.municipio.activo && <Alert variant="warning" title="Municipio inactivo">Selecciona un municipio activo antes de guardar cambios.</Alert>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
        <Button type="button" variant="secondary" disabled={saving} onClick={close}>Cancelar</Button>
        <Button type="submit" disabled={saving || municipalities.length === 0}>{saving ? 'Guardando...' : community ? 'Guardar cambios' : 'Registrar comunidad'}</Button>
      </div>
    </form>
  </Dialog>
}
