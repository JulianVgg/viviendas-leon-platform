import { useState, type FormEvent } from 'react'
import Alert from '@/components/ui/Alert'
import LoadingState from '@/components/ui/LoadingState'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { Form, FormActions, FormGrid, FormRepeater, FormSection } from '@/components/forms'
import ComponentCard from '@/components/common/ComponentCard'

type Option = { id: string; label: string }
type Disease = { diseaseId: string; damage: string; observation: string }
type Pest = { pestId: string; damage: string; observation: string }
type Treatment = { inputId: string; quantity: string; unitId: string; date: string; observation: string }
type Evaluation = {
  cycleId: string
  stageId: string
  qualityId: string
  observation: string
  diseases: Disease[]
  pests: Pest[]
  treatments: Treatment[]
}
type VisitValues = {
  familyId: string
  responsibleId: string
  date: string
  weatherId: string
  observation: string
  evaluations: Evaluation[]
}

type DemoMode = 'create' | 'edit'
type DemoStatus = 'idle' | 'loading' | 'saving' | 'success' | 'error' | 'disabled' | 'readonly'
type SaveOutcome = 'success' | 'error'

const families: Option[] = [{ id: 'family-1', label: 'Familia de ejemplo' }, { id: 'family-2', label: 'Familia demostración 2' }]
const users: Option[] = [{ id: 'user-1', label: 'Usuario de ejemplo' }, { id: 'user-2', label: 'Usuario demostración 2' }]
const cycles: Option[] = [{ id: 'cycle-tomato', label: 'Tomate - Huerto 1' }, { id: 'cycle-lettuce', label: 'Lechuga - Huerto 2' }]
const stages: Option[] = [{ id: 'stage-transplanted', label: 'Trasplantado' }, { id: 'stage-production', label: 'Producción' }]
const qualities: Option[] = [{ id: 'quality-good', label: 'Buena' }, { id: 'quality-medium', label: 'Regular' }]
const diseases: Option[] = [{ id: 'disease-mildew', label: 'Mildiu' }, { id: 'disease-alternaria', label: 'Alternaria' }]
const pests: Option[] = [{ id: 'pest-aphid', label: 'Pulgón' }, { id: 'pest-whitefly', label: 'Mosca blanca' }]
const inputs: Option[] = [{ id: 'input-organic', label: 'Fungicida orgánico' }, { id: 'input-compost', label: 'Abono orgánico' }]
const units: Option[] = [{ id: 'unit-liter', label: 'Litros' }, { id: 'unit-kilogram', label: 'Kilogramos' }]
const weather: Option[] = [{ id: 'weather-clear', label: 'Claro' }, { id: 'weather-cloudy', label: 'Nublado' }]

const createValues: VisitValues = { familyId: '', responsibleId: '', date: '', weatherId: '', observation: '', evaluations: [] }
const editValues: VisitValues = {
  familyId: 'family-1',
  responsibleId: 'user-1',
  date: '2026-10-04',
  weatherId: 'weather-clear',
  observation: 'Visita existente de demostración.',
  evaluations: [
    {
      cycleId: 'cycle-tomato', stageId: 'stage-transplanted', qualityId: 'quality-good', observation: 'Tomate en seguimiento.',
      diseases: [{ diseaseId: 'disease-mildew', damage: '20', observation: 'Observación de enfermedad.' }],
      pests: [{ pestId: 'pest-aphid', damage: '5', observation: 'Observación de plaga.' }],
      treatments: [{ inputId: 'input-organic', quantity: '2', unitId: 'unit-liter', date: '2026-10-04', observation: 'Aplicación de ejemplo.' }],
    },
    {
      cycleId: 'cycle-lettuce', stageId: 'stage-production', qualityId: 'quality-good', observation: 'Lechuga en producción.',
      diseases: [],
      pests: [{ pestId: 'pest-whitefly', damage: '3', observation: '' }],
      treatments: [],
    },
  ],
}

const emptyEvaluation = (): Evaluation => ({ cycleId: '', stageId: '', qualityId: '', observation: '', diseases: [], pests: [], treatments: [] })
const emptyDisease = (): Disease => ({ diseaseId: '', damage: '', observation: '' })
const emptyPest = (): Pest => ({ pestId: '', damage: '', observation: '' })
const emptyTreatment = (): Treatment => ({ inputId: '', quantity: '', unitId: '', date: '', observation: '' })
const getInitialValues = (mode: DemoMode) => mode === 'edit' ? editValues : createValues

function selectOptions(options: Option[]) {
  return <><option value="">Seleccionar</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</>
}

export default function FormPatternDemo() {
  const [mode, setMode] = useState<DemoMode>('create')
  const [values, setValues] = useState<VisitValues>(createValues)
  const [status, setStatus] = useState<DemoStatus>('idle')
  const [saveOutcome, setSaveOutcome] = useState<SaveOutcome>('success')
  const [validationAttempted, setValidationAttempted] = useState(false)
  const [visitErrors, setVisitErrors] = useState<{ familyId?: string; date?: string }>({})
  const [notice, setNotice] = useState<string | undefined>()
  const blocked = status === 'disabled' || status === 'readonly' || status === 'loading'

  const completeSave = () => {
    if (saveOutcome === 'error') {
      setStatus('error')
      setNotice('No fue posible guardar la visita. Intenta nuevamente.')
      return
    }
    setStatus('success')
    setNotice('Visita guardada correctamente.')
  }

  const handleModeChange = (nextMode: DemoMode) => {
    setMode(nextMode)
    setValues(getInitialValues(nextMode))
    setStatus('idle')
    setValidationAttempted(false)
    setVisitErrors({})
    setNotice(undefined)
  }

  const validate = () => {
    const nextErrors: typeof visitErrors = {}
    if (!values.familyId) nextErrors.familyId = 'La familia es obligatoria.'
    if (!values.date) nextErrors.date = 'La fecha es obligatoria.'
    setVisitErrors(nextErrors)
    setValidationAttempted(true)
    const evaluationsValid = values.evaluations.every((evaluation) => Boolean(
      evaluation.cycleId && evaluation.stageId
      && evaluation.diseases.every((disease) => disease.diseaseId)
      && evaluation.pests.every((pest) => pest.pestId)
      && evaluation.treatments.every((treatment) => treatment.inputId && treatment.quantity && treatment.unitId && treatment.date),
    ))
    return Object.keys(nextErrors).length === 0 && evaluationsValid
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setNotice(undefined)
    if (!validate()) return
    setStatus('saving')
    window.setTimeout(completeSave, 300)
  }

  const handleCancel = () => {
    setStatus('idle')
    setNotice('Operación cancelada. Los datos permanecen únicamente en el estado local.')
  }

  const handleStatusChange = (nextStatus: DemoStatus) => {
    setNotice(undefined)
    if (nextStatus === 'saving') {
      setStatus('saving')
      window.setTimeout(completeSave, 300)
      return
    }
    setStatus(nextStatus)
    if (nextStatus === 'success') setNotice('Visita guardada correctamente.')
    if (nextStatus === 'error') setNotice('No fue posible guardar la visita. Intenta nuevamente.')
  }

  const updateVisit = (changes: Partial<VisitValues>) => setValues({ ...values, ...changes })
  const initialValues = getInitialValues(mode)

  return <ComponentCard title="Demostración del patrón de formularios" description="Visita con evaluaciones de cultivo y colecciones locales anidadas. No es un módulo funcional.">
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
      <FormField label="Modo" id="demo-visit-mode" hint="Mismo patrón para crear y editar.">
        <select value={mode} onChange={(event) => handleModeChange(event.target.value as DemoMode)} className={formControlClassName} disabled={status === 'saving'}><option value="create">Crear visita</option><option value="edit">Editar visita</option></select>
      </FormField>
      <FormField label="Estado" id="demo-visit-status" hint="Escenarios deterministas.">
        <select value={status} onChange={(event) => handleStatusChange(event.target.value as DemoStatus)} className={formControlClassName} disabled={status === 'saving'}><option value="idle">Normal</option><option value="loading">Loading</option><option value="saving">Saving</option><option value="success">Success</option><option value="error">Error</option><option value="disabled">Disabled</option><option value="readonly">Readonly</option></select>
      </FormField>
      <FormField label="Resultado al guardar" id="demo-visit-outcome" hint="Controla la simulación.">
        <select value={saveOutcome} onChange={(event) => setSaveOutcome(event.target.value as SaveOutcome)} className={formControlClassName} disabled={status === 'saving'}><option value="success">Éxito</option><option value="error">Error general</option></select>
      </FormField>
      <div className="flex items-end text-sm text-slate-500 dark:text-slate-400">Valores iniciales: {initialValues.evaluations.length} evaluación(es)</div>
    </div>
    {status === 'loading' && <LoadingState label={`Cargando datos locales de la ${mode === 'edit' ? 'visita existente' : 'nueva visita'}...`} />}
    <Form mode={mode} status={status} onSubmit={handleSubmit} actions={<FormActions mode={mode} submitting={status === 'saving'} blocked={blocked} onCancel={handleCancel} />}>
      <FormSection title="Información general de la visita" description="La familia, fecha, clima y responsable pertenecen a la visita.">
        <FormGrid>
          <FormField label="Familia" id="demo-visit-family" required error={visitErrors.familyId}>
            <select value={values.familyId} onChange={(event) => { updateVisit({ familyId: event.target.value }); setVisitErrors({ ...visitErrors, familyId: undefined }) }} className={formControlClassName}>{selectOptions(families)}</select>
          </FormField>
          <FormField label="Usuario responsable" id="demo-visit-responsible">
            <select value={values.responsibleId} onChange={(event) => updateVisit({ responsibleId: event.target.value })} className={formControlClassName}>{selectOptions(users)}</select>
          </FormField>
          <FormField label="Fecha" id="demo-visit-date" required error={visitErrors.date}>
            <input type="date" value={values.date} onChange={(event) => { updateVisit({ date: event.target.value }); setVisitErrors({ ...visitErrors, date: undefined }) }} className={formControlClassName} />
          </FormField>
          <FormField label="Condición climática" id="demo-visit-weather">
            <select value={values.weatherId} onChange={(event) => updateVisit({ weatherId: event.target.value })} className={formControlClassName}>{selectOptions(weather)}</select>
          </FormField>
          <FormField label="Observaciones" id="demo-visit-observation" hint="Campo opcional de la visita.">
            <textarea value={values.observation} onChange={(event) => updateVisit({ observation: event.target.value })} className={`${formControlClassName} min-h-24 py-2`} />
          </FormField>
        </FormGrid>
      </FormSection>
      <FormRepeater
        key={mode}
        title="Evaluaciones de cultivo"
        description="Cada evaluación referencia un ciclo existente y mantiene sus propias enfermedades, plagas y tratamientos."
        initialItems={values.evaluations}
        createItem={emptyEvaluation}
        disabled={status === 'disabled' || status === 'saving' || status === 'loading'}
        readOnly={status === 'readonly'}
        itemError={(evaluation) => validationAttempted && !evaluation.cycleId ? 'El ciclo de cultivo es obligatorio.' : validationAttempted && !evaluation.stageId ? 'La etapa del cultivo es obligatoria.' : undefined}
        onChange={(evaluations) => updateVisit({ evaluations })}
        renderItem={(evaluation, index, id, onChange) => <div className="space-y-4">
          <FormSection title={`Evaluación ${index + 1}`} variant="plain">
            <FormGrid>
              <FormField label="Ciclo de cultivo" id={`${id}-cycle`} required error={validationAttempted && !evaluation.cycleId ? 'El ciclo de cultivo es obligatorio.' : undefined} hint="Referencia a un ciclo existente.">
                <select value={evaluation.cycleId} onChange={(event) => onChange({ ...evaluation, cycleId: event.target.value })} className={formControlClassName}>{selectOptions(cycles)}</select>
              </FormField>
              <FormField label="Etapa del cultivo" id={`${id}-stage`} required error={validationAttempted && !evaluation.stageId ? 'La etapa del cultivo es obligatoria.' : undefined}>
                <select value={evaluation.stageId} onChange={(event) => onChange({ ...evaluation, stageId: event.target.value })} className={formControlClassName}>{selectOptions(stages)}</select>
              </FormField>
              <FormField label="Calidad" id={`${id}-quality`}>
                <select value={evaluation.qualityId} onChange={(event) => onChange({ ...evaluation, qualityId: event.target.value })} className={formControlClassName}>{selectOptions(qualities)}</select>
              </FormField>
              <FormField label="Observaciones" id={`${id}-observation`}>
                <input value={evaluation.observation} onChange={(event) => onChange({ ...evaluation, observation: event.target.value })} className={formControlClassName} />
              </FormField>
            </FormGrid>
          </FormSection>
          <FormRepeater title="Enfermedades" description="Problemas identificados en esta evaluación." initialItems={evaluation.diseases} createItem={emptyDisease} disabled={status === 'disabled' || status === 'saving' || status === 'loading'} readOnly={status === 'readonly'} itemError={(disease) => validationAttempted && !disease.diseaseId ? 'La enfermedad es obligatoria.' : undefined} onChange={(diseases) => onChange({ ...evaluation, diseases })} renderItem={(disease, diseaseIndex, diseaseId) => <FormGrid>
            <FormField label={`Enfermedad ${diseaseIndex + 1}`} id={`${diseaseId}-disease`} required error={validationAttempted && !disease.diseaseId ? 'La enfermedad es obligatoria.' : undefined}><select value={disease.diseaseId} onChange={(event) => onChange({ ...evaluation, diseases: evaluation.diseases.map((item, current) => current === diseaseIndex ? { ...item, diseaseId: event.target.value } : item) })} className={formControlClassName}>{selectOptions(diseases)}</select></FormField>
            <FormField label="Porcentaje de daño" id={`${diseaseId}-damage`}><input type="number" value={disease.damage} onChange={(event) => onChange({ ...evaluation, diseases: evaluation.diseases.map((item, current) => current === diseaseIndex ? { ...item, damage: event.target.value } : item) })} className={formControlClassName} /></FormField>
            <FormField label="Observación" id={`${diseaseId}-observation`}><input value={disease.observation} onChange={(event) => onChange({ ...evaluation, diseases: evaluation.diseases.map((item, current) => current === diseaseIndex ? { ...item, observation: event.target.value } : item) })} className={formControlClassName} /></FormField>
          </FormGrid>} />
          <FormRepeater title="Plagas" description="Plagas identificadas en esta evaluación." initialItems={evaluation.pests} createItem={emptyPest} disabled={status === 'disabled' || status === 'saving' || status === 'loading'} readOnly={status === 'readonly'} itemError={(pest) => validationAttempted && !pest.pestId ? 'La plaga es obligatoria.' : undefined} onChange={(pests) => onChange({ ...evaluation, pests })} renderItem={(pest, pestIndex, pestId) => <FormGrid>
            <FormField label={`Plaga ${pestIndex + 1}`} id={`${pestId}-pest`} required error={validationAttempted && !pest.pestId ? 'La plaga es obligatoria.' : undefined}><select value={pest.pestId} onChange={(event) => onChange({ ...evaluation, pests: evaluation.pests.map((item, current) => current === pestIndex ? { ...item, pestId: event.target.value } : item) })} className={formControlClassName}>{selectOptions(pests)}</select></FormField>
            <FormField label="Porcentaje de daño" id={`${pestId}-damage`}><input type="number" value={pest.damage} onChange={(event) => onChange({ ...evaluation, pests: evaluation.pests.map((item, current) => current === pestIndex ? { ...item, damage: event.target.value } : item) })} className={formControlClassName} /></FormField>
            <FormField label="Observación" id={`${pestId}-observation`}><input value={pest.observation} onChange={(event) => onChange({ ...evaluation, pests: evaluation.pests.map((item, current) => current === pestIndex ? { ...item, observation: event.target.value } : item) })} className={formControlClassName} /></FormField>
          </FormGrid>} />
          <FormRepeater title="Tratamientos" description="Uso de insumos sobre el cultivo evaluado." initialItems={evaluation.treatments} createItem={emptyTreatment} disabled={status === 'disabled' || status === 'saving' || status === 'loading'} readOnly={status === 'readonly'} itemError={(treatment) => validationAttempted && !treatment.inputId ? 'El insumo es obligatorio.' : validationAttempted && !treatment.quantity ? 'La cantidad es obligatoria.' : validationAttempted && !treatment.unitId ? 'La unidad es obligatoria.' : validationAttempted && !treatment.date ? 'La fecha de aplicación es obligatoria.' : undefined} onChange={(treatments) => onChange({ ...evaluation, treatments })} renderItem={(treatment, treatmentIndex, treatmentId) => <FormGrid>
            <FormField label={`Insumo ${treatmentIndex + 1}`} id={`${treatmentId}-input`} required error={validationAttempted && !treatment.inputId ? 'El insumo es obligatorio.' : undefined}><select value={treatment.inputId} onChange={(event) => onChange({ ...evaluation, treatments: evaluation.treatments.map((item, current) => current === treatmentIndex ? { ...item, inputId: event.target.value } : item) })} className={formControlClassName}>{selectOptions(inputs)}</select></FormField>
            <FormField label="Cantidad" id={`${treatmentId}-quantity`} required error={validationAttempted && !treatment.quantity ? 'La cantidad es obligatoria.' : undefined}><input type="number" value={treatment.quantity} onChange={(event) => onChange({ ...evaluation, treatments: evaluation.treatments.map((item, current) => current === treatmentIndex ? { ...item, quantity: event.target.value } : item) })} className={formControlClassName} /></FormField>
            <FormField label="Unidad" id={`${treatmentId}-unit`} required error={validationAttempted && !treatment.unitId ? 'La unidad es obligatoria.' : undefined}><select value={treatment.unitId} onChange={(event) => onChange({ ...evaluation, treatments: evaluation.treatments.map((item, current) => current === treatmentIndex ? { ...item, unitId: event.target.value } : item) })} className={formControlClassName}>{selectOptions(units)}</select></FormField>
            <FormField label="Fecha de aplicación" id={`${treatmentId}-date`} required error={validationAttempted && !treatment.date ? 'La fecha de aplicación es obligatoria.' : undefined}><input type="date" value={treatment.date} onChange={(event) => onChange({ ...evaluation, treatments: evaluation.treatments.map((item, current) => current === treatmentIndex ? { ...item, date: event.target.value } : item) })} className={formControlClassName} /></FormField>
            <FormField label="Observaciones" id={`${treatmentId}-observation`}><input value={treatment.observation} onChange={(event) => onChange({ ...evaluation, treatments: evaluation.treatments.map((item, current) => current === treatmentIndex ? { ...item, observation: event.target.value } : item) })} className={formControlClassName} /></FormField>
          </FormGrid>} />
        </div>}
      />
      {notice && <Alert variant={status === 'error' ? 'error' : status === 'success' ? 'success' : 'info'} title={status === 'error' ? 'Error general' : status === 'success' ? 'Operación completada' : 'Información'}>{notice}</Alert>}
      <output className="sr-only" aria-live="polite">{values.evaluations.length} evaluaciones de cultivo</output>
    </Form>
  </ComponentCard>
}
