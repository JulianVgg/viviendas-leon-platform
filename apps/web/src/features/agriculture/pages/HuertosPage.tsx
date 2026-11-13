import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, ImagePlus, Layers3, Plus, Search, Warehouse } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import ComponentCard from '@/components/common/ComponentCard'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import FormGrid from '@/components/forms/FormGrid'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canWriteGardens } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { createGarden, listGardenFamilies, listGardens, uploadGardenImage, type FamilyOption, type Garden, type GardenClassification } from '../services/gardens'
import { GardenClassificationFields, entornoLabels } from '../components/GardenClassificationFields'
import EditGardenClassification from '../components/EditGardenClassification'
import GardenScene from '../components/GardenScene'
import { formatAgriculturalDate } from '../components/agriculturalDate'
import FamilyStatusDot, { familySelectLabel } from '@/features/families/components/FamilyStatusDot'
import { mainStructures, matchesGardenGroup, type GardenGroup } from '../services/gardenGroups'

const PAGE_SIZE = 6
const statusLabels: Record<string, string> = { PLANIFICADO: 'Planificado', ACTIVO: 'Activo', INACTIVO: 'Inactivo' }
type Status = 'TODOS' | 'PLANIFICADO' | 'ACTIVO' | 'INACTIVO'

function BtnLink({ to, children, primary = false }: { to: string; children: ReactNode; primary?: boolean }) {
  return <Link to={to} className={`layout-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-theme-xs transition-colors ${primary ? 'bg-brand-500 text-white hover:bg-brand-600' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'}`}>{children}</Link>
}

export default function HuertosPage() {
  const [gardens, setGardens] = useState<Garden[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [group, setGroup] = useState<GardenGroup | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('TODOS')
  const [page, setPage] = useState(1)
  const [params, setParams] = useSearchParams()
  const { usuario } = useAuth()
  const canCreate = Boolean(usuario && canWriteGardens(usuario))
  const online = useOnlineStatus()

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    listGardens(undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setGardens(data); setError('') } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible consultar los huertos.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])

  // Selección compartible por URL, sin cambiar el diseño ni cargar ciclos antes de abrir un huerto.
  const routeGroup = params.get('tipo')
  const selectedGroup = routeGroup && (mainStructures.some(item => item.value === routeGroup) || routeGroup === 'SIN_CLASIFICAR')
    ? routeGroup as GardenGroup : group
  const groupName = selectedGroup === 'SIN_CLASIFICAR'
    ? 'Sin clasificar'
    : mainStructures.find(item => item.value === selectedGroup)?.title
  const unclassified = gardens.filter(item => matchesGardenGroup(item, 'SIN_CLASIFICAR')).length
  const filtered = useMemo(() => {
    if (!selectedGroup) return []
    const q = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    return gardens.filter(garden => {
      if (!matchesGardenGroup(garden, selectedGroup)) return false
      if (status !== 'TODOS' && garden.estado !== status) return false
      if (!q) return true
      const text = [garden.nombre, garden.familia.nombreReferencia, garden.familia.comunidad.nombre]
        .join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      return text.includes(q)
    })
  }, [gardens, selectedGroup, query, status])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const actualPage = Math.min(page, totalPages)
  const shown = filtered.slice((actualPage - 1) * PAGE_SIZE, actualPage * PAGE_SIZE)

  function chooseGroup(next: GardenGroup | null) {
    setGroup(next)
    setQuery('')
    setStatus('TODOS')
    setPage(1)
    setEditingId(null)
    const nextParams = new URLSearchParams(params)
    if (next) nextParams.set('tipo', next)
    else nextParams.delete('tipo')
    nextParams.delete('huertoId')
    setParams(nextParams, { replace: true })
  }

  return <>
    <PageMeta title="Huertos | ViviendasLeón" description="Huertos por tipo de estructura." />
    <PageHeader title="Huertos" description="" actions={canCreate ? <BtnLink to="/gestion-agricola/huertos/nuevo" primary><Plus size={17}/> Agregar huerto</BtnLink> : undefined} />
    {params.has('creado') && <Alert variant="success" className="mb-5">Huerto guardado.</Alert>}
    {params.has('imagenError') && <Alert variant="warning" className="mb-5">El huerto se guardó, pero no se pudo adjuntar su fotografía.</Alert>}
    {!online && <Alert variant="warning" title="Sin conexión" className="mb-5">Los cambios requieren conexión.</Alert>}
    {notice && <Alert variant="success" className="mb-5">{notice}</Alert>}
    {error && <Alert variant="error" title="No se pudo consultar" className="mb-5">{error}<Button type="button" variant="secondary" className="mt-3" onClick={() => setReload(n => n + 1)}>Reintentar</Button></Alert>}

    <section className="space-y-5" aria-label="Tipos de huerto">
      <div className="grid gap-4 lg:grid-cols-3">
        {mainStructures.map(item => {
          const count = gardens.filter(garden => matchesGardenGroup(garden, item.value)).length
          return <button key={item.value} type="button" aria-pressed={selectedGroup === item.value}
            onClick={() => chooseGroup(item.value)}
            className={`layout-focus group overflow-hidden rounded-[1.6rem] border bg-white text-left shadow-theme-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-theme-md motion-reduce:transform-none dark:bg-gray-900 ${selectedGroup === item.value ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-gray-200 hover:border-brand-300 dark:border-gray-800 dark:hover:border-brand-700'}`}>
            <GardenScene structure={item.value} compact showLegend={false} />
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{item.title}</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.caption}</p></div>
              <div className="flex shrink-0 items-center gap-2"><Badge variant="neutral">{loading ? '…' : count} huertos</Badge><ChevronRight size={20} className="text-brand-600 transition-transform group-hover:translate-x-1 motion-reduce:transform-none dark:text-brand-300" /></div>
            </div>
          </button>
        })}
      </div>
      {unclassified > 0 && <button type="button" onClick={() => chooseGroup('SIN_CLASIFICAR')}
        className="layout-focus inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-gray-600 hover:text-brand-600 dark:text-gray-300">
        <Layers3 size={16} /> Sin clasificar ({unclassified}) <ChevronRight size={15} />
      </button>}
    </section>

    {selectedGroup && <section key={selectedGroup} className="garden-view-enter mt-6" aria-label={`Huertos de ${groupName}`}>
      <ComponentCard title={`${groupName} · Huertos`} description="" actions={<Button type="button" variant="secondary" size="sm" onClick={() => chooseGroup(null)}><ArrowLeft size={16}/> Volver a categorías</Button>}>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="relative min-w-[220px] flex-1"><Search size={17} className="pointer-events-none absolute left-3 top-3.5 text-gray-400"/><input aria-label="Buscar huertos" value={query} maxLength={120} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Buscar huerto, familia o comunidad" className={`${formControlClassName} pl-10`}/></label>
          <select aria-label="Estado" className={`${formControlClassName} w-full sm:w-44`} value={status} onChange={event => { setStatus(event.target.value as Status); setPage(1) }}><option value="TODOS">Todos los estados</option><option value="ACTIVO">Activos</option><option value="PLANIFICADO">Planificados</option><option value="INACTIVO">Inactivos</option></select>
          <Badge variant="neutral">{filtered.length} resultados</Badge>
        </div>
        {loading && <LoadingState label="Consultando huertos..." />}
        {!loading && !error && !filtered.length && <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700">No hay huertos con los filtros actuales.</div>}
        {!loading && !error && <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {shown.map(garden => <article key={garden.id} className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-theme-md motion-reduce:transform-none dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3"><h3 className="break-words text-base font-semibold text-gray-900 dark:text-white">{garden.entornoCultivo ? entornoLabels[garden.entornoCultivo] : 'Sin clasificar'}</h3><Badge variant={garden.estado === 'ACTIVO' ? 'success' : 'neutral'}>{statusLabels[garden.estado] || garden.estado}</Badge></div>
            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300"><p className="inline-flex items-center gap-2 font-medium text-gray-900 dark:text-white"><FamilyStatusDot state={garden.familia.estado}/>{garden.familia.nombreReferencia}</p><p>{garden.familia.comunidad.nombre}</p><p>{garden.entornoCultivo ? entornoLabels[garden.entornoCultivo] : 'Sin clasificar'} · {formatAgriculturalDate(garden.fechaInicio)}</p></div>
            <div className="mt-5 flex flex-wrap gap-2"><BtnLink to={`/gestion-agricola/huertos/${garden.id}`} primary><Warehouse size={16}/> Abrir huerto <ArrowUpRight size={14}/></BtnLink>{canCreate && <Button type="button" variant="secondary" size="sm" disabled={!online} onClick={() => setEditingId(current => current === garden.id ? null : garden.id)}>{editingId === garden.id ? 'Cerrar edición' : 'Editar clasificación'}</Button>}</div>
            {canCreate && editingId === garden.id && <div className="garden-view-enter mt-4 border-t border-gray-200 pt-4 dark:border-gray-800"><EditGardenClassification key={garden.id} garden={garden} onCancel={() => setEditingId(null)} onSaved={updated => { setGardens(prev => prev.map(item => item.id === updated.id ? updated : item)); setEditingId(null); setNotice('Clasificación actualizada.') }} /></div>}
          </article>)}
        </div>}
        {!loading && totalPages > 1 && <div className="mt-6 flex items-center justify-end gap-3"><Button type="button" variant="secondary" size="sm" disabled={actualPage === 1} onClick={() => setPage(n => n - 1)}><ChevronLeft size={16}/> Anterior</Button><span className="text-xs text-gray-500">{actualPage} de {totalPages}</span><Button type="button" variant="secondary" size="sm" disabled={actualPage === totalPages} onClick={() => setPage(n => n + 1)}>Siguiente <ChevronRight size={16}/></Button></div>}
      </ComponentCard>
    </section>}
  </>
}

export function CreateGardenPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const online = useOnlineStatus()
  const canCreate = Boolean(usuario && canWriteGardens(usuario))
  const [families, setFamilies] = useState<FamilyOption[]>([])
  const [loading, setLoading] = useState(true)
  const lockedFamilyId = params.get('familiaId')
  const [familyId, setFamilyId] = useState(lockedFamilyId || '')
  const [classification, setClassification] = useState<GardenClassification>({
    tipo: 'FAMILIAR', entornoCultivo: null, detalleEntorno: null, modalidadesProductivas: [],
  })
  const [fechaInicio, setFechaInicio] = useState('')
  const [estado, setEstado] = useState('ACTIVO')
  const [observaciones, setObservaciones] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    listGardenFamilies(controller.signal).then((data) => { if (!controller.signal.aborted) { setFamilies(data); setError('') } }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible cargar las familias.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!canCreate || !online || saving) return
    if (!families.some((item) => item.id === Number(familyId))) { setError('Selecciona una familia registrada.'); return }
    if (file && (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !file.size || file.size > 5 * 1024 * 1024)) {
      setError('Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.'); return
    }
    setSaving(true)
    try {
      const garden = await createGarden({ familiaId: Number(familyId), nombre: null, ...classification, fechaInicio: fechaInicio || null, estado, observaciones: observaciones.trim() || null })
      if (file) {
        try { await uploadGardenImage(garden.id, file) }
        catch { navigate(params.has('familiaId') ? `/familias/${garden.familiaId}?tab=gardens&creado=1&imagenError=${garden.id}` : `/gestion-agricola/huertos?imagenError=${garden.id}`); return }
      }
      navigate(params.has('familiaId') ? `/familias/${garden.familiaId}?tab=gardens&creado=1` : '/gestion-agricola/huertos?creado=1')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible guardar el huerto.') }
    finally { setSaving(false) }
  }

  return <>
    <PageMeta title="Registrar huerto | ViviendasLeón" description="Asociar un huerto con una familia." />
    <PageHeader title="Agregar huerto" description="" actions={<Link to={lockedFamilyId ? `/familias/${lockedFamilyId}?tab=gardens` : '/gestion-agricola/huertos'} className="text-sm text-brand-600 underline">Volver</Link>} />
    {!online && <Alert variant="warning" title="Conexión requerida" className="mb-5">El alta y la carga de imágenes se guardan en el servidor y requieren conexión.</Alert>}
    {!canCreate && <Alert variant="warning" title="Acceso de solo lectura" className="mb-5">Tu perfil no tiene permiso para registrar huertos.</Alert>}
    {error && <Alert variant="error" title="No se pudo completar el registro" className="mb-5">{error}</Alert>}
    <form onSubmit={(event) => void submit(event)} className="garden-view-enter space-y-6">
      <ComponentCard title="Datos del huerto" description="">
        <FormGrid>
          <FormField label="Familia beneficiaria" required hint="El huerto quedará asociado a esta familia."><select className={formControlClassName} required disabled={loading || saving || !canCreate || Boolean(lockedFamilyId)} value={familyId} onChange={(event) => setFamilyId(event.target.value)}><option value="">Seleccionar familia...</option>{families.map((f) => <option key={f.id} value={f.id}>{familySelectLabel(f.nombreReferencia, f.estado)} · {f.comunidad.nombre}</option>)}</select></FormField>
          <GardenClassificationFields value={classification} onChange={setClassification} disabled={saving || !canCreate} />
          <FormField label="Fecha de inicio"><input className={formControlClassName} type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></FormField>
          <FormField label="Estado" required><select className={formControlClassName} required value={estado} onChange={(e) => setEstado(e.target.value)}><option value="PLANIFICADO">Planificado</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></FormField>
          <div className="sm:col-span-2"><FormField label="Observaciones"><textarea className={`${formControlClassName} min-h-28 h-auto`} rows={4} maxLength={2000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Detalles del terreno, estructura y condiciones iniciales" /></FormField></div>
        </FormGrid>
      </ComponentCard>
      <ComponentCard title="Imagen del espacio" description="">
        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 hover:border-brand-500 dark:border-slate-700 dark:hover:border-brand-500"><ImagePlus size={32} className="mx-auto mb-3" /><span className="block font-semibold text-slate-700 dark:text-slate-200">Seleccionar imagen del huerto</span><span>JPG, PNG o WebP · máximo 5 MB</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        {file && <div className="mt-4 space-y-2"><p className="break-all text-sm text-slate-600 dark:text-slate-300">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>{preview && <img src={preview} alt="Vista previa de imagen elegida" className="max-h-72 w-full rounded-lg object-contain" />}<Button type="button" variant="secondary" size="sm" onClick={() => setFile(null)}>Quitar imagen</Button></div>}
      </ComponentCard>
      <div className="flex flex-wrap justify-end gap-3"><Link to={lockedFamilyId ? `/familias/${lockedFamilyId}?tab=gardens` : '/gestion-agricola/huertos'} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-5 text-sm font-medium dark:border-slate-700">Cancelar</Link><Button type="submit" disabled={!canCreate || !online || saving || loading}>{saving ? 'Guardando...' : 'Guardar huerto'}</Button></div>
    </form>
  </>
}
