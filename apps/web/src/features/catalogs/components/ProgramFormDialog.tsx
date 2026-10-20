import { useEffect, useState, type FormEvent } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import Alert from '@/components/ui/Alert'
import { ProgramsApiError, createProgram, updateProgram } from '../services/programsService'
import type { AdminProgram, ProgramFormData, ProgramState } from '../types/program'

type Props = {
  open: boolean
  program: AdminProgram | null
  onClose: () => void
  onSaved: (record: AdminProgram) => void
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export default function ProgramFormDialog({ open, program, onClose, onSaved }: Props) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [estado, setEstado] = useState<ProgramState>('ACTIVO')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setNombre(program?.nombre ?? '')
    setDescripcion(program?.descripcion ?? '')
    setFechaInicio(program?.fechaInicio ?? '')
    setFechaFin(program?.fechaFin ?? '')
    setEstado(program?.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO')
    setError('')
    setFieldErrors({})
  }, [open, program])

  function close() { if (!saving) onClose() }
  function clearError(key: string) {
    setFieldErrors((old) => { const next = { ...old }; delete next[key]; return next })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const canonicalName = nombre.normalize('NFC').trim().replace(/\s+/g, ' ')
    const errors: Record<string, string> = {}
    if (!canonicalName || canonicalName.length > 120 || /[\u0000-\u001f\u007f]/.test(nombre)) errors.nombre = 'Ingresa un nombre válido de hasta 120 caracteres.'
    if (descripcion.trim().length > 2000) errors.descripcion = 'La descripción no puede superar 2000 caracteres.'
    if (fechaInicio && !validDate(fechaInicio)) errors.fechaInicio = 'La fecha de inicio no es válida.'
    if (fechaFin && !validDate(fechaFin)) errors.fechaFin = 'La fecha final no es válida.'
    if (fechaInicio && fechaFin && fechaFin < fechaInicio) errors.fechaFin = 'La fecha final no puede ser anterior a la inicial.'
    if (Object.keys(errors).length) { setFieldErrors(errors); return }

    const input: ProgramFormData = {
      nombre: canonicalName,
      descripcion: descripcion.trim() || null,
      fechaInicio: fechaInicio || null,
      fechaFin: fechaFin || null,
      estado,
    }
    setSaving(true); setError(''); setFieldErrors({})
    try {
      const result = program ? await updateProgram(program.id, input) : await createProgram(input)
      onSaved(result)
    } catch (cause) {
      if (cause instanceof ProgramsApiError) {
        setError(cause.message)
        setFieldErrors(Object.fromEntries(cause.details.map(({ field, message }) => [field, message])))
      } else setError('No se pudo confirmar el guardado. Comprueba el catálogo antes de reintentar.')
    } finally { setSaving(false) }
  }

  return <Dialog open={open} onClose={close} title={program ? 'Editar programa' : 'Nuevo programa'}
    description="Catálogo de programas sociales y agrícolas de ViviendasLeón.">
    <form onSubmit={(event) => void submit(event)} className="space-y-5">
      {error && <Alert variant="error" title="No se pudo guardar">{error}</Alert>}
      <FormField id="program-name" label="Nombre del programa" required error={fieldErrors.nombre}>
        <input id="program-name" className={formControlClassName} value={nombre} required maxLength={120} autoFocus
          onChange={(e) => { setNombre(e.target.value); clearError('nombre') }} placeholder="Ej. Programa de huertos familiares" />
      </FormField>
      <FormField id="program-description" label="Descripción" error={fieldErrors.descripcion}>
        <textarea id="program-description" rows={3} className={formControlClassName} maxLength={2000} value={descripcion}
          onChange={(e) => { setDescripcion(e.target.value); clearError('descripcion') }} placeholder="Finalidad y alcance del programa" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="program-start" label="Fecha de inicio" error={fieldErrors.fechaInicio}>
          <input id="program-start" type="date" className={formControlClassName} value={fechaInicio} onChange={(e) => { setFechaInicio(e.target.value); clearError('fechaInicio') }} />
        </FormField>
        <FormField id="program-end" label="Fecha de finalización" error={fieldErrors.fechaFin}>
          <input id="program-end" type="date" className={formControlClassName} value={fechaFin} min={fechaInicio || undefined} onChange={(e) => { setFechaFin(e.target.value); clearError('fechaFin') }} />
        </FormField>
      </div>
      <FormField id="program-state" label="Estado" required error={fieldErrors.estado}>
        <select id="program-state" className={formControlClassName} value={estado} onChange={(e) => setEstado(e.target.value as ProgramState)}>
          <option value="ACTIVO">Activo — disponible para nuevas familias</option>
          <option value="INACTIVO">Inactivo — solo consulta histórica</option>
        </select>
      </FormField>
      {program && program.participacionesCount > 0 && <Alert variant="info" title="Historial protegido">
        Las {program.participacionesCount} participaciones vinculadas permanecerán registradas al editar o desactivar este programa.
      </Alert>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
        <Button type="button" variant="secondary" disabled={saving} onClick={close}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : program ? 'Guardar cambios' : 'Registrar programa'}</Button>
      </div>
    </form>
  </Dialog>
}
