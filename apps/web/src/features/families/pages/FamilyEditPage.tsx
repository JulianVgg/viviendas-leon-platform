import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CalendarDays, FileText, Home, LoaderCircle, MapPin } from 'lucide-react'
import { useNavigate, useParams } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { FamilyApiError, fetchCommunities, fetchIntegralFamily, updateFamily } from '../services/familyService'
import type { CommunityOption } from '../types/family'
import type { IntegralFamilyRecord } from '../types/familyIntegral'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { buildFamilyUpdate, familyDraftFrom, validateFamilyDraft, type FamilyEditDraft, type FamilyEditErrors } from '../services/familyManagement'

const control = formControlClassName

export default function FamilyEditPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const authorized = Boolean(usuario?.permisos.includes('FAMILIAS_WRITE'))
  const isOnline = useOnlineStatus()
  const [family, setFamily] = useState<IntegralFamilyRecord>()
  const [communities, setCommunities] = useState<CommunityOption[]>([])
  const [draft, setDraft] = useState<FamilyEditDraft>()
  const [initial, setInitial] = useState<FamilyEditDraft>()
  const [errors, setErrors] = useState<FamilyEditErrors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string }>()
  const [reload, setReload] = useState(0)
  const dirty = Boolean(draft && initial && JSON.stringify(draft) !== JSON.stringify(initial))
  const community = communities.find(({ id: communityId }) => communityId === Number(draft?.comunidadId))

  useEffect(() => {
    if (!authorized) return
    const controller = new AbortController()
    Promise.all([fetchIntegralFamily(id, controller.signal), fetchCommunities(controller.signal)])
      .then(([record, options]) => {
        if (controller.signal.aborted) return
        const allOptions = options.some(({ id: optionId }) => optionId === record.comunidad.id) ? options : [record.comunidad, ...options]
        const next = familyDraftFrom(record)
        setFamily(record); setCommunities(allOptions); setDraft(next); setInitial(next); setMessage(undefined)
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

  const changedPayload = useMemo(() => {
    if (!family || !draft || !initial) return null
    return buildFamilyUpdate(family, draft, initial)
  }, [draft, family, initial])

  function change(field: keyof FamilyEditDraft, value: string) {
    setDraft((current) => current ? { ...current, [field]: value } : current)
    setErrors((current) => ({ ...current, [field]: undefined }))
    setMessage(undefined)
  }

  function cancel() {
    if (!dirty || window.confirm('¿Cancelar la edición y descartar los cambios?')) navigate(`/familias/${id}`)
  }

  function retryLoad() {
    setLoading(true)
    setMessage(undefined)
    setReload((value) => value + 1)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft || !family || !changedPayload || saving) return
    if (!isOnline) { setMessage({ kind: 'error', text: 'Se requiere conexión con el servidor para guardar cambios.' }); return }
    const nextErrors = validateFamilyDraft(draft, communities)
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); return }
    if (!dirty) { setMessage({ kind: 'success', text: 'No hay cambios pendientes.' }); return }
    setSaving(true); setMessage(undefined)
    try {
      const confirmed = await updateFamily(family.id, changedPayload)
      let updated = confirmed
      let refreshed = true
      try { updated = await fetchIntegralFamily(String(family.id)) }
      catch { refreshed = false }
      const next = familyDraftFrom(updated)
      setFamily(updated); setDraft(next); setInitial(next)
      setMessage({ kind: 'success', text: refreshed ? 'La información familiar se guardó y se actualizó desde el servidor.' : 'El guardado fue confirmado, pero no se pudo repetir la consulta. Recarga antes de continuar editando.' })
    } catch (cause) {
      if (cause instanceof FamilyApiError) {
        setErrors(Object.fromEntries(cause.details.map(({ field, message: detail }) => [field, detail])) as FamilyEditErrors)
        setMessage({ kind: 'error', text: cause.status === 409 ? 'Otro usuario modificó este expediente. Recarga antes de volver a guardar.' : cause.message })
      } else setMessage({ kind: 'error', text: 'No fue posible guardar los cambios.' })
    } finally { setSaving(false) }
  }

  if (!authorized) return <><PageMeta title="Edición no autorizada | Viviendas León Guatemala" description="Acceso restringido." /><Alert variant="error" title="Acceso denegado">No tienes permiso para editar familias e integrantes.</Alert></>
  return <>
    <PageMeta title="Editar familia | Viviendas León Guatemala" description="Edición de información general de una familia." />
    <PageHeader title="Editar información familiar" description={family ? `${family.nombreReferencia} · Expediente #${family.id}` : 'Carga y actualiza únicamente la información general autorizada.'} />
    {loading && <Card><CardBody><LoadingState label="Cargando información real de la familia..." /></CardBody></Card>}
    {!loading && !family && <Alert variant="error" title="No se pudo abrir la edición"><p>{message?.text}</p><Button type="button" variant="secondary" className="mt-3" onClick={retryLoad}>Reintentar</Button></Alert>}
    {!loading && family && draft && <form noValidate onSubmit={submit} className="space-y-5">
      <Card><CardBody><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Home size={22} /></span><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Expediente #{family.id}</p><h2 className="truncate text-xl font-semibold text-gray-900 dark:text-white">{family.nombreReferencia}</h2></div></div><div><p className="mb-1 text-xs text-gray-500">Estado actual (solo lectura)</p><Badge variant={family.estado === 'ACTIVA' ? 'success' : family.estado === 'RETIRADA' ? 'warning' : 'neutral'}>{family.estado}</Badge></div></div></CardBody></Card>
      {!isOnline && <Alert variant="warning" title="Sin conexión">El borrador permanece únicamente en memoria. Reconecta para guardar o recuperar datos actualizados.</Alert>}
      {message && <Alert variant={message.kind} title={message.kind === 'success' ? 'Cambios guardados' : 'No se pudo guardar'}>{message.text}</Alert>}
      <Card><CardHeader title="Información familiar" description="El estado institucional no puede modificarse desde este formulario." /><CardBody><div className="grid gap-5 md:grid-cols-2">
        <FormField id="family-edit-name" label="Nombre de referencia" required error={errors.nombreReferencia}><div className="relative"><FileText aria-hidden="true" size={17} className="absolute start-3 top-3.5 text-gray-400" /><input id="family-edit-name" className={`${control} ps-10`} value={draft.nombreReferencia} maxLength={150} onChange={(event) => change('nombreReferencia', event.target.value)} /></div></FormField>
        <FormField id="family-edit-community" label="Comunidad" required error={errors.comunidadId}><div className="relative"><MapPin aria-hidden="true" size={17} className="pointer-events-none absolute start-3 top-3.5 text-gray-400" /><select id="family-edit-community" className={`${control} ps-10`} value={draft.comunidadId} onChange={(event) => change('comunidadId', event.target.value)}>{communities.map((option) => <option key={option.id} value={option.id}>{option.nombre}</option>)}</select></div></FormField>
        <FormField id="family-edit-municipality" label="Municipio" hint="Se calcula automáticamente según la comunidad."><input id="family-edit-municipality" className={control} readOnly value={community?.municipio.nombre ?? ''} /></FormField>
        <FormField id="family-edit-date" label="Fecha de ingreso" error={errors.fechaIngreso}><div className="relative"><CalendarDays aria-hidden="true" size={17} className="pointer-events-none absolute start-3 top-3.5 text-gray-400" /><input id="family-edit-date" type="date" className={`${control} ps-10`} value={draft.fechaIngreso} onChange={(event) => change('fechaIngreso', event.target.value)} /></div></FormField>
        <FormField id="family-edit-notes" label="Observaciones" error={errors.observaciones} hint="Máximo 2000 caracteres."><textarea id="family-edit-notes" rows={5} className={`${control} h-auto py-3`} value={draft.observaciones} maxLength={2000} onChange={(event) => change('observaciones', event.target.value)} /></FormField>
      </div></CardBody></Card>
      <div className="sticky bottom-3 z-10 flex flex-wrap justify-end gap-3 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-theme-lg backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95"><Button type="button" variant="secondary" disabled={saving} onClick={cancel}>Cancelar</Button><Button type="submit" disabled={saving || !dirty || !isOnline}>{saving && <LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" />}{saving ? 'Guardando cambios...' : 'Guardar cambios'}</Button></div>
    </form>}
  </>
}
