import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { fetchFamilies } from '@/features/families/services/familyService'
import type { FamilyListItem } from '@/features/families/types/family'
import { crops, stages, qualities, weatherOptions, diseases, pests, damage, organicInsecticides, fertilizers, chemicalInsecticides } from '@/features/visits/data/visitCatalogs'

type Finding = { id: string; type: 'plaga' | 'enfermedad'; name: string; damage: string }
type CropEntry = {
  id: string; name: string; stage: string; plants: string; quality: string; notes: string
  findings: Finding[]; production: boolean; perPlantUnits: string; perPlantKg: string
  units: string; kg: string; priceQ: string; priceUSD: string; priceBasis: 'unidad' | 'kg'
}
type Commitment = { id: string; text: string; due: string; category: string }
const steps = ['Información general', 'Evaluación de cultivos', 'Acuerdos y recomendaciones', 'Observaciones y audios']
const input = `${formControlClassName} w-full`
const area = `${formControlClassName} h-auto min-h-24 resize-y`
const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-theme-xs dark:border-slate-800 dark:bg-slate-900 md:p-6'
const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const newCrop = (): CropEntry => ({ id: crypto.randomUUID(), name: '', stage: '', plants: '', quality: '', notes: '', findings: [], production: false, perPlantUnits: '', perPlantKg: '', units: '', kg: '', priceQ: '', priceUSD: '', priceBasis: 'unidad' })
const newCommitment = (): Commitment => ({ id: crypto.randomUUID(), text: '', due: '', category: 'Familia' })
const currencyTotal = (entry: CropEntry, currency: 'priceQ' | 'priceUSD') => {
  const quantity = Number(entry.priceBasis === 'kg' ? entry.kg : entry.units)
  const price = Number(entry[currency])
  if (!entry[currency].trim() || !(entry.priceBasis === 'kg' ? entry.kg : entry.units).trim() || !Number.isFinite(quantity * price)) return '—'
  return (quantity * price).toLocaleString('es-GT', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
}
function Options({ items, placeholder = 'Seleccionar' }: { items: string[]; placeholder?: string }) {
  return <><option value="">{placeholder}</option>{items.map(value => <option key={value} value={value}>{value}</option>)}</>
}

export default function VisitRegisterPage() {
  const [searchParams] = useSearchParams()
  const initialDate = searchParams.get('fecha')
  const [step, setStep] = useState(0)
  const [familyId, setFamilyId] = useState('')
  const [date, setDate] = useState(initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : todayLocal)
  const [weather, setWeather] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [cropsState, setCrops] = useState<CropEntry[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [treatment, setTreatment] = useState('')
  const [treatmentGroup, setTreatmentGroup] = useState('orgánico')
  const [recommendation, setRecommendation] = useState('')
  const [observations, setObservations] = useState('')
  const [familyOptions, setFamilyOptions] = useState<FamilyListItem[]>([])
  const [familiesLoading, setFamiliesLoading] = useState(true)
  const [familiesError, setFamiliesError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setFamiliesLoading(true)
    setFamiliesError('')
    fetchFamilies({ limit: 100, page: 1 }, controller.signal)
      .then(result => setFamilyOptions(result.data))
      .catch((reason: unknown) => { if (!controller.signal.aborted) setFamiliesError(reason instanceof Error ? reason.message : 'No fue posible consultar las familias.') })
      .finally(() => { if (!controller.signal.aborted) setFamiliesLoading(false) })
    return () => controller.abort()
  }, [refresh])

  const selectedFamily = useMemo(() => familyOptions.find(f => String(f.id) === familyId), [familyId, familyOptions])
  const updateCrop = (id: string, patch: Partial<CropEntry>) => setCrops(list => list.map(c => c.id === id ? { ...c, ...patch } : c))
  const updateFinding = (cropId: string, findingId: string, patch: Partial<Finding>) => setCrops(list => list.map(c => c.id === cropId ? { ...c, findings: c.findings.map(f => f.id === findingId ? { ...f, ...patch } : f) } : c))
  const updateCommitment = (id: string, patch: Partial<Commitment>) => setCommitments(list => list.map(c => c.id === id ? { ...c, ...patch } : c))
  const next = () => {
    if (step === 0 && (!familyId || !date)) { setError('Selecciona una familia y una fecha para continuar.'); return }
    setError(''); setShowPreview(false); setStep(s => Math.min(steps.length - 1, s + 1))
  }

  return <>
    <PageMeta title="Registrar visita técnica | Viviendas León" description="Formulario guiado de evaluación agrícola." />
    <PageHeader title="Registrar visita técnica" description="Registra primero lo esencial y abre los detalles solo cuando correspondan. Los datos no se guardarán todavía: esta es la etapa de diseño de la interfaz." actions={<Link to="/visitas/agenda" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm dark:border-slate-700">Volver a agenda</Link>} />
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-200" role="status"><strong>Vista inicial sin persistencia.</strong> Los cambios solo se mantienen mientras permanezcas en esta pantalla. No ingreses información personal ni de producción real hasta integrar permisos y guardado seguro.</div>
    <nav aria-label="Pasos para registrar visita" className="mb-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {steps.map((title, index) => <button key={title} type="button" onClick={() => { if (index > 0 && (!familyId || !date)) { setError('Selecciona una familia y fecha antes de cambiar de paso.'); return }; setStep(index); setError(''); setShowPreview(false) }} aria-current={step === index ? 'step' : undefined} className={`rounded-xl border p-3 text-left text-xs font-medium transition-colors sm:text-sm ${step === index ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`}><span className="mb-1 block text-xs opacity-75">Paso {index + 1} de {steps.length}</span>{title}</button>)}
    </nav>
    <div className="space-y-5">
      {step === 0 && <section className={card} aria-label="Información general">
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">¿A quién visitamos?</h2>
        <p className="mb-5 text-sm text-slate-500">Los datos de las familias se consultan de la API de desarrollo; no son una lista escrita a mano.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="visit-family" label="Familia" required hint="Debe existir previamente en el módulo de familias.">
            <select id="visit-family" className={input} disabled={familiesLoading} value={familyId} onChange={e => setFamilyId(e.target.value)}><option value="">{familiesLoading ? 'Cargando familias...' : 'Selecciona una familia'}</option>{familyOptions.map(f => <option key={f.id} value={String(f.id)}>{f.nombreReferencia} — {f.comunidad.nombre}</option>)}</select>
          </FormField>
          <FormField id="visit-date" label="Fecha de visita" required><input id="visit-date" type="date" className={input} value={date} onChange={e => setDate(e.target.value)}/></FormField>
          <FormField id="visit-weather" label="Condición climática"><select id="visit-weather" className={input} value={weather} onChange={e => setWeather(e.target.value)}><Options items={weatherOptions}/></select></FormField>
          <FormField id="visit-progress" label="¿Cómo le ha ido desde la última visita?" hint="Pregunta inicial; se puede ampliar con audio posteriormente."><textarea id="visit-progress" className={area} value={checkIn} onChange={e => setCheckIn(e.target.value)} placeholder="Avances, dificultades y cambios comentados por la familia..." /></FormField>
        </div>
        {selectedFamily && <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50"><strong>{selectedFamily.nombreReferencia}</strong><p className="mt-1 text-slate-500 dark:text-slate-400">{selectedFamily.comunidad.nombre} · {selectedFamily.integrantes} integrante(s)</p></div>}
        {familiesError && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">Error al consultar familias: {familiesError} <Button variant="secondary" size="sm" type="button" className="ms-2" onClick={() => setRefresh(n=>n+1)}>Reintentar</Button></div>}
      </section>}

      {step === 1 && <section className="space-y-4" aria-label="Evaluación de cultivos">
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Evaluación de cultivos</h2><p className="text-sm text-slate-500">Agrega únicamente los cultivos revisados. Plagas, enfermedades y producción son opcionales.</p></div><Button type="button" onClick={() => setCrops(list => [...list,newCrop()])}>+ Agregar cultivo</Button></div>
        </div>
        {cropsState.length === 0 && <div className={`${card} text-center text-sm text-slate-500`}>Todavía no has agregado un cultivo. Puedes continuar si la visita no incluye evaluación agrícola.</div>}
        {cropsState.map((crop, i) => <article key={crop.id} className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900 dark:text-white">Cultivo {i + 1} {crop.name && <Badge>{crop.name}</Badge>}</h3><Button type="button" size="sm" variant="secondary" onClick={() => setCrops(list => list.filter(c => c.id !== crop.id))}>Quitar</Button></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="Planta" id={`crop-name-${crop.id}`}><select id={`crop-name-${crop.id}`} className={input} value={crop.name} onChange={e => updateCrop(crop.id,{name:e.target.value})}><Options items={crops}/></select></FormField>
            <FormField label="Etapa" id={`crop-stage-${crop.id}`}><select id={`crop-stage-${crop.id}`} className={input} value={crop.stage} onChange={e => updateCrop(crop.id,{stage:e.target.value})}><Options items={stages}/></select></FormField>
            <FormField label="Cantidad de plantas" id={`crop-plants-${crop.id}`}><input id={`crop-plants-${crop.id}`} className={input} type="number" min="0" step="1" value={crop.plants} onChange={e=>updateCrop(crop.id,{plants:e.target.value})}/></FormField>
            <FormField label="Calidad" id={`crop-quality-${crop.id}`}><select id={`crop-quality-${crop.id}`} className={input} value={crop.quality} onChange={e=>updateCrop(crop.id,{quality:e.target.value})}><Options items={qualities}/></select></FormField>
          </div>
          <details className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer font-medium text-slate-900 dark:text-white">¿Detectaste plagas o enfermedades? <span className="text-xs font-normal text-slate-500">({crop.findings.length} hallazgos)</span></summary>
            <div className="mt-4 space-y-3">{crop.findings.map(f => <div key={f.id} className="grid gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40 md:grid-cols-[135px_1fr_110px_auto] md:items-end">
              <FormField id={`finding-type-${f.id}`} label="Tipo"><select id={`finding-type-${f.id}`} className={input} value={f.type} onChange={e => updateFinding(crop.id,f.id,{type:e.target.value as Finding['type'],name:''})}><option value="plaga">Plaga</option><option value="enfermedad">Enfermedad</option></select></FormField>
              <FormField id={`finding-name-${f.id}`} label="Hallazgo"><select id={`finding-name-${f.id}`} className={input} value={f.name} onChange={e => updateFinding(crop.id,f.id,{name:e.target.value})}><Options items={f.type === 'plaga' ? pests : diseases}/></select></FormField>
              <FormField id={`finding-damage-${f.id}`} label="Daño"><select id={`finding-damage-${f.id}`} className={input} value={f.damage} onChange={e => updateFinding(crop.id,f.id,{damage:e.target.value})}><option value="">Sin estimar</option>{damage.map(n => <option key={n} value={n}>{n}%</option>)}</select></FormField>
              <Button type="button" variant="secondary" size="sm" onClick={() => updateCrop(crop.id, {findings: crop.findings.filter(item => item.id !== f.id)})}>Quitar</Button>
            </div>)}<Button type="button" variant="secondary" size="sm" onClick={()=>updateCrop(crop.id,{findings:[...crop.findings,{id:crypto.randomUUID(),type:'plaga',name:'',damage:''}]})}>+ Añadir hallazgo</Button></div>
          </details>
          <details className="mt-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700" open={crop.production || undefined}><summary className="cursor-pointer font-medium text-slate-900 dark:text-white">¿Hubo producción o ventas? <span className="text-xs font-normal text-slate-500">(opcional)</span></summary>
            <div className="mt-4 space-y-4"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={crop.production} onChange={e=>updateCrop(crop.id,{production:e.target.checked})}/> Registrar producción y ventas</label>
              {crop.production && <><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {([['perPlantUnits','Producto/planta (unidades)'],['perPlantKg','Producto/planta (kg)'],['units','Total obtenido (unidades)'],['kg','Total obtenido (kg)']] as const).map(([key,name]) => <FormField key={key} id={`${key}-${crop.id}`} label={name}><input id={`${key}-${crop.id}`} className={input} type="number" min="0" step="any" value={crop[key]} onChange={e=>updateCrop(crop.id,{[key]:e.target.value})}/></FormField>)}
              </div><div className="grid gap-3 md:grid-cols-3"><FormField id={`price-basis-${crop.id}`} label="Precio por"><select id={`price-basis-${crop.id}`} className={input} value={crop.priceBasis} onChange={e=>updateCrop(crop.id,{priceBasis:e.target.value as CropEntry['priceBasis']})}><option value="unidad">Unidad</option><option value="kg">Kilogramo</option></select></FormField><FormField id={`price-q-${crop.id}`} label="Precio de venta (Q)"><input id={`price-q-${crop.id}`} className={input} type="number" min="0" step="any" value={crop.priceQ} onChange={e=>updateCrop(crop.id,{priceQ:e.target.value})}/></FormField><FormField id={`price-usd-${crop.id}`} label="Precio de venta ($)"><input id={`price-usd-${crop.id}`} className={input} type="number" min="0" step="any" value={crop.priceUSD} onChange={e=>updateCrop(crop.id,{priceUSD:e.target.value})}/></FormField></div>
              <div className="grid gap-3 md:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"><div className="text-slate-500">Total de venta (Q)</div><strong className="text-lg text-slate-900 dark:text-white">{currencyTotal(crop,'priceQ')}</strong></div><div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"><div className="text-slate-500">Total de ventas ($)</div><strong className="text-lg text-slate-900 dark:text-white">{currencyTotal(crop,'priceUSD')}</strong></div></div><p className="text-xs text-slate-500">Se calculan con cantidad × precio según la unidad seleccionada. No se convierte entre Q y $.</p></>}
            </div>
          </details>
          <div className="mt-4"><FormField id={`crop-notes-${crop.id}`} label="Observaciones del cultivo"><textarea id={`crop-notes-${crop.id}`} className={area} value={crop.notes} onChange={e=>updateCrop(crop.id,{notes:e.target.value})} placeholder="Solo si hay algo relevante..."/></FormField></div>
        </article>)}
      </section>}

      {step === 2 && <section className={`${card} space-y-5`} aria-label="Acuerdos y recomendaciones">
        <div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recomendaciones y compromisos</h2><p className="mt-1 text-sm text-slate-500">Registra acciones concretas para revisar en la próxima visita. No hace falta marcar listas extensas.</p></div>
        <FormField id="visit-recommendations" label="Recomendación general"><textarea id="visit-recommendations" className={area} value={recommendation} onChange={e=>setRecommendation(e.target.value)} placeholder="Ejemplo: revisar hojas afectadas y retirar maleza..."/></FormField>
        <div className="grid gap-4 md:grid-cols-2"><FormField id="visit-treatment-type" label="Tipo de insumo recomendado"><select id="visit-treatment-type" value={treatmentGroup} className={input} onChange={e=>{setTreatmentGroup(e.target.value);setTreatment('')}}><option value="orgánico">Insecticida orgánico</option><option value="abono">Abono orgánico</option><option value="químico">Producto químico (catálogo preliminar)</option></select></FormField><FormField id="visit-treatment" label="Insumo (si aplica)"><select id="visit-treatment" className={input} value={treatment} onChange={e=>setTreatment(e.target.value)}><Options items={treatmentGroup === 'orgánico' ? organicInsecticides : treatmentGroup === 'abono' ? fertilizers : chemicalInsecticides}/></select></FormField></div>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-slate-900 dark:text-white">Compromisos para seguimiento</h3><Button type="button" size="sm" variant="secondary" onClick={()=>setCommitments(list=>[...list,newCommitment()])}>+ Agregar compromiso</Button></div>
        {commitments.length === 0 && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800/40">No hay compromisos agregados.</p>}
        {commitments.map((c,i) => <div key={c.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-[1fr_150px_170px_auto] md:items-end"><FormField id={`commitment-${c.id}`} label={`Compromiso ${i+1}`}><input id={`commitment-${c.id}`} className={input} value={c.text} onChange={e=>updateCommitment(c.id,{text:e.target.value})} placeholder="Acción que debe realizarse"/></FormField><FormField id={`owner-${c.id}`} label="Responsable"><select id={`owner-${c.id}`} className={input} value={c.category} onChange={e=>updateCommitment(c.id,{category:e.target.value})}><option>Familia</option><option>Técnico</option><option>ONG</option></select></FormField><FormField id={`due-${c.id}`} label="Revisar el"><input id={`due-${c.id}`} type="date" className={input} value={c.due} onChange={e=>updateCommitment(c.id,{due:e.target.value})}/></FormField><Button type="button" variant="secondary" size="sm" onClick={()=>setCommitments(list=>list.filter(item=>item.id!==c.id))}>Quitar</Button></div>)}
      </section>}

      {step === 3 && <section className={`${card} space-y-5`} aria-label="Observaciones y audios">
        <div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Observaciones y audios</h2><p className="mt-1 text-sm text-slate-500">Los audios se gestionarán separados para no compartir las notas internas con las familias.</p></div>
        <FormField id="visit-observations" label="Observaciones técnicas" hint="Se podrán complementar automáticamente con una transcripción revisada por el técnico."><textarea id="visit-observations" className={area} value={observations} onChange={e=>setObservations(e.target.value)} placeholder="Aspectos relevantes que deben quedar en el expediente..."/></FormField>
        <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold text-slate-900 dark:text-white">🎙 Audio técnico</h3><Badge>Próxima etapa</Badge></div><p className="text-sm text-slate-500">Grabación original + transcripción editable. Uso interno, con acceso restringido.</p><div className="mt-3 text-xs text-slate-500">Sin grabación habilitada todavía.</div></div><div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold text-slate-900 dark:text-white">🎙 Audio para la familia</h3><Badge>Próxima etapa</Badge></div><p className="text-sm text-slate-500">Recomendaciones revisadas por el técnico. Compartición manual por WhatsApp primero; automatización sujeta a cuenta Business y consentimiento.</p><div className="mt-3 text-xs text-slate-500">Sin envío habilitado todavía.</div></div></div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/40"><h3 className="font-medium text-slate-900 dark:text-white">Revisión de esta visita</h3><p className="mt-2">Familia: <strong>{selectedFamily?.nombreReferencia ?? 'Sin seleccionar'}</strong> · Fecha: {date} · Cultivos: {cropsState.length} · Hallazgos: {cropsState.reduce((n,c)=>n+c.findings.length,0)} · Compromisos: {commitments.length}</p><p className="mt-2 text-xs text-slate-500">Solo revisión visual. No se creó un expediente, no se guardaron borradores y no se enviaron datos.</p></div>
        <Button type="button" variant="secondary" onClick={()=>setShowPreview(v=>!v)}>{showPreview ? 'Ocultar resumen' : 'Ver resumen de captura'}</Button>
        {showPreview && <div className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700"><p><strong>Contexto:</strong> {checkIn || 'Sin notas'}</p><p className="mt-2"><strong>Recomendación:</strong> {recommendation || 'Sin recomendación'}</p><p className="mt-2"><strong>Insumo:</strong> {treatment || 'Ninguno'}</p><p className="mt-2"><strong>Observaciones:</strong> {observations || 'Sin observaciones'}</p>{cropsState.map(c=><p className="mt-2" key={c.id}>Cultivo: {c.name || 'Sin identificar'} · {c.plants || '—'} plantas · {c.findings.length} hallazgo(s)</p>)}</div>}
      </section>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-8"><Button type="button" variant="secondary" onClick={()=>{setStep(s=>Math.max(0,s-1));setError('')}} disabled={step===0}>Anterior</Button><div className="flex items-center gap-3"><span className="text-xs text-slate-500">Paso {step+1} de {steps.length}</span>{step < steps.length-1 ? <Button type="button" onClick={next}>Siguiente →</Button> : <Link to="/visitas/historial" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium dark:border-slate-700">Ver vista de historial</Link>}</div></div>
    </div>
  </>
}
