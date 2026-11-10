import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CalendarDays, FileText, Home, LoaderCircle, MapPin } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router'
import '@/features/visits/visits.css'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canWriteFamilies } from '@/features/auth/screenPermissions'
import type { FamilyBatchChange } from '../services/familyService'
import { deleteFamilyPhoto, FamilyApiError, fetchCommunities, fetchIntegralFamily, saveFamilyBatch, saveFamilyPhoto } from '../services/familyService'
import type { CommunityOption } from '../types/family'
import type { FamilyParticipationRecord, IntegralFamilyRecord } from '../types/familyIntegral'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { buildFamilyUpdate, familyDraftFrom, validateFamilyDraft, type FamilyEditDraft, type FamilyEditErrors } from '../services/familyManagement'
import { familyStateLabel } from '../services/familyRecord'
import { onlyNameCharacters } from '../services/familyFieldRules'
import FamilyProgramsSection from '../components/FamilyProgramsSection'
import FamilyPhotoField from '../components/FamilyPhotoField'

const control = formControlClassName
const statuses = ['ACTIVA', 'PENDIENTE_VALIDACION', 'RETIRADA', 'EGRESADA']
const fields = (p: FamilyParticipationRecord) => ({
  estado: p.estado ?? 'ACTIVO', fechaIngreso: p.fechaIngreso?.slice(0, 10) ?? null,
  fechaSalida: p.fechaSalida?.slice(0, 10) ?? null, observaciones: p.observaciones?.trim() || null,
})

export default function FamilyEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { usuario } = useAuth()
  const authorized = Boolean(usuario && canWriteFamilies(usuario))
  const isOnline = useOnlineStatus()
  const [family, setFamily] = useState<IntegralFamilyRecord>()
  const [communities, setCommunities] = useState<CommunityOption[]>([])
  const [draft, setDraft] = useState<FamilyEditDraft>()
  const [initial, setInitial] = useState<FamilyEditDraft>()
  const [programs, setPrograms] = useState<FamilyParticipationRecord[]>([])
  const [originalPrograms, setOriginalPrograms] = useState<FamilyParticipationRecord[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [errors, setErrors] = useState<FamilyEditErrors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string }>(
    (location.state as { photoWarning?: string } | null)?.photoWarning ? { kind: 'error', text: (location.state as { photoWarning: string }).photoWarning } : { kind: 'success', text: '' },
  )
  const [reload, setReload] = useState(0)
  const requestKey = useRef(crypto.randomUUID())
  const dirtyGeneral = Boolean(draft && initial && JSON.stringify(draft) !== JSON.stringify(initial))
  const editedPrograms = useMemo<FamilyBatchChange['programs']>(() => programs.flatMap<FamilyBatchChange['programs'][number]>((program) => {
    if (program.id < 0) return [{ action: 'create' as const, input: { programaId: program.programaId, ...fields(program) } }]
    const original = originalPrograms.find(({ id: originalId }) => originalId === program.id)
    if (!original || JSON.stringify(fields(original)) === JSON.stringify(fields(program))) return []
    return [{ action: 'update' as const, id: program.id, input: { version: program.version, ...fields(program) } }]
  }), [programs, originalPrograms])
  const dirty = dirtyGeneral || editedPrograms.length > 0 || Boolean(photo) || removePhoto
  const community = communities.find(({ id: communityId }) => communityId === Number(draft?.comunidadId))

  useEffect(() => {
    if (!authorized) return
    const controller = new AbortController()
    Promise.all([fetchIntegralFamily(id, controller.signal), fetchCommunities(controller.signal)])
      .then(([record, options]) => {
        if (controller.signal.aborted) return
        const allOptions = options.some(({ id: optionId }) => optionId === record.comunidad.id) ? options : [record.comunidad, ...options]
        const next = familyDraftFrom(record)
        setFamily(record); setCommunities(allOptions); setDraft(next); setInitial(next)
        setPrograms(record.programas); setOriginalPrograms(record.programas)
        setPhoto(null); setRemovePhoto(false); setErrors({})
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setMessage({ kind: 'error', text: cause instanceof FamilyApiError ? cause.message : 'No fue posible cargar la familia.' })
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [authorized, id, reload])

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const beforeLink = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (anchor && !window.confirm('Tienes cambios sin guardar. ¿Deseas abandonar esta página?')) {
        event.preventDefault(); event.stopPropagation()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', beforeLink, true)
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', beforeLink, true) }
  }, [dirty])

  function change(field: keyof FamilyEditDraft, value: string) {
    requestKey.current = crypto.randomUUID()
    setDraft((current) => current ? { ...current, [field]: field === 'nombreReferencia' ? onlyNameCharacters(value) : value } : current)
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage({ kind: 'success', text: '' })
  }

  function onProgramsChange(next: FamilyParticipationRecord[]) {
    requestKey.current = crypto.randomUUID()
    setPrograms(next)
    setMessage({ kind: 'success', text: '' })
  }

  function cancel() {
    if (!dirty || window.confirm('¿Cancelar la edición y descartar los cambios?')) navigate(`/familias/${id}`)
  }

  function retryLoad() { setLoading(true); setReload((value) => value + 1) }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft || !initial || !family || saving || !dirty) return
    if (!isOnline) { setMessage({ kind: 'error', text: 'Se requiere conexión para guardar.' }); return }
    const nextErrors = validateFamilyDraft(draft, communities)
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return }
    setSaving(true); setMessage({ kind: 'success', text: '' })
    let mainSaved = false
    try {
      if (dirtyGeneral || editedPrograms.length) {
        const { version, ...changes } = buildFamilyUpdate(family, draft, initial)
        await saveFamilyBatch(family.id, { version, changes, programs: editedPrograms }, requestKey.current)
        mainSaved = true
      }
      if (photo) await saveFamilyPhoto(family.id, photo)
      else if (removePhoto) await deleteFamilyPhoto(family.id)
      const updated = await fetchIntegralFamily(String(family.id))
      const next = familyDraftFrom(updated)
      setFamily(updated); setDraft(next); setInitial(next)
      setPrograms(updated.programas); setOriginalPrograms(updated.programas)
      setPhoto(null); setRemovePhoto(false); setErrors({})
      requestKey.current = crypto.randomUUID()
      setMessage({ kind: 'success', text: 'Cambios guardados correctamente.' })
    } catch (cause) {
      if (mainSaved) {
        try {
          const updated = await fetchIntegralFamily(String(family.id))
          const next = familyDraftFrom(updated)
          setFamily(updated); setDraft(next); setInitial(next)
          setPrograms(updated.programas); setOriginalPrograms(updated.programas)
        } catch { /* Los datos ya fueron confirmados. No se descarta la selección de fotografía. */ }
        requestKey.current = crypto.randomUUID()
        setMessage({ kind: 'error', text: 'Los datos del expediente se guardaron, pero no se pudo completar la fotografía o actualizar la pantalla. Vuelve a guardar la fotografía; no repitas los otros cambios.' })
      } else if (cause instanceof FamilyApiError) {
        setErrors(Object.fromEntries(cause.details.map(({ field, message: detail }) => [field, detail])) as FamilyEditErrors)
        const detail = cause.details.map(({ message: text }) => text).filter(Boolean).slice(0, 3).join(' ')
        setMessage({ kind: 'error', text: cause.status === 409
          ? 'El expediente cambió o ya tiene un programa asociado. Actualiza antes de repetir el guardado.'
          : `${cause.message}${detail ? ` ${detail}` : ''}` })
      } else setMessage({ kind: 'error', text: 'No se pudo confirmar el guardado. Consulta el expediente antes de repetirlo.' })
    } finally { setSaving(false) }
  }

  if (!authorized) return <><PageMeta title="Edición no autorizada | Viviendas León Guatemala" description="Acceso restringido." /><Alert variant="error" title="Acceso denegado">No tienes permiso para editar familias.</Alert></>
  return <div className="visits-enter space-y-5">
    <PageMeta title="Editar familia | Viviendas León Guatemala" description="Edición integral de una familia." />
    <PageHeader title="Editar información familiar" description={family ? `${family.nombreReferencia} · Expediente #${family.id}` : ''} />
    {loading && <Card><CardBody><LoadingState label="Cargando información de la familia..." /></CardBody></Card>}
    {!loading && !family && <Alert variant="error" title="No se pudo abrir la edición"><p>{message.text}</p><Button type="button" variant="secondary" className="mt-3" onClick={retryLoad}>Reintentar</Button></Alert>}
    {!loading && family && draft && <form noValidate onSubmit={submit} className="space-y-5">
      <Card><CardBody><div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">{family.fotoUrl ? <img className="size-full object-cover" src={family.fotoUrl} alt="Fotografía de referencia" /> : <Home size={22} />}</span>
        <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Expediente #{family.id}</p><h2 className="truncate text-xl font-semibold text-gray-900 dark:text-white">{family.nombreReferencia}</h2></div>
      </div></CardBody></Card>
      {!isOnline && <Alert variant="warning" title="Sin conexión">Reconecta antes de guardar.</Alert>}
      {Boolean(message.text) && <Alert variant={message.kind} title={message.kind === 'success' ? 'Cambios guardados' : 'No se pudo completar'}>{message.text}</Alert>}
      <Card><CardHeader title="Información familiar" /><CardBody><div className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField id="family-edit-name" label="Nombre de referencia" required error={errors.nombreReferencia}><div className="relative"><FileText size={17} aria-hidden="true" className="absolute start-3 top-3.5 text-gray-400" /><input id="family-edit-name" className={`${control} ps-10`} value={draft.nombreReferencia} maxLength={150} onChange={(e) => change('nombreReferencia', e.target.value)} /></div></FormField>
          <FormField id="family-edit-community" label="Comunidad" required error={errors.comunidadId}><div className="relative"><MapPin size={17} aria-hidden="true" className="pointer-events-none absolute start-3 top-3.5 text-gray-400" /><select id="family-edit-community" className={`${control} ps-10`} value={draft.comunidadId} onChange={(e) => change('comunidadId', e.target.value)}>{communities.map((option) => <option key={option.id} value={option.id}>{option.nombre}</option>)}</select></div></FormField>
          <FormField id="family-edit-municipality" label="Municipio"><input id="family-edit-municipality" className={control} readOnly value={community?.municipio.nombre ?? ''} /></FormField>
          <FormField id="family-edit-date" label="Fecha de ingreso" error={errors.fechaIngreso}><div className="relative"><CalendarDays size={17} aria-hidden="true" className="pointer-events-none absolute start-3 top-3.5 text-gray-400" /><input id="family-edit-date" type="date" className={`${control} ps-10`} value={draft.fechaIngreso} onChange={(e) => change('fechaIngreso', e.target.value)} /></div></FormField>
          <FormField id="family-edit-state" label="Estado" error={errors.estado}><select id="family-edit-state" className={control} value={draft.estado} onChange={(e) => change('estado', e.target.value)}>{statuses.map((status) => <option key={status} value={status}>{familyStateLabel(status)}</option>)}</select></FormField>
          <FormField id="family-edit-notes" label="Observaciones" error={errors.observaciones}><textarea id="family-edit-notes" rows={4} className={`${control} h-auto py-3`} value={draft.observaciones} maxLength={2000} onChange={(e) => change('observaciones', e.target.value)} /></FormField>
        </div>
        <FamilyPhotoField file={photo} onChange={(file) => { setPhoto(file); setRemovePhoto(false) }} currentUrl={family.fotoUrl}
          removeExisting={removePhoto} onRemoveExisting={() => setRemovePhoto((current) => !current)} disabled={saving} />
      </div></CardBody></Card>
      <FamilyProgramsSection familyId={family.id} entries={programs} onChange={onProgramsChange} disabled={saving || !isOnline} />
      <div className="sticky bottom-3 z-10 flex flex-wrap justify-end gap-3 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-theme-lg backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
        <Button type="button" variant="secondary" disabled={saving} onClick={cancel}>Cancelar</Button>
        <Button type="submit" disabled={saving || !dirty || !isOnline}>{saving && <LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" />}{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
      </div>
    </form>}
  </div>
}
