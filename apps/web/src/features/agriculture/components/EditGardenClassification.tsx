import { useState, type FormEvent } from 'react'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import FormGrid from '@/components/forms/FormGrid'
import type { Garden, GardenClassification } from '../services/gardens'
import { updateGardenClassification } from '../services/gardens'
import { GardenClassificationFields } from './GardenClassificationFields'

export default function EditGardenClassification({ garden, onCancel, onSaved }: {
  garden: Garden
  onCancel: () => void
  onSaved: (garden: Garden) => void
}) {
  const [value, setValue] = useState<GardenClassification>({
    tipo: garden.tipo, entornoCultivo: garden.entornoCultivo, detalleEntorno: garden.detalleEntorno,
    modalidadesProductivas: [...garden.modalidadesProductivas],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setSaving(true); setError('')
    try { onSaved(await updateGardenClassification(garden.id, value)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible actualizar la clasificación.') }
    finally { setSaving(false) }
  }
  return <form className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/5" onSubmit={event => void submit(event)}>
    <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Clasificación productiva</h4>
    {error && <Alert variant="error">{error}</Alert>}
    <FormGrid><GardenClassificationFields value={value} onChange={setValue} disabled={saving} /></FormGrid>
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="secondary" disabled={saving} onClick={onCancel}>Cancelar</Button>
      <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar clasificación'}</Button>
    </div>
  </form>
}
