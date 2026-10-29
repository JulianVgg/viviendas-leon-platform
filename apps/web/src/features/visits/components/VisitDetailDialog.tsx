import { useEffect, useState, type ReactNode } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, CloudSun, ImageOff, Leaf, MapPin, Maximize2, Minimize2, UserRound, ClipboardCheck, History, Sprout, Camera } from 'lucide-react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import type { VisitListItem } from '@/features/visits/services/visitService'

const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })
const filled = (value?: string | number | null) => value !== undefined && value !== null && String(value).trim() !== ''

function Info({ icon, label, value }: { icon: ReactNode; label: string; value?: string | number | null }) {
  return <div className="flex min-w-0 items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
    <span className="mt-0.5 shrink-0 text-brand-500">{icon}</span>
    <div className="min-w-0"><div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</div><div className="mt-1 break-words text-sm font-medium text-slate-800 dark:text-slate-100">{filled(value) ? value : '—'}</div></div>
  </div>
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900">
    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><span className="text-brand-500">{icon}</span>{title}</h3>{children}
  </section>
}

export default function VisitDetailDialog({ visit, onClose, extra }: { visit: VisitListItem | null; onClose: () => void; extra?: ReactNode }) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [localUrls, setLocalUrls] = useState<string[]>([])
  const photos = visit?.localPhotos
  useEffect(() => {
    const urls = (photos ?? []).map(photo => URL.createObjectURL(photo.blob))
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
  const statusLabel = pending ? 'Sin sincronizar' : visit?.status === 'REALIZADA' ? 'Realizada' : visit?.status === 'PROGRAMADA' && visit.date < new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date()) ? 'Vencida' : 'Programada'
  const statusColor = statusLabel === 'Realizada' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-900' : statusLabel === 'Vencida' ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-900' : 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-900'
  const crops = visit?.capture?.crops ?? []
  const storedFollowUps = visit?.followUps ?? []
  const commitments = storedFollowUps.length ? storedFollowUps : (visit?.capture?.commitments ?? []).map(item => ({ id: item.id, text: item.text, status: 'PENDIENTE', due: item.due, category: item.category }))

  return <Dialog open={Boolean(visit)} onClose={onClose} title={visit ? `Visita · ${visit.familyName}` : 'Detalle de visita'}
    description={visit ? `${visit.community} · ${dateLabel(visit.date)}` : ''} className="visit-detail-modal">
    {visit && <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusColor}`}>{statusLabel}</span><span className="text-xs text-slate-500">{visit.id ? `Visita #${visit.id}` : 'Registro local'}</span></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info icon={<CalendarDays size={17}/>} label="Fecha" value={dateLabel(visit.date)}/>
        <Info icon={<MapPin size={17}/>} label="Comunidad" value={visit.community}/>
        <Info icon={<UserRound size={17}/>} label="Responsable" value={visit.responsibleName}/>
        <Info icon={<Clock3 size={17}/>} label="Turno" value={(visit.capture?.programacion?.timeSlot ?? visit.capture?.timeSlot) === 'MANANA' ? 'Mañana' : (visit.capture?.programacion?.timeSlot ?? visit.capture?.timeSlot) === 'TARDE' ? 'Tarde' : null}/>
      </div>
      <div className={`grid items-start gap-4 ${images.length ? 'lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]' : ''}`}>
        {images.length > 0 && <Section title="Evidencia fotográfica" icon={<Camera size={17}/> }>
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
            {selected?.url ? <button type="button" onClick={() => setZoom(value => !value)} aria-label={zoom ? 'Quitar zoom' : 'Ampliar fotografía'} className="size-full overflow-hidden focus-visible:outline-2 focus-visible:outline-brand-500"><img src={selected.url} alt={`Evidencia: ${selected.name}`} className={`size-full object-contain transition-transform duration-200 ${zoom ? 'scale-150' : ''}`}/></button> : <ImageOff className="text-slate-400" size={30}/>}
            <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-xs text-white">{actualIndex + 1} / {images.length}</span>
            <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 p-2 text-white">{zoom ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}</span>
          </div>
          {images.length > 1 && <div className="mt-3 flex items-center justify-between gap-2"><div className="flex max-w-[75%] gap-2 overflow-x-auto">{images.map((image, i) => <button type="button" key={image.key} aria-label={`Fotografía ${i+1}`} aria-pressed={i===actualIndex} onClick={() => {setIndex(i);setZoom(false)}} className={`size-14 shrink-0 overflow-hidden rounded-lg border-2 ${i===actualIndex ? 'border-brand-500' : 'border-slate-200 dark:border-slate-700'}`}><img src={image.url} alt="" className="size-full object-cover"/></button>)}</div><div className="flex gap-1"><Button type="button" size="sm" variant="secondary" onClick={()=>move(-1)} aria-label="Anterior"><ChevronLeft size={16}/></Button><Button type="button" size="sm" variant="secondary" onClick={()=>move(1)} aria-label="Siguiente"><ChevronRight size={16}/></Button></div></div>}
        </Section>}
        <Section title="Evaluación técnica" icon={<Leaf size={17}/> }>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {filled(visit.capture?.weather) && <Info icon={<CloudSun size={16}/>} label="Clima" value={visit.capture?.weather}/>}
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70"><p className="text-xs font-medium text-slate-500">Cultivos evaluados</p><p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{crops.length ? crops.length : '—'}</p></div>
          </div>
          {filled(visit.capture?.observations) && <div className="mt-3"><p className="text-xs font-medium text-slate-500">Observaciones</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">{visit.capture?.observations}</p></div>}
          {filled(visit.capture?.recommendation) && <div className="mt-3"><p className="text-xs font-medium text-slate-500">Recomendaciones</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{visit.capture?.recommendation}</p></div>}
        </Section>
      </div>
      {!images.length && visit.status === 'REALIZADA' && <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:bg-slate-800/60"><ImageOff size={16}/> Sin evidencia fotográfica</div>}
      {crops.length > 0 && <Section title="Cultivos" icon={<Sprout size={17}/> }><div className="grid gap-3 md:grid-cols-2">{crops.map((crop, i) => <div key={`${crop.cicloCultivoId ?? crop.name}-${i}`} className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-700"><p className="font-semibold text-sm text-slate-900 dark:text-white">{crop.name}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span>Etapa: {crop.stage || '—'}</span><span>Calidad: {crop.quality || '—'}</span>{crop.plants !== null && <span>Plantas: {crop.plants}</span>}</div>{filled(crop.observacionesCultivo) && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{crop.observacionesCultivo}</p>}{crop.findings?.length > 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{crop.findings.length} hallazgo(s)</p>}</div>)}</div></Section>}
      {commitments.length > 0 && <Section title="Compromisos" icon={<ClipboardCheck size={17}/> }><div className="grid gap-2 sm:grid-cols-2">{commitments.map((item,i) => <div key={item.id ?? i} className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/70"><div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="font-semibold">{item.status === 'CUMPLIDO' ? 'Cumplido' : item.status === 'NO_CUMPLIDO' ? 'No cumplido' : 'Pendiente'}</span>{item.due && <span>· {dateLabel(item.due)}</span>}</div><p className="mt-1.5 text-sm text-slate-800 dark:text-slate-100">{item.text}</p></div>)}</div></Section>}
      {Boolean(visit.reprogramaciones?.length) && <Section title="Reprogramaciones" icon={<History size={17}/> }><ol className="space-y-2">{visit.reprogramaciones?.map(item => <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200"><span>{item.oldDate ? dateLabel(item.oldDate) : '—'} → {dateLabel(item.newDate)}</span>{item.reason && <span className="text-slate-500">· {item.reason}</span>}</li>)}</ol></Section>}
      {extra}
    </div>}
  </Dialog>
}
