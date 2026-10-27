import { useEffect, useState, type FormEvent, type ChangeEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ImagePlus, Plus, Sprout } from 'lucide-react'
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
import { createGarden, gardenImageUrl, listGardenFamilies, listGardens, uploadGardenImage, type FamilyOption, type Garden } from '../services/gardens'

const typeLabels: Record<string, string> = { FAMILIAR: 'Familiar', COMUNITARIO: 'Comunitario' }
const statusLabels: Record<string, string> = { PLANIFICADO: 'Planificado', ACTIVO: 'Activo', INACTIVO: 'Inactivo' }

export default function HuertosPage() {
  const [gardens, setGardens] = useState<Garden[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [params] = useSearchParams()
  const { usuario } = useAuth()
  const canCreate = Boolean(usuario && canWriteGardens(usuario))
  const online = useOnlineStatus()

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    listGardens(undefined, controller.signal).then((data) => {
      if (!controller.signal.aborted) { setGardens(data); setError('') }
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible consultar los huertos.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])

  async function changeImage(id: number, event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0]
    if (!image) return
    event.target.value = ''
    setNotice(''); setUploadingId(id)
    try {
      await uploadGardenImage(id, image)
      setNotice(`La imagen del huerto #${id} se guardó en el servidor local.`)
      setReload((n) => n + 1)
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'No fue posible subir la imagen.') }
    finally { setUploadingId(null) }
  }

  return <>
    <PageMeta title="Huertos | ViviendasLeón" description="Registro y consulta de huertos por familia." />
    <PageHeader title="Huertos" description="Gestiona los huertos familiares y comunitarios y sus imágenes satelitales." actions={canCreate ? <Link to="/gestion-agricola/huertos/nuevo" className="layout-focus inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"><Plus size={17} /> Agregar huerto</Link> : undefined} />
    {params.has('creado') && <Alert variant="success" title="Huerto guardado" className="mb-5">El registro quedó asociado con la familia seleccionada.</Alert>}
    {params.has('imagenError') && <Alert variant="warning" title="Imagen pendiente" className="mb-5">El huerto #{params.get('imagenError')} fue registrado, pero no se guardó su imagen. Puedes adjuntarla desde la tarjeta correspondiente.</Alert>}
    {!online && <Alert variant="warning" title="Sin conexión" className="mb-5">La consulta y las altas de huertos requieren conexión con el servidor. El soporte de sincronización offline queda para una fase posterior.</Alert>}
    {notice && <Alert variant="info" className="mb-5">{notice}</Alert>}
    <ComponentCard title="Huertos registrados" description="Hasta 500 huertos recientes; abre un expediente para consultar la información familiar." actions={<Badge>{gardens.length} huertos</Badge>}>
      {loading && <LoadingState label="Consultando huertos..." />}
      {error && <Alert variant="error" title="Error al consultar">{error}<Button variant="secondary" type="button" className="mt-3" onClick={() => setReload((n) => n + 1)}>Reintentar</Button></Alert>}
      {!loading && !error && !gardens.length && <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 py-12 text-center text-slate-500 dark:border-slate-700"><Sprout size={36} /><p>Todavía no hay huertos registrados.</p>{canCreate && <Link className="text-brand-600 underline" to="/gestion-agricola/huertos/nuevo">Registrar el primero</Link>}</div>}
      {!loading && !error && <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{gardens.map((garden) => <article key={garden.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-theme-xs dark:border-slate-800 dark:bg-slate-900">
        {gardenImageUrl(garden) ? <img className="h-44 w-full object-cover" src={gardenImageUrl(garden)!} alt={`Vista satelital de ${garden.nombre || `huerto ${garden.id}`}`} loading="lazy" /> : <div className="flex h-44 items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800"><ImagePlus size={36} aria-label="Sin imagen satelital" /></div>}
        <div className="space-y-3 p-5"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold text-slate-900 dark:text-white">{garden.nombre || `Huerto #${garden.id}`}</h3><Badge>{statusLabels[garden.estado] || garden.estado}</Badge></div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{typeLabels[garden.tipo || ''] || 'Tipo no indicado'} · {garden.fechaInicio || 'Sin fecha'}</p>
        <p className="text-sm"><Link to={`/familias/${garden.familiaId}`} className="text-brand-600 underline dark:text-brand-300">{garden.familia.nombreReferencia}</Link><span className="block text-xs text-slate-500">{garden.familia.comunidad.nombre}</span></p>
        {garden.observaciones && <p className="line-clamp-3 whitespace-pre-wrap text-sm text-slate-500 dark:text-slate-400">{garden.observaciones}</p>}
        {canCreate && <label className={`layout-focus relative inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300 ${!online || uploadingId !== null ? 'opacity-50' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'}`}><ImagePlus size={17} />{uploadingId === garden.id ? 'Guardando...' : garden.tieneImagen ? 'Reemplazar imagen' : 'Añadir imagen'}<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Imagen satelital del huerto ${garden.nombre || garden.id}`} disabled={!online || uploadingId !== null} onChange={(event) => void changeImage(garden.id, event)} /></label>}
        </div>
      </article>)}</div>}
    </ComponentCard>
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
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('FAMILIAR')
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
      const garden = await createGarden({ familiaId: Number(familyId), nombre: nombre.trim() || null, tipo: tipo || null, fechaInicio: fechaInicio || null, estado, observaciones: observaciones.trim() || null })
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
    <PageHeader title="Agregar huerto" description="Registra los datos principales del huerto y, opcionalmente, adjunta una imagen satelital." actions={<Link to={lockedFamilyId ? `/familias/${lockedFamilyId}?tab=gardens` : '/gestion-agricola/huertos'} className="text-sm text-brand-600 underline">Volver</Link>} />
    {!online && <Alert variant="warning" title="Conexión requerida" className="mb-5">El alta y la carga de imágenes se guardan en el servidor y requieren conexión.</Alert>}
    {!canCreate && <Alert variant="warning" title="Acceso de solo lectura" className="mb-5">Tu perfil no tiene permiso para registrar huertos.</Alert>}
    {error && <Alert variant="error" title="No se pudo completar el registro" className="mb-5">{error}</Alert>}
    <form onSubmit={(event) => void submit(event)} className="space-y-6">
      <ComponentCard title="Datos del huerto" description="Información vinculada al expediente de la familia beneficiaria.">
        <FormGrid>
          <FormField label="Familia beneficiaria" required hint="El huerto quedará asociado a esta familia."><select className={formControlClassName} required disabled={loading || saving || !canCreate || Boolean(lockedFamilyId)} value={familyId} onChange={(event) => setFamilyId(event.target.value)}><option value="">Seleccionar familia...</option>{families.map((f) => <option key={f.id} value={f.id}>{f.nombreReferencia} · {f.comunidad.nombre} ({f.estado})</option>)}</select></FormField>
          <FormField label="Nombre del huerto" hint="Opcional según la base de datos."><input className={formControlClassName} maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Huerto principal" /></FormField>
          <FormField label="Tipo de huerto"><select className={formControlClassName} value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="">No especificado</option><option value="FAMILIAR">Familiar</option><option value="COMUNITARIO">Comunitario</option></select></FormField>
          <FormField label="Fecha de inicio"><input className={formControlClassName} type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} /></FormField>
          <FormField label="Estado" required><select className={formControlClassName} required value={estado} onChange={(e) => setEstado(e.target.value)}><option value="PLANIFICADO">Planificado</option><option value="ACTIVO">Activo</option><option value="INACTIVO">Inactivo</option></select></FormField>
          <div className="sm:col-span-2"><FormField label="Observaciones" hint="Describe, por ejemplo, si se trabaja a campo abierto o en macrotúnel."><textarea className={`${formControlClassName} min-h-28 h-auto`} rows={4} maxLength={2000} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Detalles del terreno, estructura y condiciones iniciales" /></FormField></div>
        </FormGrid>
      </ComponentCard>
      <ComponentCard title="Imagen satelital o fotografía del espacio" description="Almacenamiento local temporal de la API; admite JPG, PNG y WebP (máximo 5 MB).">
        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 hover:border-brand-500 dark:border-slate-700 dark:hover:border-brand-500"><ImagePlus size={32} className="mx-auto mb-3" /><span className="block font-semibold text-slate-700 dark:text-slate-200">Seleccionar imagen del huerto</span><span>Haz clic para elegir un archivo</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        {file && <div className="mt-4 space-y-2"><p className="break-all text-sm text-slate-600 dark:text-slate-300">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>{preview && <img src={preview} alt="Vista previa de imagen elegida" className="max-h-72 w-full rounded-lg object-contain" />}<Button type="button" variant="secondary" size="sm" onClick={() => setFile(null)}>Quitar imagen</Button></div>}
      </ComponentCard>
      <div className="flex flex-wrap justify-end gap-3"><Link to={lockedFamilyId ? `/familias/${lockedFamilyId}?tab=gardens` : '/gestion-agricola/huertos'} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-5 text-sm font-medium dark:border-slate-700">Cancelar</Link><Button type="submit" disabled={!canCreate || !online || saving || loading}>{saving ? 'Guardando...' : 'Guardar huerto'}</Button></div>
    </form>
  </>
}
