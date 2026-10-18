import { useEffect, useState, type ReactNode } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, CloudSun, ImageOff, Leaf, MapPin, Maximize2, Minimize2 } from 'lucide-react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import type { VisitListItem } from '@/features/visits/services/visitService'

const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })

function DetailLine({ label, value }: { label: string; value?: string | number | null }) {
  return <div className="border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800">
    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className="mt-1 break-words text-sm leading-relaxed text-slate-800 dark:text-slate-200">{value === null || value === undefined || value === '' ? 'Sin registrar' : value}</dd>
  </div>
}

export default function VisitDetailDialog({ visit, onClose, extra }: { visit: VisitListItem | null; onClose: () => void; extra?: ReactNode }) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [localUrls, setLocalUrls] = useState<string[]>([])
  const photos = visit?.localPhotos

  useEffect(() => {
    const urls = (photos ?? []).map(p => URL.createObjectURL(p.blob))
    setLocalUrls(urls)
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [photos])

  const images = photos?.length
    ? photos.map((photo, i) => ({ key: photo.id, name: photo.name, url: localUrls[i] ?? '' }))
    : (visit?.evidences ?? []).map(photo => ({ key: String(photo.id), name: photo.name, url: photo.url }))
  const actualIndex = images.length ? Math.min(index, images.length - 1) : 0
  const selected = images[actualIndex]
  const move = (delta: number) => { setIndex(i => (i + delta + images.length) % images.length); setZoom(false) }
  const pending = Boolean(visit?.syncStatus && visit.syncStatus !== 'synced')

  return <Dialog open={Boolean(visit)} onClose={onClose} title={visit ? `Detalle de visita · ${visit.familyName}` : 'Detalle de visita'}
    description={visit ? `${visit.community} · ${dateLabel(visit.date)}` : ''} className="visit-detail-modal">
    {visit && <div className="grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
          {selected?.url ? <button type="button" onClick={() => setZoom(v => !v)} aria-label={zoom ? 'Quitar zoom de fotografía' : 'Ampliar fotografía'}
            className="group relative flex size-full items-center justify-center overflow-hidden focus-visible:outline-2 focus-visible:outline-brand-500">
            <img src={selected.url} alt={`Evidencia fotográfica: ${selected.name}`} className={`size-full object-contain transition-transform duration-300 ease-out motion-reduce:transition-none ${zoom ? 'scale-150' : 'group-hover:scale-[1.025]'}`}/>
          </button> : <div className="flex flex-col items-center gap-3 px-6 text-center text-slate-400"><ImageOff size={46} strokeWidth={1.3}/><p className="text-sm">Esta visita no tiene fotografías registradas.</p></div>}
          {selected?.url && <span className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white">{actualIndex + 1} / {images.length}</span>}
          {selected?.url && <span className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-black/60 p-2 text-white">{zoom ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</span>}
        </div>
        {images.length > 0 && <div className="space-y-3">
          <div className="flex items-center justify-between gap-3"><p className="min-w-0 truncate text-xs text-slate-500 dark:text-slate-400" title={selected?.name}>{selected?.name}</p>
            {images.length > 1 && <div className="flex gap-2"><Button type="button" size="sm" variant="secondary" aria-label="Fotografía anterior" onClick={() => move(-1)}><ChevronLeft size={16}/></Button><Button type="button" size="sm" variant="secondary" aria-label="Fotografía siguiente" onClick={() => move(1)}><ChevronRight size={16}/></Button></div>}</div>
          {images.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Miniaturas de evidencia">{images.map((image, i) => <button key={image.key} type="button" aria-label={`Ver fotografía ${i + 1}`} aria-pressed={i === actualIndex} onClick={() => { setIndex(i); setZoom(false) }} className={`size-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${i === actualIndex ? 'border-brand-500 shadow-sm' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'}`}><img className="size-full object-cover" alt="" src={image.url}/></button>)}</div>}
        </div>}
      </div>
      <div className="min-w-0 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={15}/> Fecha</p><p className="mt-1 text-sm font-medium capitalize text-slate-900 dark:text-white">{dateLabel(visit.date)}</p></div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={15}/> Comunidad</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{visit.community}</p></div>
        </div>
        <section aria-label="Datos técnicos de la visita" className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Leaf size={18} className="text-brand-500"/> Evaluación técnica</h3>
          <dl><DetailLine label="Estado" value={pending ? 'Pendiente de sincronización' : visit.status === 'REALIZADA' ? 'Realizada' : 'Programada'}/>
            {visit.responsibleName && <DetailLine label="Técnico responsable" value={visit.responsibleName}/>}
            {visit.capture?.programacion?.date && <DetailLine label="Fecha originalmente programada" value={dateLabel(visit.capture.programacion.date)}/>}
            {(visit.capture?.programacion?.timeSlot ?? visit.capture?.timeSlot) && <DetailLine label="Turno programado" value={(visit.capture?.programacion?.timeSlot ?? visit.capture?.timeSlot) === 'MANANA' ? 'Mañana' : 'Tarde'}/>}
            <DetailLine label="Clima" value={visit.capture?.weather}/><DetailLine label="Cultivos" value={visit.capture?.crops.map(c => c.name).join(', ')}/>
            <DetailLine label="Recomendaciones" value={visit.capture?.recommendation}/><DetailLine label="Insumo recomendado" value={visit.capture?.treatment}/>
            <DetailLine label="Observaciones" value={visit.capture?.observations}/>
            <DetailLine label="Compromisos" value={visit.capture?.commitments.length ?? 0}/></dl>
        </section>
        {visit.capture?.commitments && visit.capture.commitments.length > 0 && <section className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Compromisos registrados</h3><ul className="space-y-2">{visit.capture.commitments.map((c,i) => <li key={i} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200"><strong>{c.category}:</strong> {c.text}{c.due ? ` · ${dateLabel(c.due)}` : ''}</li>)}</ul></section>}
        {extra}
        <p className="flex items-center gap-2 text-xs text-slate-500"><CloudSun size={15}/> Referencia: {visit.id ? `Visita #${visit.id}` : 'Registro local'}</p>
      </div>
    </div>}
  </Dialog>
}
