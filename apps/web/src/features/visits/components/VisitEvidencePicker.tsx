import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera, ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { MAX_VISIT_PHOTOS, MAX_VISIT_PHOTO_BYTES, type VisitPhotoFile } from '@/features/visits/services/visitService'

const MAX_SOURCE_BYTES = 12 * 1024 * 1024

// La imagen se normaliza a JPEG: menor consumo de cuota offline y un formato predecible para la API.
async function preparePhoto(file: File): Promise<VisitPhotoFile> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Utiliza una fotografía JPG, PNG o WebP. No se admiten fotos HEIC en este navegador.')
  }
  if (file.size > MAX_SOURCE_BYTES) throw new Error('La foto original supera los 12 MB. Usa una imagen más pequeña.')
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Este dispositivo no permite procesar la imagen.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78))
    if (!blob || blob.type !== 'image/jpeg' || blob.size > MAX_VISIT_PHOTO_BYTES) {
      throw new Error('La imagen no pudo comprimirse a menos de 2 MB. Prueba con otra.')
    }
    return { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, '').slice(0, 75) + '.jpg', blob }
  } catch (cause) {
    if (cause instanceof Error && cause.message.startsWith('La ')) throw cause
    throw new Error('No se pudo leer la fotografía. Prueba en JPG o PNG.')
  } finally { URL.revokeObjectURL(url) }
}

export default function VisitEvidencePicker({ photos, onChange, disabled }: { photos: VisitPhotoFile[]; onChange: (files: VisitPhotoFile[]) => void; disabled?: boolean }) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [urls, setUrls] = useState<string[]>([])

  useEffect(() => {
    const next = photos.map(p => URL.createObjectURL(p.blob))
    setUrls(next)
    return () => next.forEach(url => URL.revokeObjectURL(url))
  }, [photos])

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return
    if (photos.length + files.length > MAX_VISIT_PHOTOS) {
      setError(`Se permiten hasta ${MAX_VISIT_PHOTOS} fotografías por visita.`); return
    }
    setBusy(true); setError('')
    try {
      // Todo el lote se valida antes de cambiar el estado del formulario.
      const prepared = await Promise.all(files.map(preparePhoto))
      onChange([...photos, ...prepared])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error procesando fotos.') }
    finally { setBusy(false) }
  }

  return <section aria-label="Evidencia fotográfica" className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40 sm:p-5">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-semibold text-slate-900 dark:text-white">Evidencia fotográfica <span className="text-xs font-normal text-slate-500">(opcional)</span></h3>
</div>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">{photos.length}/{MAX_VISIT_PHOTOS} fotos</span>
    </div>
    <input ref={cameraRef} className="sr-only" tabIndex={-1} aria-label="Capturar foto con cámara" type="file" accept="image/*" capture="environment" onChange={e => void addPhotos(e)} />
    <input ref={galleryRef} className="sr-only" tabIndex={-1} aria-label="Seleccionar fotos de la galería" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => void addPhotos(e)} />
    <div className="flex flex-wrap gap-3">
      <Button type="button" onClick={() => cameraRef.current?.click()} disabled={disabled || busy || photos.length >= MAX_VISIT_PHOTOS}><Camera size={18}/> Abrir cámara</Button>
      <Button type="button" variant="secondary" onClick={() => galleryRef.current?.click()} disabled={disabled || busy || photos.length >= MAX_VISIT_PHOTOS}><ImagePlus size={18}/> Elegir de galería</Button>
    </div>
    {busy && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><LoaderCircle size={15} className="animate-spin"/> Preparando fotografías…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    {photos.length > 0 && <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {photos.map((photo, i) => <li key={photo.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <img src={urls[i]} alt={`Evidencia ${i + 1}`} className="aspect-square w-full object-cover" />
        <div className="flex items-center justify-between gap-1 p-2"><span className="truncate text-xs text-slate-600 dark:text-slate-300" title={photo.name}>{photo.name}</span><button type="button" disabled={disabled || busy} className="shrink-0 rounded-lg p-1 text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-40 dark:text-red-400" aria-label={`Quitar foto ${i + 1}`} onClick={()=>onChange(photos.filter(p=>p.id!==photo.id))}><Trash2 size={16}/></button></div>
      </li>)}
    </ul>}
  </section>
}
