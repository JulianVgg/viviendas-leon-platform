import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { useAuth } from '@/features/auth/AuthProvider'
import { canWriteCrops } from '@/features/auth/screenPermissions'
import { listAvailableCrops, type CropOption } from '../services/cropsService'
import { createCycle, CyclesApiError, type Cycle } from '../services/cyclesService'

export default function RegisterSowingDialog({ huertoId, huerto, familia, onClose, onSaved }: {
  huertoId: number; huerto: string; familia: string; onClose: () => void; onSaved: (cycle: Cycle) => void
}) {
  const [options, setOptions] = useState<CropOption[]>([])
  const [cultivoId, setCultivoId] = useState('')
  const [siembra, setSiembra] = useState('')
  const [trasplante, setTrasplante] = useState('')
  const [plantas, setPlantas] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const { usuario } = useAuth()
  const canManageCatalog = Boolean(usuario && canWriteCrops(usuario))
  useEffect(() => {
    const controller = new AbortController()
    listAvailableCrops(controller.signal).then(data => { if (!controller.signal.aborted) setOptions(data) })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el catálogo.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const next: Record<string, string> = {}
    if (!options.some(item => item.id === Number(cultivoId))) next.cultivoId = 'Selecciona un cultivo disponible.'
    if (!siembra && !trasplante) next.fechaSiembra = 'Indica al menos una fecha.'
    if (siembra && trasplante && trasplante < siembra) next.fechaTrasplante = 'El trasplante no puede preceder la siembra.'
    if (plantas && (!/^\d+$/.test(plantas) || Number(plantas) < 1 || Number(plantas) > 2147483647)) next.cantidadPlantas = 'Indica una cantidad entera positiva.'
    if (notas.length > 2000) next.observaciones = 'Máximo 2000 caracteres.'
    setFields(next)
    if (Object.keys(next).length) return
    setSaving(true); setError('')
    try {
      const cycle = await createCycle({
        huertoId, cultivoId: Number(cultivoId), fechaSiembra: siembra || null,
        fechaTrasplante: trasplante || null, cantidadPlantas: plantas ? Number(plantas) : null,
        observaciones: notas.trim() || null,
      })
      onSaved(cycle)
    } catch (cause) {
      if (cause instanceof CyclesApiError) {
        setError(cause.message)
        setFields(Object.fromEntries(cause.details.map(({ field, message }) => [field, message])))
      } else setError('No se pudo confirmar el guardado. Comprueba el historial antes de reintentar.')
    } finally { setSaving(false) }
  }
  return <Dialog open title="Registrar siembra" onClose={() => { if (!saving) onClose() }}
    description={`${familia} · ${huerto}`}>
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      {error && <Alert variant="error" title="No se pudo registrar">{error}</Alert>}
      {loading ? <p className="text-sm text-slate-500">Consultando cultivos disponibles...</p> :
        <FormField id="sowing-crop" label="Cultivo" required error={fields.cultivoId}>
          <select id="sowing-crop" required className={formControlClassName} value={cultivoId} onChange={e => setCultivoId(e.target.value)}>
            <option value="">Selecciona un cultivo</option>
            {options.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
          {!options.length && <p className="mt-2 text-sm text-slate-500">No hay cultivos activos en el catálogo.</p>}
          {canManageCatalog && <Link className="mt-2 inline-block text-sm text-brand-600 underline" to="/administracion/cultivos">Administrar catálogo de cultivos</Link>}
        </FormField>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="sowing-date" label="Fecha de siembra" error={fields.fechaSiembra}>
          <input id="sowing-date" className={formControlClassName} type="date" value={siembra} onChange={e => setSiembra(e.target.value)} />
        </FormField>
        <FormField id="transplant-date" label="Fecha de trasplante" error={fields.fechaTrasplante}>
          <input id="transplant-date" className={formControlClassName} type="date" value={trasplante} onChange={e => setTrasplante(e.target.value)} />
        </FormField>
      </div>
      <FormField id="sowing-amount" label="Cantidad inicial de plantas" error={fields.cantidadPlantas}>
        <input id="sowing-amount" className={formControlClassName} type="number" min={1} max={2147483647} step={1} value={plantas} onChange={e => setPlantas(e.target.value)} />
      </FormField>
      <FormField id="sowing-notes" label="Observaciones" error={fields.observaciones}>
        <textarea id="sowing-notes" className={formControlClassName} rows={3} maxLength={2000} value={notas} onChange={e => setNotas(e.target.value)} />
      </FormField>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving || loading || !options.length}>{saving ? 'Guardando...' : 'Registrar siembra'}</Button>
      </div>
    </form>
  </Dialog>
}
