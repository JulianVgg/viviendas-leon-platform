import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Check, ClipboardCheck, HeartHandshake, Home, LoaderCircle, MapPin, Pencil, Phone, Plus, Trash2, UserRound, UsersRound } from 'lucide-react'
import { Form, FormGrid, FormSection } from '@/components/forms'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import LoadingState from '@/components/ui/LoadingState'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { createIntegralFamily, FamilyApiError, fetchFamilyProgramOptions } from '../services/familyService'
import { buildIntegralPayload, createMemberDraft, createProgramDraft, integralErrorMessage, mapServerErrors, memberField, memberRelationshipOptions, memberSexOptions, programField, stepForField, validateWizardStep } from '../services/familyWizard'
import type { CommunityOption } from '../types/family'
import type { FamilyProgramOption, FamilyWizardInput, IntegralFamilyRecord, MemberDraft, ProgramDraft, WizardErrors } from '../types/familyIntegral'

const steps = [
  { label: 'Familia', description: 'Información general', icon: Home },
  { label: 'Integrantes', description: 'Personas del hogar', icon: UsersRound },
  { label: 'Programas', description: 'Participaciones', icon: HeartHandshake },
  { label: 'Confirmar', description: 'Revisión final', icon: ClipboardCheck },
] as const
const controlClass = formControlClassName
const notesClass = `${controlClass} h-auto min-h-24 py-2`

function initials(name: string) {
  const value = name.trim() || 'Integrante'
  return value.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

function AvatarText({ name, index }: { name: string; index: number }) {
  const colors = [
    'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300',
    'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    'bg-blue-light-100 text-blue-light-700 dark:bg-blue-light-500/20 dark:text-blue-light-300',
  ]
  return <span aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ring-4 ring-white dark:ring-gray-900 ${colors[index % colors.length]}`}>{initials(name)}</span>
}

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

  return <div className="min-w-0 space-y-6">
    <Alert variant="warning" title="Protección de datos">Registra únicamente información autorizada para este entorno y evita incluir datos personales que no sean necesarios.</Alert>
    <nav aria-label="Progreso del registro" className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-xs sm:p-5 dark:border-gray-800 dark:bg-white/[0.03]"><ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-0">
      {steps.map((item, index) => {
        const complete = index < step
        const active = index === step
        const StepIcon = item.icon
        return <li key={item.label} className="relative min-w-0" aria-current={active ? 'step' : undefined}>
          {index < steps.length - 1 && <span aria-hidden="true" className={`absolute start-[calc(50%+1.5rem)] top-5 hidden h-0.5 w-[calc(100%-3rem)] transition-colors duration-300 motion-reduce:transition-none sm:block ${complete ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
          <div className={`relative flex min-h-20 items-center gap-3 rounded-xl px-3 py-2 transition-[background-color,color,transform] duration-300 motion-reduce:transition-none sm:flex-col sm:text-center ${active ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'text-gray-500 dark:text-gray-400'}`}>
            <span className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 bg-white transition-[border-color,background-color,color,transform] duration-300 motion-reduce:transition-none dark:bg-gray-900 ${complete ? 'border-brand-500 bg-brand-500 text-white dark:bg-brand-500' : active ? 'scale-105 border-brand-500 text-brand-600 dark:text-brand-300' : 'border-gray-200 text-gray-400 dark:border-gray-700'}`}>{complete ? <Check size={19} strokeWidth={2.5} /> : <StepIcon size={18} />}</span>
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.label}</span><span className="mt-0.5 hidden text-xs font-normal text-gray-500 lg:block dark:text-gray-400">{item.description}</span></span>
          </div>
        </li>
      })}
    </ol></nav>
    <div><h2 ref={heading} tabIndex={-1} className="layout-focus rounded text-xl font-semibold text-gray-900 dark:text-white">Paso {step + 1} de 4: {steps[step].label}</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Los campos con asterisco son obligatorios. Puedes retroceder sin perder tu avance.</p></div>
    <Form noValidate onSubmit={handleSubmit} status={saving ? 'saving' : 'idle'} actions={<div className="sticky bottom-3 z-10 flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-theme-lg backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
      {step > 0 && <Button type="button" variant="secondary" disabled={saving} onClick={() => setStep(step - 1)}>Anterior</Button>}
      <Button type="submit" disabled={saving || uncertain || (step >= 2 && (loading || Boolean(catalogError) || !options.length)) || !communities.length}>{saving && <LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" />}{saving ? 'Guardando expediente...' : step === 3 ? 'Confirmar y registrar' : 'Continuar'}</Button>
      <span role="status" className="sr-only">{saving ? 'Guardando expediente, espera por favor.' : ''}</span>
    </div>}>
      {generalError && <div id="wizard-submission-error" tabIndex={-1} className="layout-focus rounded-xl"><Alert variant="error" title="No se pudo confirmar el registro"><p>{generalError}</p>{uncertain && <Link to="/familias" className="layout-focus mt-2 inline-block underline">Verificar el listado de familias</Link>}</Alert></div>}
      {step === 0 && <div className="wizard-card-entry"><FormSection title="Información familiar" description="Identifica a la familia y su ubicación. El municipio se completa automáticamente según la comunidad." variant="card">
        <div className="space-y-6"><div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><Home aria-hidden="true" className="mt-0.5 shrink-0" size={20} /><p className="text-sm leading-6">Esta información encabezará el expediente familiar.</p></div><FormGrid>
          {textField('nombreReferencia', 'Nombre de referencia', draft.nombreReferencia, (value) => changeGeneral('nombreReferencia', value), 'text', true, 150)}
          <FormField id="wizard-comunidadId" label="Comunidad" required error={errors.comunidadId}>
            <select className={controlClass} required value={draft.comunidadId} onChange={(event) => changeGeneral('comunidadId', event.target.value)}>
              <option value="">Selecciona una comunidad</option>
              {communities.map((item) => <option key={item.id} value={item.id}>{item.nombre} — {item.municipio.nombre}</option>)}
            </select>
          </FormField>
          <FormField id="wizard-municipio" label="Municipio" hint="Se completa con la comunidad seleccionada."><input className={controlClass} readOnly value={community?.municipio.nombre ?? ''} /></FormField>
          {textField('fechaIngreso', 'Fecha de ingreso', draft.fechaIngreso, (value) => changeGeneral('fechaIngreso', value), 'date', true)}
        </FormGrid>{notes('observaciones', draft.observaciones, (value) => changeGeneral('observaciones', value), 2000)}</div>
        </FormSection></div>}
      {step === 1 && <div className="wizard-card-entry"><FormSection title="Integrantes de la familia" description="Agrega a cada persona del hogar. El teléfono y las observaciones son opcionales." variant="card">
        <div className="space-y-5">{collectionError('integrantes')}{draft.integrantes.map((row, index) => <fieldset key={row.localId} className="wizard-card-entry group min-w-0 space-y-5 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-theme-sm motion-reduce:transform-none motion-reduce:transition-none sm:p-5 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-500/40">
          <legend className="sr-only">Integrante {index + 1}</legend>
          <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800"><div className="flex min-w-0 items-center gap-3"><AvatarText name={row.nombreCompleto} index={index} /><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Integrante {index + 1}</p><h3 className="truncate text-base font-semibold text-gray-900 dark:text-white">{row.nombreCompleto.trim() || 'Nombre pendiente'}</h3><p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Perfil familiar</p></div></div><Button type="button" variant="danger" size="sm" disabled={draft.integrantes.length <= 1} aria-label={`Quitar integrante ${index + 1}`} onClick={() => removeRow('integrantes', row.localId)}><Trash2 size={16} />Quitar</Button></div>
          {collectionError(`integrantes.${row.localId}`)}
          <div><div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200"><UserRound size={17} className="text-brand-500" />Información personal</div><FormGrid>{textField(memberField(row.localId, 'nombreCompleto'), 'Nombre completo', row.nombreCompleto, (value) => changeMember(row.localId, 'nombreCompleto', value), 'text', true)}
            {textField(memberField(row.localId, 'fechaNacimiento'), 'Fecha de nacimiento', row.fechaNacimiento, (value) => changeMember(row.localId, 'fechaNacimiento', value), 'date', true)}
            <FormField id={`wizard-${memberField(row.localId, 'sexo')}`} label="Sexo" required error={errors[memberField(row.localId, 'sexo')]}>
              <select className={controlClass} required value={row.sexo} onChange={(event) => changeMember(row.localId, 'sexo', event.target.value)}>
                <option value="">Selecciona el sexo</option>
                {memberSexOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </FormField>
            <FormField id={`wizard-${memberField(row.localId, 'parentesco')}`} label="Parentesco" required error={errors[memberField(row.localId, 'parentesco')]}>
              <select className={controlClass} required value={row.parentesco} onChange={(event) => changeMember(row.localId, 'parentesco', event.target.value)}>
                <option value="">Selecciona el parentesco</option>
                {memberRelationshipOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </FormField>
          </FormGrid></div>
          <div className="space-y-4 rounded-xl bg-white p-4 dark:bg-gray-900"><div className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200"><Phone size={17} className="text-brand-500" />Información complementaria</div>{textField(memberField(row.localId, 'telefono'), 'Teléfono', row.telefono, (value) => changeMember(row.localId, 'telefono', value), 'tel')}{notes(memberField(row.localId, 'observaciones'), row.observaciones, (value) => changeMember(row.localId, 'observaciones', value))}</div>
        </fieldset>)}<Button type="button" variant="secondary" onClick={addMember}><Plus size={18} />Agregar integrante</Button></div>
      </FormSection></div>}
      {step === 2 && <div className="wizard-card-entry"><FormSection title="Programas asociados" description="Selecciona al menos un programa disponible en el catálogo institucional." variant="card">
        <div className="space-y-5">{collectionError('programas')}
          {loading ? <LoadingState label="Cargando programas..." /> : catalogError ? <Alert variant="error" title="No se pudieron consultar los programas">{catalogError}<div className="mt-3"><Button type="button" variant="secondary" onClick={retryOptions}>Reintentar</Button></div></Alert> : !options.length ? <Alert variant="warning" title="No hay programas disponibles">El backend no ofrece programas seleccionables. No es posible confirmar el registro.<div className="mt-3"><Button type="button" variant="secondary" onClick={retryOptions}>Reintentar</Button></div></Alert> : <>
            {draft.programas.map((row, index) => <fieldset key={row.localId} className="wizard-card-entry min-w-0 space-y-5 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-theme-sm motion-reduce:transform-none motion-reduce:transition-none sm:p-5 dark:border-gray-800 dark:bg-white/[0.02] dark:hover:border-brand-500/40">
              <legend className="sr-only">Programa {index + 1}</legend>
              <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800"><div className="flex min-w-0 items-center gap-3"><span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"><HeartHandshake size={21} /></span><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Programa {index + 1}</p><h3 className="truncate font-semibold text-gray-900 dark:text-white">{options.find(({ id }) => id === Number(row.programaId))?.nombre || 'Programa por seleccionar'}</h3></div></div><Button type="button" variant="danger" size="sm" disabled={draft.programas.length <= 1} aria-label={`Quitar programa ${index + 1}`} onClick={() => removeRow('programas', row.localId)}><Trash2 size={16} />Quitar</Button></div>
              {collectionError(`programas.${row.localId}`)}
              <FormGrid><FormField id={`wizard-${programField(row.localId, 'programaId')}`} label="Programa" required error={errors[programField(row.localId, 'programaId')]}>
                <select className={controlClass} required value={row.programaId} onChange={(event) => changeProgram(row.localId, 'programaId', event.target.value)}><option value="">Selecciona un programa</option>{options.map((option) => <option key={option.id} value={option.id} disabled={draft.programas.some((other) => other.localId !== row.localId && Number(other.programaId) === option.id)}>{option.nombre}</option>)}</select>
              </FormField>
                {textField(programField(row.localId, 'fechaIngreso'), 'Fecha de ingreso', row.fechaIngreso, (value) => changeProgram(row.localId, 'fechaIngreso', value), 'date')}
                {textField(programField(row.localId, 'fechaSalida'), 'Fecha de salida', row.fechaSalida, (value) => changeProgram(row.localId, 'fechaSalida', value), 'date')}
              </FormGrid>
              {notes(programField(row.localId, 'observaciones'), row.observaciones, (value) => changeProgram(row.localId, 'observaciones', value))}
            </fieldset>)}
            <Button type="button" variant="secondary" disabled={draft.programas.length >= options.length} onClick={addProgram}><Plus size={18} />Agregar programa</Button>
          </>}
        </div>
      </FormSection></div>}
      {step === 3 && <div className="wizard-card-entry space-y-5 text-sm">
        <FormSection title="Información general" variant="card"><div className="mb-5 flex items-center gap-3 rounded-xl bg-brand-50 p-4 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><MapPin size={20} /><span className="font-medium">{community?.nombre} · {community?.municipio.nombre}</span></div><dl className="grid min-w-0 gap-4 sm:grid-cols-2">{summary('Nombre de referencia', draft.nombreReferencia)}{summary('Comunidad', community?.nombre)}{summary('Municipio', community?.municipio.nombre)}{summary('Estado inicial', 'Activa')}{summary('Fecha de ingreso', draft.fechaIngreso)}{summary('Observaciones', draft.observaciones)}</dl><Button type="button" variant="ghost" className="mt-5" onClick={() => setStep(0)}><Pencil size={16} />Editar sección</Button></FormSection>
        <FormSection title={`Integrantes (${draft.integrantes.length})`} variant="card"><div className="grid gap-4 lg:grid-cols-2">{draft.integrantes.map((row, index) => <article key={row.localId} className="min-w-0 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]"><div className="mb-4 flex min-w-0 items-center gap-3"><AvatarText name={row.nombreCompleto} index={index} /><div className="min-w-0"><p className="truncate font-semibold text-gray-900 dark:text-white">{row.nombreCompleto}</p><p className="text-xs text-gray-500 dark:text-gray-400">{row.parentesco} · Integrante {index + 1}</p></div></div><dl className="grid min-w-0 gap-3 sm:grid-cols-2">{summary('Nacimiento', row.fechaNacimiento)}{summary('Sexo', row.sexo)}{summary('Teléfono', row.telefono)}{summary('Observaciones', row.observaciones)}</dl></article>)}</div><Button type="button" variant="ghost" className="mt-5" onClick={() => setStep(1)}><Pencil size={16} />Editar sección</Button></FormSection>
        <FormSection title={`Programas (${draft.programas.length})`} variant="card"><div className="grid gap-4 lg:grid-cols-2">{draft.programas.map((row) => <article key={row.localId} className="min-w-0 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.02]"><div className="mb-4 flex items-center gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"><HeartHandshake size={19} /></span><h3 className="font-semibold text-gray-900 dark:text-white">{options.find(({ id }) => id === Number(row.programaId))?.nombre}</h3></div><dl className="grid min-w-0 gap-3 sm:grid-cols-2">{summary('Fecha de ingreso', row.fechaIngreso)}{summary('Fecha de salida', row.fechaSalida)}{summary('Observaciones', row.observaciones)}</dl></article>)}</div><Button type="button" variant="ghost" className="mt-5" onClick={() => setStep(2)}><Pencil size={16} />Editar sección</Button></FormSection>
        <Alert variant="info" title="Revisa antes de confirmar">Se enviará una sola solicitud para crear la familia, sus integrantes y sus programas. No actualices ni cierres la página durante el envío.</Alert>
      </div>}
    </Form>
  </div>
}
