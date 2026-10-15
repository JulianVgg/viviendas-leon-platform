import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Form, FormGrid, FormSection } from '@/components/forms'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import LoadingState from '@/components/ui/LoadingState'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { createIntegralFamily, FamilyApiError, fetchFamilyProgramOptions } from '../services/familyService'
import { buildIntegralPayload, createMemberDraft, createProgramDraft, integralErrorMessage, mapServerErrors, memberField, programField, stepForField, validateWizardStep } from '../services/familyWizard'
import type { CommunityOption } from '../types/family'
import type { FamilyProgramOption, FamilyWizardInput, IntegralFamilyRecord, MemberDraft, ProgramDraft, WizardErrors } from '../types/familyIntegral'

const steps = ['Familia', 'Integrantes', 'Programas', 'Confirmar']
const controlClass = formControlClassName
const notesClass = `${controlClass} h-auto min-h-24 py-2`

export default function FamilyWizard({ communities, onCreated }: { communities: CommunityOption[]; onCreated: (record: IntegralFamilyRecord) => void }) {
  const [draft, setDraft] = useState<FamilyWizardInput>(() => ({ nombreReferencia: '', comunidadId: '', fechaIngreso: '', observaciones: '', integrantes: [createMemberDraft('member-1')], programas: [createProgramDraft('program-2')] }))
  const nextId = useRef(2)
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<WizardErrors>({})
  const [generalError, setGeneralError] = useState<string>()
  const [options, setOptions] = useState<FamilyProgramOption[]>([])
  const [loading, setLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string>()
  const [version, setVersion] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const submitting = useRef(false)
  const pendingFocus = useRef<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const community = communities.find(({ id }) => id === Number(draft.comunidadId))

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const data = await fetchFamilyProgramOptions(controller.signal)
        if (!controller.signal.aborted) setOptions(data)
      } catch (cause) {
        if (!controller.signal.aborted) setCatalogError(integralErrorMessage(cause instanceof FamilyApiError ? cause.status : undefined))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [version])

  useEffect(() => {
    if (pendingFocus.current) {
      const element = document.getElementById(`wizard-${pendingFocus.current}`)
      const target = element ?? heading.current
      target?.focus()
      pendingFocus.current = null
    } else heading.current?.focus()
  }, [step, errors])

  function retryOptions() {
    setLoading(true)
    setCatalogError(undefined)
    setVersion((value) => value + 1)
  }

  function showErrors(nextErrors: WizardErrors) {
    const first = Object.keys(nextErrors)[0]
    pendingFocus.current = first
    setErrors(nextErrors)
    setStep(stepForField(first))
  }

  function changeGeneral(field: 'nombreReferencia' | 'comunidadId' | 'fechaIngreso' | 'observaciones', value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }
  function changeMember(id: string, field: keyof MemberDraft, value: string) {
    setDraft((current) => ({ ...current, integrantes: current.integrantes.map((row) => row.localId === id ? { ...row, [field]: value } : row) }))
  }
  function changeProgram(id: string, field: keyof ProgramDraft, value: string) {
    setDraft((current) => ({ ...current, programas: current.programas.map((row) => row.localId === id ? { ...row, [field]: value } : row) }))
  }
  function removeRow(collection: 'integrantes' | 'programas', id: string) {
    const rows = draft[collection]
    if (rows.length <= 1) return
    const index = rows.findIndex((row) => row.localId === id)
    const target = rows[index + 1] ?? rows[index - 1]
    pendingFocus.current = collection === 'integrantes' ? memberField(target.localId, 'nombreCompleto') : programField(target.localId, 'programaId')
    setDraft((current) => ({ ...current, [collection]: current[collection].filter((row) => row.localId !== id) }))
    const rowKey = `${collection}.${id}`
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== rowKey && !key.startsWith(`${rowKey}.`))))
  }
  function addMember() {
    const id = `member-${++nextId.current}`
    pendingFocus.current = memberField(id, 'nombreCompleto')
    setDraft((current) => ({ ...current, integrantes: [...current.integrantes, createMemberDraft(id)] }))
    setErrors((current) => ({ ...current }))
  }
  function addProgram() {
    const id = `program-${++nextId.current}`
    pendingFocus.current = programField(id, 'programaId')
    setDraft((current) => ({ ...current, programas: [...current.programas, createProgramDraft(id)] }))
    setErrors((current) => ({ ...current }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || uncertain) return
    if (step < 3) {
      const nextErrors = validateWizardStep(step, draft, communities, options)
      if (Object.keys(nextErrors).length) { showErrors(nextErrors); return }
      if (step === 2 && (loading || catalogError)) return
      setErrors({})
      setStep(step + 1)
      return
    }
    const nextErrors = Object.assign({}, ...[0, 1, 2].map((index) => validateWizardStep(index, draft, communities, options)))
    if (Object.keys(nextErrors).length) { showErrors(nextErrors); return }
    if (loading || catalogError) { setStep(2); return }
    submitting.current = true
    setSaving(true)
    setGeneralError(undefined)
    const submitted = draft
    let created: IntegralFamilyRecord | undefined
    let postStarted = false
    try {
      // Reuse the existing server session endpoint without clearing AuthProvider
      // (which would unmount this form and discard the unsaved draft on expiry).
      const session = await fetch('/api/v1/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      if (!session.ok) throw new FamilyApiError('', session.status)
      postStarted = true
      created = await createIntegralFamily(buildIntegralPayload(submitted))
    } catch (cause) {
      const status = cause instanceof FamilyApiError ? cause.status : undefined
      setGeneralError(!postStarted && status === undefined ? 'No se pudo verificar la sesión. No se envió el expediente. Comprueba la conexión antes de continuar.' : integralErrorMessage(status, postStarted))
      if (postStarted && status === undefined) setUncertain(true)
      const mapped = mapServerErrors(cause instanceof FamilyApiError ? cause.details : [], submitted)
      if (Object.keys(mapped).length) showErrors(mapped)
      else {
        pendingFocus.current = 'submission-error'
        setErrors({})
      }
    } finally {
      submitting.current = false
      setSaving(false)
    }
    if (created) onCreated(created)
  }

  function textField(key: string, label: string, value: string, onChange: (value: string) => void, type = 'text', required = false, maxLength?: number) {
    return <FormField key={key} id={`wizard-${key}`} label={label} required={required} error={errors[key]}>
      <input className={controlClass} type={type} value={value} required={required} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  }
  function notes(key: string, value: string, onChange: (value: string) => void, maxLength?: number) {
    return <FormField id={`wizard-${key}`} label="Observaciones" error={errors[key]} hint={maxLength ? `Máximo ${maxLength} caracteres.` : undefined}>
      <textarea className={notesClass} rows={3} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  }
  function collectionError(key: string) {
    return errors[key] ? <p id={`wizard-${key}`} tabIndex={-1} role="alert" className="text-sm text-red-700 dark:text-red-300">{errors[key]}</p> : null
  }
  function summary(label: string, value: string | undefined) {
    return <div className="min-w-0"><dt className="text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-slate-900 dark:text-slate-100">{value || 'No indicado'}</dd></div>
  }

  return <div className="min-w-0 space-y-5">
    <Alert variant="warning" title="Habilitación temporal de desarrollo / QA">Utiliza exclusivamente datos sintéticos. La autorización integral por rol está pendiente; este flujo no está preparado para datos reales.</Alert>
    <nav aria-label="Progreso del registro"><ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {steps.map((label, index) => <li key={label} className={`min-w-0 rounded-xl border p-3 text-sm ${index === step ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`} aria-current={index === step ? 'step' : undefined}><span className="block text-xs">Paso {index + 1}</span><span className="font-semibold">{label}</span></li>)}
    </ol></nav>
    <h2 ref={heading} tabIndex={-1} className="layout-focus rounded text-lg font-semibold text-slate-900 dark:text-white">Paso {step + 1} de 4: {steps[step]}</h2>
    <p className="text-sm text-slate-600 dark:text-slate-300">Los campos con asterisco son obligatorios. Puedes retroceder sin perder los datos.</p>
    <Form noValidate onSubmit={handleSubmit} status={saving ? 'saving' : 'idle'} actions={<div className="flex flex-wrap gap-3">
      {step > 0 && <Button type="button" variant="secondary" disabled={saving} onClick={() => setStep(step - 1)}>Anterior</Button>}
      <Button type="submit" disabled={saving || uncertain || (step >= 2 && (loading || Boolean(catalogError) || !options.length)) || !communities.length}>{saving ? 'Guardando expediente...' : step === 3 ? 'Confirmar y registrar' : 'Continuar'}</Button>
      <span role="status" className="self-center text-sm text-slate-600 dark:text-slate-300">{saving ? 'Guardando expediente...' : ''}</span>
    </div>}>
      {generalError && <div id="wizard-submission-error" tabIndex={-1} className="layout-focus rounded-xl"><Alert variant="error" title="No se pudo confirmar el registro"><p>{generalError}</p>{uncertain && <Link to="/familias" className="layout-focus mt-2 inline-block underline">Verificar el listado de familias</Link>}</Alert></div>}
      {step === 0 && <FormSection title="Información familiar" description="El estado inicial será ACTIVA y lo asignará el servidor." variant="card">
        <div className="space-y-5"><FormGrid>
          {textField('nombreReferencia', 'Nombre de referencia', draft.nombreReferencia, (value) => changeGeneral('nombreReferencia', value), 'text', true, 150)}
          <FormField id="wizard-comunidadId" label="Comunidad" required error={errors.comunidadId}>
            <select className={controlClass} required value={draft.comunidadId} onChange={(event) => changeGeneral('comunidadId', event.target.value)}>
              <option value="">Selecciona una comunidad</option>
              {communities.map((item) => <option key={item.id} value={item.id}>{item.nombre} — {item.municipio.nombre}</option>)}
            </select>
          </FormField>
          <FormField id="wizard-municipio" label="Municipio" hint="Derivado de la comunidad seleccionada."><input className={controlClass} readOnly value={community?.municipio.nombre ?? ''} /></FormField>
          {textField('fechaIngreso', 'Fecha de ingreso', draft.fechaIngreso, (value) => changeGeneral('fechaIngreso', value), 'date')}
        </FormGrid>{notes('observaciones', draft.observaciones, (value) => changeGeneral('observaciones', value), 2000)}</div>
      </FormSection>}
      {step === 1 && <FormSection title="Integrantes de la familia" description="Registra al menos una persona. Sexo y parentesco son textos opcionales, sin catálogo institucional definido." variant="card">
        <div className="space-y-5">{collectionError('integrantes')}{draft.integrantes.map((row, index) => <fieldset key={row.localId} className="min-w-0 space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-white">Integrante {index + 1}</legend>
          {collectionError(`integrantes.${row.localId}`)}
          <FormGrid>{textField(memberField(row.localId, 'nombreCompleto'), 'Nombre completo', row.nombreCompleto, (value) => changeMember(row.localId, 'nombreCompleto', value), 'text', true)}
            {textField(memberField(row.localId, 'fechaNacimiento'), 'Fecha de nacimiento', row.fechaNacimiento, (value) => changeMember(row.localId, 'fechaNacimiento', value), 'date')}
            {textField(memberField(row.localId, 'sexo'), 'Sexo', row.sexo, (value) => changeMember(row.localId, 'sexo', value))}
            {textField(memberField(row.localId, 'parentesco'), 'Parentesco', row.parentesco, (value) => changeMember(row.localId, 'parentesco', value))}
            {textField(memberField(row.localId, 'telefono'), 'Teléfono', row.telefono, (value) => changeMember(row.localId, 'telefono', value), 'tel')}
          </FormGrid>
          {notes(memberField(row.localId, 'observaciones'), row.observaciones, (value) => changeMember(row.localId, 'observaciones', value))}
          <Button type="button" variant="ghost" disabled={draft.integrantes.length <= 1} aria-label={`Quitar integrante ${index + 1}`} onClick={() => removeRow('integrantes', row.localId)}>Quitar integrante</Button>
        </fieldset>)}<Button type="button" variant="secondary" onClick={addMember}>Agregar integrante</Button></div>
      </FormSection>}
      {step === 2 && <FormSection title="Programas" description="Selecciona al menos un programa existente. El estado de participación se enviará como null hasta disponer de un catálogo oficial." variant="card">
        <div className="space-y-5">{collectionError('programas')}
          {loading ? <LoadingState label="Cargando programas..." /> : catalogError ? <Alert variant="error" title="No se pudieron consultar los programas">{catalogError}<div className="mt-3"><Button type="button" variant="secondary" onClick={retryOptions}>Reintentar</Button></div></Alert> : !options.length ? <Alert variant="warning" title="No hay programas disponibles">El backend no ofrece programas seleccionables. No es posible confirmar el registro.<div className="mt-3"><Button type="button" variant="secondary" onClick={retryOptions}>Reintentar</Button></div></Alert> : <>
            {draft.programas.map((row, index) => <fieldset key={row.localId} className="min-w-0 space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <legend className="px-1 text-sm font-semibold text-slate-900 dark:text-white">Programa {index + 1}</legend>
              {collectionError(`programas.${row.localId}`)}
              <FormGrid><FormField id={`wizard-${programField(row.localId, 'programaId')}`} label="Programa" required error={errors[programField(row.localId, 'programaId')]}>
                <select className={controlClass} required value={row.programaId} onChange={(event) => changeProgram(row.localId, 'programaId', event.target.value)}><option value="">Selecciona un programa</option>{options.map((option) => <option key={option.id} value={option.id} disabled={draft.programas.some((other) => other.localId !== row.localId && Number(other.programaId) === option.id)}>{option.nombre}</option>)}</select>
              </FormField>
                {textField(programField(row.localId, 'fechaIngreso'), 'Fecha de ingreso', row.fechaIngreso, (value) => changeProgram(row.localId, 'fechaIngreso', value), 'date')}
                {textField(programField(row.localId, 'fechaSalida'), 'Fecha de salida', row.fechaSalida, (value) => changeProgram(row.localId, 'fechaSalida', value), 'date')}
              </FormGrid>
              {notes(programField(row.localId, 'observaciones'), row.observaciones, (value) => changeProgram(row.localId, 'observaciones', value))}
              <Button type="button" variant="ghost" disabled={draft.programas.length <= 1} aria-label={`Quitar programa ${index + 1}`} onClick={() => removeRow('programas', row.localId)}>Quitar programa</Button>
            </fieldset>)}
            <Button type="button" variant="secondary" disabled={draft.programas.length >= options.length} onClick={addProgram}>Agregar programa</Button>
          </>}
        </div>
      </FormSection>}
      {step === 3 && <div className="space-y-5 text-sm">
        <FormSection title="Información general" variant="card"><dl className="grid min-w-0 gap-4 sm:grid-cols-2">{summary('Nombre de referencia', draft.nombreReferencia)}{summary('Comunidad', community?.nombre)}{summary('Municipio', community?.municipio.nombre)}{summary('Estado inicial', 'ACTIVA')}{summary('Fecha de ingreso', draft.fechaIngreso)}{summary('Observaciones', draft.observaciones)}</dl><Button type="button" variant="ghost" className="mt-4" onClick={() => setStep(0)}>Corregir familia</Button></FormSection>
        <FormSection title={`Integrantes (${draft.integrantes.length})`} variant="card"><div className="space-y-5">{draft.integrantes.map((row, index) => <div key={row.localId} className="min-w-0 border-b border-slate-200 pb-4 dark:border-slate-800"><h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Integrante {index + 1}</h3><dl className="grid min-w-0 gap-4 sm:grid-cols-2">{summary('Nombre completo', row.nombreCompleto)}{summary('Fecha de nacimiento', row.fechaNacimiento)}{summary('Sexo', row.sexo)}{summary('Parentesco', row.parentesco)}{summary('Teléfono', row.telefono)}{summary('Observaciones', row.observaciones)}</dl></div>)}</div><Button type="button" variant="ghost" className="mt-4" onClick={() => setStep(1)}>Corregir integrantes</Button></FormSection>
        <FormSection title={`Programas (${draft.programas.length})`} variant="card"><div className="space-y-5">{draft.programas.map((row) => <dl key={row.localId} className="grid min-w-0 gap-4 border-b border-slate-200 pb-4 sm:grid-cols-2 dark:border-slate-800">{summary('Programa', options.find(({ id }) => id === Number(row.programaId))?.nombre)}{summary('Fecha de ingreso', row.fechaIngreso)}{summary('Fecha de salida', row.fechaSalida)}{summary('Observaciones', row.observaciones)}</dl>)}</div><Button type="button" variant="ghost" className="mt-4" onClick={() => setStep(2)}>Corregir programas</Button></FormSection>
        <Alert variant="info" title="Revisa antes de confirmar">Se enviará una sola solicitud para crear la familia, sus integrantes y sus programas. No actualices ni cierres la página durante el envío.</Alert>
      </div>}
    </Form>
  </div>
}
