import { useEffect, useRef, useState, type FormEvent } from 'react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Alert from '@/components/ui/Alert'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { FamilyApiError, createFamilyProgram, updateFamilyProgram } from '../services/familyService'
import { validDate } from '../services/familyWizard'
import type { FamilyProgramOption, FamilyParticipationRecord } from '../types/familyIntegral'

type Props = {
  familyId: number
  open: boolean
  participation?: FamilyParticipationRecord
  availablePrograms: FamilyProgramOption[]
  onClose: () => void
  onSaved: (saved: FamilyParticipationRecord) => void
}

const statuses = ['ACTIVO', 'FINALIZADO', 'RETIRADO'] as const

export default function FamilyProgramDialog({ familyId, open, participation, availablePrograms, onClose, onSaved }: Props) {
  const [programId, setProgramId] = useState('')
  const [estado, setEstado] = useState<string>('ACTIVO')
  const [fechaIngreso, setFechaIngreso] = useState('')
  const [fechaSalida, setFechaSalida] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const idempotencyKey = useRef(crypto.randomUUID())

  useEffect(() => {
    if (!open) return
    setProgramId(participation ? String(participation.programaId) : '')
    setEstado(participation?.estado && statuses.some((value) => value === participation.estado) ? participation.estado : participation?.fechaSalida ? 'FINALIZADO' : 'ACTIVO')
    setFechaIngreso(participation?.fechaIngreso?.slice(0, 10) ?? '')
    setFechaSalida(participation?.fechaSalida?.slice(0, 10) ?? '')
    setObservaciones(participation?.observaciones ?? '')
    setError(''); setFieldErrors({}); setSaving(false); setUncertain(false)
    idempotencyKey.current = crypto.randomUUID()
  }, [open, participation])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || uncertain) return
    const errors: Record<string, string> = {}
    if (!participation && !availablePrograms.some(({ id }) => id === Number(programId))) errors.programaId = 'Selecciona un programa activo disponible.'
    if (!statuses.some((value) => value === estado)) errors.estado = 'Selecciona un estado válido.'
    if (fechaIngreso && !validDate(fechaIngreso)) errors.fechaIngreso = 'Introduce una fecha de ingreso válida.'
    if (fechaSalida && !validDate(fechaSalida)) errors.fechaSalida = 'Introduce una fecha de salida válida.'
    if (fechaIngreso && fechaSalida && fechaSalida < fechaIngreso) errors.fechaSalida = 'La salida no puede ser anterior al ingreso.'
    if (observaciones.trim().length > 2000) errors.observaciones = 'Máximo 2000 caracteres.'
    setFieldErrors(errors)
    if (Object.keys(errors).length) return
    setSaving(true); setError('')
    const changes = {
      estado, fechaIngreso: fechaIngreso || null, fechaSalida: fechaSalida || null,
      observaciones: observaciones.trim() || null,
    }
    try {
      const result = participation
        ? await updateFamilyProgram(familyId, participation.id, { ...changes, version: participation.version })
        : await createFamilyProgram(familyId, { ...changes, programaId: Number(programId) }, idempotencyKey.current)
      onSaved(result)
    } catch (cause) {
      if (cause instanceof FamilyApiError) {
        setError(cause.status === 409 && cause.code === 'CONCURRENT_MODIFICATION'
          ? 'Otro usuario cambió esta participación. Cierra el formulario y actualiza el expediente.'
          : cause.message)
        setFieldErrors(Object.fromEntries(cause.details.map(({ field, message }) => [field, message])))
      } else {
        // Si el servidor recibió un POST, el resultado podría haberse guardado.
        setUncertain(true)
        setError('No se pudo confirmar el guardado. Cierra el formulario y actualiza el expediente antes de volver a intentarlo.')
      }
    } finally { setSaving(false) }
  }

  const existingProgramName = participation?.programa.nombre ?? ''

  return <Dialog open={open} title={participation ? 'Editar participación' : 'Asociar programa'}
    description={`Expediente #${familyId}. Los cambios quedan registrados en la bitácora.`}
    onClose={() => { if (!saving) onClose() }}>
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-5">
      {error && <Alert variant="error" title="No se pudo guardar">{error}</Alert>}
      {participation ? <FormField id="family-program-readonly" label="Programa" hint="Para conservar el historial, no se puede cambiar el programa de una participación existente.">
        <input id="family-program-readonly" value={existingProgramName} readOnly className={formControlClassName} />
      </FormField> : <FormField id="family-program-select" label="Programa" required error={fieldErrors.programaId}>
        <select id="family-program-select" value={programId} onChange={(e) => setProgramId(e.target.value)} required className={formControlClassName}>
          <option value="">Selecciona un programa</option>
          {availablePrograms.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </select>
      </FormField>}
      <FormField id="family-program-state" label="Estado de participación" required error={fieldErrors.estado}>
        <select id="family-program-state" value={estado} onChange={(e) => setEstado(e.target.value)} className={formControlClassName}>
          <option value="ACTIVO">Activo</option>
          <option value="FINALIZADO">Finalizado</option>
          <option value="RETIRADO">Retirado</option>
        </select>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="family-program-entry" label="Fecha de ingreso" error={fieldErrors.fechaIngreso}>
          <input id="family-program-entry" type="date" className={formControlClassName} value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} />
        </FormField>
        <FormField id="family-program-exit" label="Fecha de salida" error={fieldErrors.fechaSalida}>
          <input id="family-program-exit" type="date" className={formControlClassName} value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} />
        </FormField>
      </div>
      <FormField id="family-program-notes" label="Observaciones" error={fieldErrors.observaciones} hint="Máximo 2000 caracteres.">
        <textarea id="family-program-notes" rows={4} maxLength={2000} className={`${formControlClassName} h-auto py-3`} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
      </FormField>
      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
        <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={saving || uncertain || (!participation && !availablePrograms.length)}>{saving ? 'Guardando...' : 'Guardar participación'}</Button>
      </div>
    </form>
  </Dialog>
}
