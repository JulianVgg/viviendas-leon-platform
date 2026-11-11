import { useEffect, useState, type FormEvent } from 'react'
import Dialog from '@/components/ui/Dialog'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import LoadingState from '@/components/ui/LoadingState'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createProduction, listProductionUnits, ProductionApiError, type ProductionUnit } from '../services/productionService'
import type { Cycle } from '../services/cyclesService'

function todayGuatemala() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const get = (name: string) => parts.find(part => part.type === name)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Un solo registro de cosecha, ligado al ciclo seleccionado del huerto. */
export default function RegistrarCosechaDialog({ cycle, onClose, onSaved }: {
  cycle: Cycle
  onClose: () => void
  onSaved: () => void
}) {
  const online = useOnlineStatus()
  const [units, setUnits] = useState<ProductionUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [unitError, setUnitError] = useState('')
  const [date, setDate] = useState(todayGuatemala)
  const [amount, setAmount] = useState('')
  const [unitId, setUnitId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const unit = units.find(item => item.id === Number(unitId))

  useEffect(() => {
    const controller = new AbortController()
    listProductionUnits(controller.signal)
      .then(result => { if (!controller.signal.aborted) setUnits(result) })
      .catch(cause => { if (!controller.signal.aborted) setUnitError(cause instanceof Error ? cause.message : 'No se pudieron cargar las unidades.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !online || loading) return
    const errors: Record<string, string> = {}
    const today = todayGuatemala()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today || (cycle.fechaSiembra && date < cycle.fechaSiembra) || (cycle.fechaFin && date > cycle.fechaFin)) {
      errors.fechaCosecha = 'La fecha debe estar dentro del período del ciclo y no puede ser futura.'
    }
    const quantity = Number(amount)
    if (!amount.trim() || !Number.isFinite(quantity) || quantity <= 0 || quantity > 999999999.999 || (unit?.tipo !== 'kg' && !Number.isSafeInteger(quantity))) {
      errors.cantidad = 'Ingresa una cantidad válida y positiva para la unidad seleccionada.'
    }
    if (!unit) errors.unidadMedidaId = 'Selecciona una unidad.'
    if (notes.length > 500 || (notes.match(/\S+/gu)?.length ?? 0) > 100) errors.observaciones = 'Máximo 500 caracteres y 100 palabras.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    setSaving(true); setError('')
    try {
      await createProduction({ cicloCultivoId: cycle.id, fechaCosecha: date, cantidad: amount, unidadMedidaId: Number(unitId), observaciones: notes.trim() || null })
      onSaved()
    } catch (cause) {
      if (cause instanceof ProductionApiError) {
        setError(cause.message)
        setFieldErrors(Object.fromEntries(cause.details.map(detail => [detail.field, detail.message])))
      } else setError('No se pudo guardar la cosecha.')
    } finally { setSaving(false) }
  }

  return <Dialog open title="Registrar cosecha" description={`${cycle.cultivo.nombre} · Ciclo #${cycle.id}`} onClose={() => { if (!saving) onClose() }}>
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      {error && <Alert variant="error" title="No se pudo registrar">{error}</Alert>}
      {unitError && <Alert variant="error">{unitError}</Alert>}
      {loading && <LoadingState label="Cargando unidades..." />}
      {!online && <Alert variant="warning">Se requiere conexión para guardar la cosecha.</Alert>}
      <FormField id="harvest-date-scoped" label="Fecha de cosecha" required error={fieldErrors.fechaCosecha}>
        <input id="harvest-date-scoped" type="date" required max={todayGuatemala()} className={formControlClassName} value={date} onChange={event => setDate(event.target.value)} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="harvest-amount-scoped" label="Cantidad cosechada" required error={fieldErrors.cantidad}>
          <input id="harvest-amount-scoped" type="number" required min={unit?.tipo === 'kg' ? '0.001' : '1'} max={unit?.tipo === 'kg' ? '999999999.999' : '999999999'} step={unit?.tipo === 'kg' ? '0.001' : '1'} className={formControlClassName} value={amount} onChange={event => setAmount(event.target.value)} />
        </FormField>
        <FormField id="harvest-unit-scoped" label="Unidad" required error={fieldErrors.unidadMedidaId}>
          <select id="harvest-unit-scoped" required className={formControlClassName} value={unitId} onChange={event => setUnitId(event.target.value)}>
            <option value="">Seleccionar unidad</option>{units.map(item => <option key={item.id} value={item.id}>{item.nombre} ({item.abreviatura || item.codigo})</option>)}
          </select>
        </FormField>
      </div>
      <FormField id="harvest-notes-scoped" label="Observaciones" error={fieldErrors.observaciones}>
        <textarea id="harvest-notes-scoped" maxLength={500} rows={3} className={`${formControlClassName} h-auto`} value={notes} onChange={event => setNotes(event.target.value)} />
      </FormField>
      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button type="submit" disabled={saving || loading || !!unitError || !online}>{saving ? 'Guardando...' : 'Guardar cosecha'}</Button>
      </div>
    </form>
  </Dialog>
}
