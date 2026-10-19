import { useEffect, useState, type FormEvent } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import Alert from '@/components/ui/Alert'
import { MunicipalitiesApiError, createMunicipality, editMunicipality } from '../services/municipalitiesService'
import type { AdminMunicipality } from '../types/municipality'

type Props = {
  open: boolean
  municipality: AdminMunicipality | null
  onClose: () => void
  onSaved: (municipality: AdminMunicipality) => void
}

export default function MunicipalityFormDialog({ open, municipality, onClose, onSaved }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (!open) return
    setName(municipality?.nombre ?? '')
    setError('')
    setNameError('')
  }, [municipality, open])

  function close() {
    if (!saving) onClose()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const nombre = name.normalize('NFC').trim().replace(/\s+/g, ' ')
    if (!nombre || nombre.length > 120 || /[\u0000-\u001f\u007f]/.test(nombre)) {
      setNameError('Ingresa un nombre válido de hasta 120 caracteres.')
      return
    }
    setSaving(true)
    setError('')
    setNameError('')
    try {
      const result = municipality ? await editMunicipality(municipality.id, { nombre }) : await createMunicipality({ nombre })
      onSaved(result)
    } catch (cause) {
      if (cause instanceof MunicipalitiesApiError) {
        setError(cause.message)
        setNameError(cause.details.find(({ field }) => field === 'nombre')?.message ?? '')
      } else setError('No fue posible confirmar el guardado. Comprueba el listado antes de intentarlo otra vez.')
    } finally { setSaving(false) }
  }

  return <Dialog open={open} onClose={close} title={municipality ? 'Editar municipio' : 'Nuevo municipio'}
    description="Los municipios organizan las comunidades y familias beneficiarias de ViviendasLeón.">
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      {error && <Alert variant="error" title="No se pudo guardar">{error}</Alert>}
      <FormField id="municipality-name" label="Nombre del municipio" required error={nameError}>
        <input id="municipality-name" className={formControlClassName} value={name} required maxLength={120} autoFocus
          onChange={(event) => { setName(event.target.value); setNameError('') }} placeholder="Ej. Santa Lucía Utatlán" />
      </FormField>
      {municipality && municipality.comunidadesCount > 0 && <Alert variant="info" title="Relaciones conservadas">Cambiar el nombre no modifica las comunidades ni familias relacionadas con este municipio.</Alert>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
        <Button type="button" variant="secondary" disabled={saving} onClick={close}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : municipality ? 'Guardar cambios' : 'Registrar municipio'}</Button>
      </div>
    </form>
  </Dialog>
}
