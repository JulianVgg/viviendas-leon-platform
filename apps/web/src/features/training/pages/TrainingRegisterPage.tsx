import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CheckCircle2, ImagePlus, RefreshCw, Search } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import { getTrainingFamilies, getTrainings, registerTrainingAttendance, uploadTrainingPhoto, type Training, type TrainingFamily } from '../services/trainingService'

const card = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'
const director = (roles: string[]) => roles.some(role => role.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'direccion general')

export default function TrainingRegisterPage() {
  const { usuario } = useAuth()
  const [params] = useSearchParams()
  const canWrite = Boolean(usuario && (director(usuario.roles) || usuario.permisos.includes('CAPACITACIONES_WRITE')))
  const [trainings, setTrainings] = useState<Training[]>([])
  const [families, setFamilies] = useState<TrainingFamily[]>([])
  const [selectedId, setSelectedId] = useState(0)
  const [checked, setChecked] = useState<number[]>([])
  const [communityId, setCommunityId] = useState('TODAS')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [photoMessage, setPhotoMessage] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [activities, people] = await Promise.all([getTrainings(), getTrainingFamilies()])
      setTrainings(activities)
      setFamilies(people)
      const requested = Number(params.get('capacitacion') ?? 0)
      setSelectedId(previous => activities.some(v => v.id === previous) ? previous : activities.some(v => v.id === requested) ? requested : 0)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las capacitaciones y familias.')
    } finally { setLoading(false) }
  }, [params])

  useEffect(() => { void refresh() }, [refresh])
  const selected = trainings.find(item => item.id === selectedId)
  useEffect(() => {
    setChecked(selected?.familiasPresentes.map(f => f.id) ?? [])
    setCommunityId(selected?.comunidadId ? String(selected.comunidadId) : 'TODAS')
    setSuccess('')
    setPendingPhotos([])
    setPhotoError('')
    setPhotoMessage('')
  }, [selectedId])

  const groups = useMemo(() => {
    const filter = search.trim().toLocaleLowerCase('es')
    const visible = families.filter(f => (communityId === 'TODAS' || String(f.comunidad.id) === communityId) &&
      (!filter || `${f.nombreReferencia} ${f.comunidad.nombre}`.toLocaleLowerCase('es').includes(filter)))
    const map = new Map<number, { id: number; nombre: string; items: TrainingFamily[] }>()
    for (const family of visible) {
      const group = map.get(family.comunidad.id) ?? { id: family.comunidad.id, nombre: family.comunidad.nombre, items: [] }
      group.items.push(family)
      map.set(group.id, group)
    }
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [families, communityId, search])
  const communities = useMemo(() => [...new Map(families.map(f => [f.comunidad.id, f.comunidad])).values()].sort((a,b) => a.nombre.localeCompare(b.nombre, 'es')), [families])
  const toggle = (id: number) => setChecked(previous => previous.includes(id) ? previous.filter(n => n !== id) : [...previous, id])
  const selectGroup = (ids: number[]) => setChecked(previous => [...new Set([...previous, ...ids])])
  const clearGroup = (ids: number[]) => setChecked(previous => previous.filter(n => !ids.includes(n)))

  const save = async () => {
    if (!selected || !canWrite || saving || checked.length === 0) return
    setSaving(true); setError(''); setSuccess('')
    try {
      const saved = await registerTrainingAttendance(selected.id, checked)
      setTrainings(previous => previous.map(item => item.id === saved.id ? saved : item))
      setSuccess(`Asistencia registrada: ${saved.familiasPresentes.length} familia(s). La capacitación pasó a Realizada.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la asistencia.') }
    finally { setSaving(false) }
  }


  const choosePhotos = (files: FileList | null) => {
    if (!files || !selected) return
    setPhotoError('')
    const chosen = [...files]
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (chosen.some(file => !allowed.has(file.type) || file.size === 0 || file.size > 3 * 1024 * 1024)) {
      setPhotoError('Selecciona fotografías JPG, PNG o WebP, de hasta 3 MB cada una.')
      return
    }
    if (selected.evidencias.length + pendingPhotos.length + chosen.length > 8) {
      setPhotoError('Se admiten como máximo 8 fotografías por capacitación.')
      return
    }
    setPendingPhotos(previous => [...previous, ...chosen])
  }

  const savePhotos = async () => {
    if (!selected || !canWrite || saving || uploading || !pendingPhotos.length) return
    setUploading(true); setPhotoError(''); setPhotoMessage('')
    let uploaded = 0
    try {
      for (const file of pendingPhotos) {
        await uploadTrainingPhoto(selected.id, file)
        uploaded += 1
      }
      setPhotoMessage(`${uploaded} fotografía(s) guardada(s) correctamente.`)
    } catch (cause) {
      setPhotoError(`${uploaded} fotografía(s) guardada(s). ${cause instanceof Error ? cause.message : 'No fue posible completar la subida.'}`)
    } finally {
      setPendingPhotos(previous => previous.slice(uploaded))
      try { setTrainings(await getTrainings()) }
      catch { setPhotoError('Las imágenes pudieron guardarse, pero no se pudo actualizar la lista. Pulsa Actualizar.') }
      setUploading(false)
    }
  }

  return <div>
    <PageMeta title="Registrar capacitación | Viviendas León" description="Registro de familias asistentes" />
    <PageHeader title="Registrar capacitación" description="Selecciona la capacitación y marca las familias presentes por comunidad. No se registra asistencia individual sin identificar a la persona." />
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
    {success && <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"><CheckCircle2 size={18} />{success} <Link className="font-semibold underline" to="/actividades/capacitaciones/historial">Ver historial</Link></p>}
    <section className={`${card} mb-5`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="min-w-0 flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">Capacitación
          <select value={selectedId || ''} onChange={e => setSelectedId(Number(e.target.value))} disabled={loading || saving} className="mt-2 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
            <option value="">Seleccionar capacitación…</option>
            {trainings.map(item => <option key={item.id} value={item.id}>{item.tema} · {item.fecha} · {item.estado === 'REALIZADA' ? 'Realizada' : 'Programada'}</option>)}
          </select>
        </label>
        <Button type="button" variant="secondary" size="sm" disabled={loading || saving} onClick={() => void refresh()}><RefreshCw size={16} /> Actualizar</Button>
      </div>
      {loading && <p role="status" className="mt-3 text-sm text-gray-500">Cargando capacitaciones y familias…</p>}
      {!loading && trainings.length === 0 && <p className="mt-3 text-sm text-gray-500">Todavía no hay capacitaciones. <Link className="text-brand-600 underline" to="/visitas/agenda">Agendar una capacitación</Link></p>}
      {selected && <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800/40">
        <p className="font-semibold text-gray-900 dark:text-white">{selected.tema}</p>
        <p className="mt-1 text-gray-500">{selected.fecha} · {selected.comunidad?.nombre ?? 'Sin comunidad específica'} · Facilitador: {selected.facilitadorNombre || 'No indicado'}</p>
      </div>}
    </section>
    {selected && <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold text-gray-900 dark:text-white">Familias que estuvieron presentes</h2><p className="mt-1 text-sm text-gray-500">Marca una o varias familias. {checked.length} seleccionada(s).</p></div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">{checked.length} presentes</span>
      </div>
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 dark:border-gray-700"><Search size={17} className="text-gray-400" /><input aria-label="Buscar familia" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar familia por nombre" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none dark:text-white" /></label>
        <select aria-label="Filtrar por comunidad" value={communityId} onChange={e => setCommunityId(e.target.value)} className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="TODAS">Todas las comunidades</option>
          {communities.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>
      <div className="max-h-[470px] space-y-4 overflow-y-auto">
        {groups.map(group => <div key={group.id} className="rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-xl bg-gray-50 px-4 py-3 dark:bg-gray-800/40">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{group.nombre} <span className="font-normal text-gray-500">({group.items.length} familias)</span></h3>
            {canWrite && <div className="flex gap-3 text-xs font-semibold"><button type="button" onClick={() => selectGroup(group.items.map(f => f.id))} className="text-brand-600 hover:underline">Seleccionar todas</button><button type="button" onClick={() => clearGroup(group.items.map(f => f.id))} className="text-gray-500 hover:underline">Limpiar</button></div>}
          </div>
          <div className="grid gap-1 p-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map(f => <label key={f.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5">
              <input type="checkbox" disabled={!canWrite || saving} checked={checked.includes(f.id)} onChange={() => toggle(f.id)} className="size-4 accent-brand-500" />
              {f.nombreReferencia}
            </label>)}
          </div>
        </div>)}
        {groups.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No hay familias que coincidan con el filtro.</p>}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
        <p className="text-xs text-gray-500">Al guardar se reemplaza la lista anterior de asistencia familiar de esta capacitación.</p>
        <Button type="button" disabled={!canWrite || saving || checked.length === 0} onClick={() => void save()}>{saving ? 'Guardando…' : `Guardar asistencia (${checked.length})`}</Button>
      </div>
      {!canWrite && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">Tu cuenta puede consultar, pero no registrar asistencia.</p>}
    </section>}
    {selected && <section className={`${card} mt-5`} aria-label="Fotografías de evidencia">
      <div className="mb-3 flex items-center gap-2"><ImagePlus size={20} className="text-brand-500" /><h2 className="font-semibold text-gray-900 dark:text-white">Fotografías de evidencia</h2></div>
      <p className="mb-4 text-sm text-gray-500">Adjunta imágenes de la capacitación. Máximo 8 fotografías JPG, PNG o WebP, hasta 3 MB por archivo. Puedes guardarlas aunque aún no hayas marcado la asistencia.</p>
      {selected.evidencias.length > 0 && <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {selected.evidencias.map(photo => <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700" title={`Ver ${photo.name}`}>
          <img src={photo.url} alt={`Evidencia: ${photo.name}`} loading="lazy" className="h-28 w-full object-cover" />
          <span className="block truncate p-2 text-xs text-gray-600 dark:text-gray-300">{photo.name}</span>
        </a>)}
      </div>}
      {selected.evidencias.length === 0 && <p className="mb-4 text-sm text-gray-500">Todavía no hay fotografías asociadas.</p>}
      {canWrite && <div className="flex flex-wrap items-end gap-3">
        <label className="block min-w-0 flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">Seleccionar fotografías
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={uploading || saving || selected.evidencias.length + pendingPhotos.length >= 8}
            onChange={e => { choosePhotos(e.target.files); e.target.value = '' }}
            className="mt-2 block w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700" />
        </label>
        <Button type="button" disabled={uploading || saving || pendingPhotos.length === 0} onClick={() => void savePhotos()}>
          {uploading ? 'Subiendo…' : `Guardar fotos (${pendingPhotos.length})`}
        </Button>
      </div>}
      {pendingPhotos.length > 0 && <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-300">
        {pendingPhotos.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
          <span className="truncate">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          {!uploading && <button type="button" onClick={() => setPendingPhotos(previous => previous.filter((_, i) => i !== index))} className="font-semibold text-brand-600 hover:underline">Quitar</button>}
        </div>)}
      </div>}
      {photoError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{photoError}</p>}
      {photoMessage && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{photoMessage}</p>}
    </section>}
  </div>
}
