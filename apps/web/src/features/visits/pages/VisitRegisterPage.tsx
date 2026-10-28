import '../visits.css'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import FormField, { formControlClassName } from '@/components/ui/FormField'
import { FamilyApiError, fetchFamilies } from '@/features/families/services/familyService'
import { getOfflineData, saveOfflineData } from '@/db/offlineDb'
import { useAuth } from '@/features/auth/AuthProvider'
import { CyclesApiError, listCycles, type Cycle } from '@/features/agriculture/services/cyclesService'
import { addCivilDays, DIAS_CICLO_VISITA } from '@/features/visits/services/visitPlanning'
import { saveVisitCapture, todayInGuatemala, type VisitCapture, type CropCapture, type VisitPhotoFile } from '@/features/visits/services/visitService'
import SearchableSelect, { catalogOptions } from '@/features/visits/components/SearchableSelect'
import { getVisitFollowUps, getVisitList, type VisitListItem, type VisitFollowUp, type FollowUpStatus } from '@/features/visits/services/visitService'
import VisitEvidencePicker from '@/features/visits/components/VisitEvidencePicker'
import type { FamilyListItem } from '@/features/families/types/family'
import { crops, stages, qualities, weatherOptions, diseases, pests, damage, organicInsecticides, fertilizers, chemicalInsecticides } from '@/features/visits/data/visitCatalogs'

type Finding = { id: string; type: 'plaga' | 'enfermedad'; name: string; damage: string }
type CropEntry = {
  id: string; cicloCultivoId: number | null; name: string; stage: string; plants: string; quality: string
  findings: Finding[]; production: boolean; perPlantUnits: string; perPlantKg: string
  units: string; kg: string; priceQ: string; priceBasis: 'unidad' | 'kg'
  observacionesCultivo: string
}
type Commitment = { id: string; text: string; due: string; nextVisit: boolean; category: string }
const steps = ['Información general', 'Evaluación de cultivos', 'Recomendaciones y observaciones']
const input = `${formControlClassName} w-full`
const area = `${formControlClassName} h-auto min-h-24 resize-y`
const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-theme-xs dark:border-slate-800 dark:bg-slate-900 md:p-6'
const todayLocal = todayInGuatemala
const newCrop = (): CropEntry => ({ id: crypto.randomUUID(), cicloCultivoId: null, name: '', stage: '', plants: '', quality: '', findings: [], production: false, perPlantUnits: '', perPlantKg: '', units: '', kg: '', priceQ: '', priceBasis: 'unidad', observacionesCultivo: '' })
const newCommitment = (): Commitment => ({ id: crypto.randomUUID(), text: '', due: '', nextVisit: true, category: 'Familia' })
const currencyTotal = (entry: CropEntry, currency: 'priceQ') => {
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
  const initialFamily = searchParams.get('familia')
  const initialScheduled = searchParams.get('programada')
  const [step, setStep] = useState(0)
  const [familyId, setFamilyId] = useState(initialFamily && /^\d+$/.test(initialFamily) ? initialFamily : '')
  const [date, setDate] = useState(initialDate && initialDate === todayLocal() ? initialDate : todayLocal)
  const [weather, setWeather] = useState('')
  const [scheduledVisits, setScheduledVisits] = useState<VisitListItem[]>([])
  const [previousVisits, setPreviousVisits] = useState<VisitListItem[]>([])
  const [scheduledVisitId, setScheduledVisitId] = useState<number | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(true)
  const [scheduleLocal, setScheduleLocal] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  const [followUps, setFollowUps] = useState<VisitFollowUp[]>([])
  const [followUpLoading, setFollowUpLoading] = useState(true)
  const [followUpLocal, setFollowUpLocal] = useState(false)
  const [followUpError, setFollowUpError] = useState('')
  const [followUpRefresh, setFollowUpRefresh] = useState(0)
  const [reviewStates, setReviewStates] = useState<Record<string, FollowUpStatus>>({})
  const [cropsState, setCrops] = useState<CropEntry[]>([])
  const [availableCycles, setAvailableCycles] = useState<Cycle[]>([])
  const [cyclesLoading, setCyclesLoading] = useState(false)
  const [cyclesWarning, setCyclesWarning] = useState('')
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [treatment, setTreatment] = useState('')
  const [treatmentGroup, setTreatmentGroup] = useState('orgánico')
  const [recommendation, setRecommendation] = useState('')
  const [observations, setObservations] = useState('')
  const [photos, setPhotos] = useState<VisitPhotoFile[]>([])
  const [familyOptions, setFamilyOptions] = useState<FamilyListItem[]>([])
  const [familiesLoading, setFamiliesLoading] = useState(true)
  const [familiesError, setFamiliesError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const { usuario } = useAuth()
  const today = todayLocal()
  const overdueVisits = useMemo(() => scheduledVisits.filter(v => v.status === 'PROGRAMADA' && v.date < today && (!usuario || v.responsibleUserId === usuario.id)), [scheduledVisits, today, usuario])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ status: 'synced' | 'pending' | 'failed'; id: string; type: 'PROGRAMADA' | 'REALIZADA' } | null>(null)
  const [error, setError] = useState('')
  const cacheKey = usuario ? `visits:family-options:v1:user:${usuario.id}` : null

  useEffect(() => {
    const controller = new AbortController()
    setCrops([])
    setAvailableCycles([])
    setCyclesWarning('')
    setCyclesLoading(Boolean(usuario && familyId))
    if (!usuario || !familyId) return () => controller.abort()
    const key = `visits:cycles:v1:user:${usuario.id}:family:${familyId}`
    listCycles({ familiaId: Number(familyId) }, controller.signal).then(records => {
      if (controller.signal.aborted) return
      setAvailableCycles(records.filter(record => record.estado === 'ACTIVO'))
      void saveOfflineData(key, records).catch(() => {})
    }).catch(async (reason: unknown) => {
      if (reason instanceof CyclesApiError && [401, 403].includes(reason.status)) {
        if (!controller.signal.aborted) setCyclesWarning('No tienes permiso para consultar siembras.')
        return
      }
      try {
        const cached = await getOfflineData<Cycle[]>(key)
        if (!controller.signal.aborted) {
          setAvailableCycles((cached?.data ?? []).filter(record => record.estado === 'ACTIVO'))
          setCyclesWarning('No se pudieron actualizar los ciclos: comprueba que las siembras estén sincronizadas antes de evaluar.')
        }
      } catch { if (!controller.signal.aborted) setCyclesWarning('No se pudieron consultar ciclos agrícolas.') }
    }).finally(() => { if (!controller.signal.aborted) setCyclesLoading(false) })
    return () => controller.abort()
  }, [familyId, usuario?.id])

  useEffect(() => {
    const controller = new AbortController()
    if (!cacheKey) { setFamiliesLoading(false); return }
    setFamiliesLoading(true)
    setFamiliesError('')
    fetchFamilies({ limit: 100, page: 1 }, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return
        setFamilyOptions(result.data)
        void saveOfflineData(cacheKey, result.data).catch(() => {})
      })
      .catch(async (reason: unknown) => {
        if (controller.signal.aborted) return
        // No presentar datos almacenados si la API denegó acceso.
        if (reason instanceof FamilyApiError && [401, 403].includes(reason.status)) {
          setFamiliesError('No tienes permiso para consultar las familias.'); return
        }
        try {
          const cached = await getOfflineData<FamilyListItem[]>(cacheKey)
          if (!controller.signal.aborted && cached) { setFamilyOptions(cached.data); return }
        } catch { /* avisar al usuario */ }
        if (!controller.signal.aborted) setFamiliesError('No fue posible cargar las familias.')
      })
      .finally(() => { if (!controller.signal.aborted) setFamiliesLoading(false) })
    return () => controller.abort()
  }, [refresh, cacheKey])

  // Muestra citas PROGRAMADAS reales y permite elegir cuál se convertirá en REALIZADA.
  // Una cita sin ID de servidor todavía debe sincronizarse antes de poder enlazarla.
  useEffect(() => {
    if (!usuario) { setScheduleLoading(false); return }
    let active = true
    setScheduleLoading(true)
    setScheduleError('')
    getVisitList(usuario.id).then(result => {
      if (!active) return
      setPreviousVisits(result.items.filter(visit => visit.status === 'REALIZADA'))
      setScheduledVisits(result.items.filter(visit => visit.status === 'PROGRAMADA'))
      setScheduleLocal(result.local)
    }).catch(cause => {
      if (active) { setScheduledVisits([]); setScheduleError(cause instanceof Error ? cause.message : 'No se pudieron consultar las visitas programadas.') }
    }).finally(() => { if (active) setScheduleLoading(false) })
    return () => { active = false }
  }, [usuario])

  const lastFamilyVisit = useMemo(() => previousVisits.filter(visit => String(visit.familyId) === familyId).sort((a,b)=>b.date.localeCompare(a.date))[0], [previousVisits, familyId])
  const familyScheduled = useMemo(() => scheduledVisits.filter(visit =>
    String(visit.familyId) === familyId
  ).sort((a, b) => a.date.localeCompare(b.date)), [scheduledVisits, familyId])

  // La agenda puede pasar ?programada=ID para seleccionar una cita directamente.
  useEffect(() => {
    if (!initialScheduled || !/^\d+$/.test(initialScheduled) || scheduleLoading) return
    const match = scheduledVisits.find(visit => visit.id === Number(initialScheduled) && String(visit.familyId) === familyId)
    if (match?.id && match.date === todayLocal()) setScheduledVisitId(match.id)
  }, [initialScheduled, familyId, scheduleLoading, scheduledVisits])

  useEffect(() => {
    if (!usuario) { setFollowUpLoading(false); return }
    let active = true
    setFollowUpLoading(true)
    setFollowUpError('')
    getVisitFollowUps(usuario.id).then(result => {
      if (active) { setFollowUps(result.items); setFollowUpLocal(result.local) }
    }).catch(cause => {
      if (active) {
        setFollowUps([])
        setFollowUpError(cause instanceof Error ? cause.message : 'No se pudieron consultar los compromisos.')
      }
    }).finally(() => { if (active) setFollowUpLoading(false) })
    return () => { active = false }
  }, [usuario, familyId, followUpRefresh])
  useEffect(() => {
    const recheck = () => setFollowUpRefresh(n => n + 1)
    window.addEventListener('focus', recheck)
    return () => window.removeEventListener('focus', recheck)
  }, [])
  const previousFollowUps = useMemo(() => followUps.filter(item =>
    String(item.familyId) === familyId && item.status !== 'CUMPLIDO' && item.date <= date
  ).sort((a,b) => (a.due ?? a.date).localeCompare(b.due ?? b.date)), [followUps, familyId, date])
  const selectedFamily = useMemo(() => familyOptions.find(f => String(f.id) === familyId), [familyId, familyOptions])
  const addCycleEvaluation = (cycle: Cycle) => {
    setCrops(list => list.some(item => item.cicloCultivoId === cycle.id)
      ? list : [...list, { ...newCrop(), cicloCultivoId: cycle.id, name: cycle.cultivo.nombre }])
  }
  const updateCrop = (id: string, patch: Partial<CropEntry>) => setCrops(list => list.map(c => c.id === id ? { ...c, ...patch } : c))
  const updateFinding = (cropId: string, findingId: string, patch: Partial<Finding>) => setCrops(list => list.map(c => c.id === cropId ? { ...c, findings: c.findings.map(f => f.id === findingId ? { ...f, ...patch } : f) } : c))
  const updateCommitment = (id: string, patch: Partial<Commitment>) => setCommitments(list => list.map(c => c.id === id ? { ...c, ...patch } : c))
  const next = () => {
    if (step === 0 && (!familyId || !date)) { setError('Selecciona una familia y una fecha para continuar.'); return }
    setError(''); setStep(s => Math.min(steps.length - 1, s + 1))
  }

  const numberOrNull = (value: string) => value.trim() === '' ? null : Number(value)
  const save = async (type: 'PROGRAMADA' | 'REALIZADA') => {
    if (saving || saved) return
    if (!usuario) { setError('Tu sesión no está disponible. Inicia sesión nuevamente.'); return }
    if (!selectedFamily || !date) { setError('Selecciona una familia y la fecha.'); setStep(0); return }
    if (date !== todayLocal()) { setError('La visita debe registrarse con la fecha real de hoy. No se pueden registrar visitas con una fecha anterior o futura.'); setStep(0); return }
    if (scheduledVisitId && familyScheduled.some(v=>v.id===scheduledVisitId && v.date !== date)) { setError('La visita programada tiene otra fecha. Reprográmala primero desde la agenda.'); setStep(0); return }
    if (!scheduledVisitId && familyScheduled.length) { setError('Esta familia ya tiene una visita programada. Reprográmala desde el calendario.'); setStep(0); return }
    if (scheduledVisitId && !familyScheduled.some(visit => visit.id === scheduledVisitId && visit.status === 'PROGRAMADA')) {
      setError('La cita programada seleccionada ya no está disponible. Actualiza la página y vuelve a elegir.'); setStep(0); return
    }
    const selectedCycleIds = cropsState.map(c => c.cicloCultivoId).filter((id): id is number => id !== null)
    if (new Set(selectedCycleIds).size !== selectedCycleIds.length) {
      setError('Una siembra solo puede evaluarse una vez por visita.'); setStep(1); return
    }
    if (cropsState.some(c => !c.name || c.findings.some(f => !f.name || !f.damage))) {
      setError('Completa los cultivos y los hallazgos agregados antes de guardar.'); setStep(1); return
    }
    if (commitments.some(c => !c.nextVisit && !c.due)) { setError('Selecciona la fecha de revisión del compromiso.'); setStep(2); return }
    if (commitments.some(c => !c.text.trim())) {
      setError('Completa los compromisos agregados o elimínalos.'); setStep(2); return
    }
    const cropNumbers = cropsState.flatMap(c => [c.plants, c.perPlantUnits, c.perPlantKg, c.units, c.kg, c.priceQ])
    if (cropNumbers.some(value => value.trim() && (!Number.isFinite(Number(value)) || Number(value) < 0)) ||
        cropsState.some(c => c.plants.trim() && !Number.isSafeInteger(Number(c.plants)))) {
      setError('Revisa las cantidades y precios; deben ser números positivos.'); setStep(1); return
    }
    if (cropsState.some(c => c.observacionesCultivo.length > 2000)) {
      setError('Las observaciones del cultivo no pueden superar 2000 caracteres.'); setStep(1); return
    }
    const cropsCapture: CropCapture[] = cropsState.map(c => ({
      ...(c.cicloCultivoId ? { cicloCultivoId: c.cicloCultivoId } : {}),
      name: c.name, stage: c.stage, quality: c.quality, plants: numberOrNull(c.plants),
      ...(c.observacionesCultivo.trim() ? { observacionesCultivo: c.observacionesCultivo.trim() } : {}),
      findings: c.findings.map(f => ({ type: f.type, name: f.name, damage: f.damage })),
      production: c.production, perPlantUnits: c.production ? numberOrNull(c.perPlantUnits) : null,
      perPlantKg: c.production ? numberOrNull(c.perPlantKg) : null,
      units: c.production ? numberOrNull(c.units) : null, kg: c.production ? numberOrNull(c.kg) : null,
      priceQ: c.production ? numberOrNull(c.priceQ) : null,
      priceUSD: null, // Los importes en dólares se calcularán en reportes.
      priceBasis: c.priceBasis,
    }))
    const payload: VisitCapture = {
      familyId: Number(familyId), date, status: type, capturedAt: type === 'REALIZADA' ? new Date().toISOString() : undefined, weather,
      ...(scheduledVisitId ? { scheduledVisitId } : {}),
      checkIn: '', crops: cropsCapture, recommendation: recommendation.trim(),
      treatment, observations: observations.trim(),
      commitments: commitments.map(c => ({ id: c.id, text: c.text.trim(), due: c.nextVisit ? null : c.due || null, nextVisit: c.nextVisit, category: c.category as 'Familia' | 'ONG' })),
      reviews: type === 'REALIZADA' ? previousFollowUps.filter(f => reviewStates[f.id] && reviewStates[f.id] !== f.status).map(f => ({ id: f.id, status: reviewStates[f.id] })) : [],
    }
    setError(''); setSaving(true)
    try {
      const result = await saveVisitCapture(usuario.id, selectedFamily.nombreReferencia, selectedFamily.comunidad.nombre, payload, photos)
      setSaved({ ...result, type })
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la visita en este dispositivo.')
    } finally { setSaving(false) }
  }

  return <>
    <PageMeta title="Registrar visita técnica | Viviendas León" description="Formulario guiado de evaluación agrícola." />
    <PageHeader title="Registrar visita técnica" description="" actions={<Link to="/visitas/agenda" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm dark:border-slate-700">Volver a agenda</Link>} />
    <nav aria-label="Pasos para registrar visita" className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
      {steps.map((title, index) => <button key={title} type="button" onClick={() => { if (index > 0 && (!familyId || !date)) { setError('Selecciona una familia y fecha antes de cambiar de paso.'); return }; setStep(index); setError('');  }} aria-current={step === index ? 'step' : undefined} className={`rounded-xl border p-3 text-left text-xs font-medium transition-colors sm:text-sm ${step === index ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'}`}><span className="mb-1 block text-xs opacity-75">Paso {index + 1} de {steps.length}</span>{title}</button>)}
    </nav>
    <div className="space-y-5">
      {step === 0 && <section className={card} aria-label="Información general">
        <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">¿A quién visitamos?</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SearchableSelect id="visit-family" label="Familia" required disabled={familiesLoading} value={familyId} onChange={value => { setFamilyId(value); setScheduledVisitId(null) }}
            placeholder={familiesLoading ? 'Cargando familias...' : 'Buscar familia o comunidad...'}
            options={familyOptions.map(f => ({ value: String(f.id), label: `${f.nombreReferencia} — ${f.comunidad.nombre}` }))} />
          <FormField id="visit-date" label="Fecha de visita" required><input id="visit-date" type="date" className={input} value={date} min={today} max={today} onChange={e => setDate(e.target.value)}/></FormField>
          {familyId && lastFamilyVisit && <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Última visita: <strong>{lastFamilyVisit.date}</strong> · Próxima sugerida: <strong>{addCivilDays(lastFamilyVisit.date, DIAS_CICLO_VISITA)}</strong></div>}
          {familyId && overdueVisits.some(v => String(v.familyId) === familyId) && <div role="alert" className="md:col-span-2 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">Esta familia tiene una visita programada vencida. <Link className="font-semibold underline" to="/visitas/agenda">Ir al calendario para reprogramarla</Link> antes de registrarla.</div>}
          {familyId && <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-700 dark:bg-blue-500/10">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Visitas programadas de esta familia</h3>
            {scheduleLoading ? <p className="mt-3 text-sm text-gray-500">Buscando citas programadas…</p>
            : scheduleError ? <p role="alert" className="mt-3 text-sm text-red-600">{scheduleError}. No es posible confirmar las citas hasta recuperar la conexión.</p>
            : familyScheduled.length ? <div className="mt-3 space-y-2" role="radiogroup" aria-label="Vincular visita programada">
              {familyScheduled.map(visit => <label key={visit.operationId ?? visit.id} className={`flex items-start gap-3 rounded-lg border p-3 text-sm dark:bg-gray-900 ${visit.date < today ? 'border-rose-300 bg-rose-50 dark:bg-rose-500/10' : 'bg-white'} ${scheduledVisitId === visit.id && visit.id !== null ? 'border-brand-500 ring-1 ring-brand-300' : 'border-gray-200 dark:border-gray-700'}`}>
                <input type="radio" name="scheduled-visit" className="mt-1 accent-brand-500" checked={scheduledVisitId === visit.id && visit.id !== null} disabled={!visit.id || visit.date !== today || Boolean(visit.syncStatus && visit.syncStatus !== 'synced')} onChange={() => setScheduledVisitId(visit.id)} />
                <span><strong className="block text-gray-900 dark:text-white">{new Date(`${visit.date}T12:00:00`).toLocaleDateString('es-GT', {day:'numeric', month:'long', year:'numeric'})}</strong>
                  <span className="mt-1 block text-xs text-gray-600 dark:text-gray-300">{visit.capture?.timeSlot === 'TARDE' ? 'Tarde' : visit.capture?.timeSlot === 'MANANA' ? 'Mañana' : 'Sin turno'} · Responsable: {visit.responsibleName || 'Sin dato'}</span>
                  {visit.date < today && <span className="mt-1 block text-xs font-semibold text-rose-700 dark:text-rose-300">Vencida · Reprogramar antes de registrar. <Link to="/visitas/agenda" className="underline">Abrir calendario</Link></span>}
                  {visit.date > today && <span className="mt-1 block text-xs text-blue-700">Esta visita todavía no corresponde a hoy.</span>}
                  {!visit.id && <span className="mt-1 block text-xs text-amber-700">Pendiente de sincronizar. Primero sincroniza esta cita para vincularla.</span>}
                </span>
              </label>)}
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
                <input type="radio" name="scheduled-visit" className="accent-brand-500" disabled={familyScheduled.length > 0} checked={scheduledVisitId === null} onChange={() => setScheduledVisitId(null)}/>
                Registrar sin vincular a una cita (visita no programada)
              </label>
            </div> : <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">No se encontraron visitas programadas para esta familia. Puedes registrar una visita no programada.</p>}
            {scheduleLocal && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Datos de agenda almacenados localmente. Confirma la cita al recuperar conexión.</p>}
          </div>}
          <FormField id="visit-weather" label="Condición climática"><select id="visit-weather" className={input} value={weather} onChange={e => setWeather(e.target.value)}><Options items={weatherOptions}/></select></FormField>
          <div className="md:col-span-2 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-700 dark:bg-gray-800/30">
            <h3 className="font-semibold text-gray-900 dark:text-white">¿Cómo le ha ido desde la última visita?</h3>
            {followUpLocal && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">Consultando datos locales: pueden faltar compromisos que todavía no se han descargado en este dispositivo.</p>}
            {followUpError && <div role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
              No fue posible consultar los seguimientos: {followUpError}. No significa que la familia no tenga compromisos.
              <button type="button" className="ml-2 font-semibold underline" onClick={() => setFollowUpRefresh(n => n + 1)}>Reintentar</button>
            </div>}
            {!familyId ? <p className="mt-3 text-sm text-gray-500">Selecciona una familia para consultar los pendientes.</p>
              : followUpError ? null
              : followUpLoading ? <p className="mt-3 text-sm text-gray-500">Consultando compromisos anteriores…</p>
              : previousFollowUps.length === 0 ? <p className="mt-3 rounded-lg bg-white p-3 text-sm text-gray-500 dark:bg-gray-900">{followUpLocal ? 'No hay seguimientos de esta familia disponibles en el caché de este dispositivo. Conecta con la API y vuelve a intentar para confirmar los pendientes.' : 'No hay compromisos anteriores pendientes para esta familia. En la primera visita podrás agregarlos en el paso 3.'}</p>
              : <div className="mt-3 space-y-3">{previousFollowUps.map(f => <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{f.text}</p>
                <p className="mt-1 text-xs text-gray-500">Responsable: {f.category}{f.due ? ` · Revisar: ${f.due}` : ''}{f.local ? ' · Pendiente de sincronizar' : ''}</p>
                <fieldset className="mt-3"><legend className="mb-1 text-xs text-gray-500">Resultado del compromiso</legend>
                <div className="flex flex-wrap gap-2">{([['CUMPLIDO','Cumplió'],['PENDIENTE','Pendiente']] as const).map(([status,label]) => <label key={status}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium ${(reviewStates[f.id] ?? f.status) === status ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'}`}>
                  <input type="radio" name={`followup-${f.id}`} className="mr-1.5 accent-brand-500" checked={(reviewStates[f.id] ?? f.status) === status}
                    onChange={() => setReviewStates(previous => ({ ...previous, [f.id]:status }))} />{label}
                </label>)}</div>{f.due && f.due < today && <p className="mt-2 text-xs font-medium text-rose-700">Compromiso vencido · <Link to={`/visitas/agenda?seguimiento=${f.id}`} className="underline">Reprogramar desde calendario</Link></p>}</fieldset>
              </div>)}</div>}
          </div>
        </div>
        {selectedFamily && <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50"><strong>{selectedFamily.nombreReferencia}</strong><p className="mt-1 text-slate-500 dark:text-slate-400">{selectedFamily.comunidad.nombre} · {selectedFamily.integrantes} integrante(s)</p></div>}
        {familiesError && <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">Error al consultar familias: {familiesError} <Button variant="secondary" size="sm" type="button" className="ms-2" onClick={() => setRefresh(n=>n+1)}>Reintentar</Button></div>}
      </section>}

      {step === 1 && <section className="space-y-4" aria-label="Evaluación de cultivos">
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Evaluación de cultivos</h2>
            {availableCycles.length === 0 && <Button type="button" disabled={!familyId} onClick={() => setCrops(list => [...list,newCrop()])}>+ Evaluación manual</Button>}
          </div>
          {cyclesLoading && <p className="mt-3 text-sm text-slate-500">Cargando siembras...</p>}
          {cyclesWarning && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">{cyclesWarning}</p>}
          {familyId && !cyclesLoading && availableCycles.length > 0 && <div className="mt-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Siembras de la familia</h3>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {availableCycles.map(cycle => {
                const selectedCycle = cropsState.some(item => item.cicloCultivoId === cycle.id)
                return <div key={cycle.id} className={`rounded-xl border p-3 ${selectedCycle ? 'border-brand-300 bg-brand-50 dark:border-brand-600 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="text-sm font-semibold text-slate-900 dark:text-white">{cycle.cultivo.nombre}</p>
                      <p className="mt-1 text-xs text-slate-500">{cycle.huerto.nombre || `Huerto #${cycle.huertoId}`}</p>
                      <p className="mt-1 text-xs text-slate-500">{cycle.cantidadPlantas ?? '—'} plantas iniciales · {cycle.fechaSiembra || 'Sin fecha'}</p>
                    </div>
                    <Button size="sm" type="button" variant="secondary" disabled={selectedCycle} onClick={() => addCycleEvaluation(cycle)}>
                      {selectedCycle ? 'Seleccionada' : 'Evaluar'}
                    </Button>
                  </div>
                </div>
              })}
            </div>
          </div>}
          {!cyclesLoading && !cyclesWarning && availableCycles.length === 0 && familyId && <p className="mt-3 text-sm text-slate-500">Sin siembras activas.</p>}
        </div>
        {cropsState.length === 0 && <div className={`${card} text-center text-sm text-slate-500`}>Selecciona una siembra para evaluarla.</div>}
        {cropsState.map((crop, i) => <article key={crop.id} className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900 dark:text-white">Cultivo {i + 1} {crop.name && <Badge>{crop.name}</Badge>}</h3><Button type="button" size="sm" variant="secondary" onClick={() => setCrops(list => list.filter(c => c.id !== crop.id))}>Quitar</Button></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {availableCycles.length > 0 ? <FormField label="Siembra del huerto" id={`crop-cycle-${crop.id}`}>
              <select id={`crop-cycle-${crop.id}`} className={input} value={crop.cicloCultivoId ?? ''} onChange={e => {
                const found = availableCycles.find(item => item.id === Number(e.target.value))
                if (found && cropsState.some(item => item.id !== crop.id && item.cicloCultivoId === found.id)) return
                updateCrop(crop.id, { cicloCultivoId: found?.id ?? null, name: found?.cultivo.nombre ?? '',
                  observacionesCultivo: found?.id === crop.cicloCultivoId ? crop.observacionesCultivo : '' })
              }}><option value="">Seleccionar siembra</option>
                {availableCycles.filter(item => item.id === crop.cicloCultivoId || !cropsState.some(selected => selected.cicloCultivoId === item.id)).map(item => <option key={item.id} value={item.id}>{item.cultivo.nombre} · {item.huerto.nombre || `Huerto #${item.huertoId}`} · {item.fechaSiembra || item.fechaTrasplante || 'Sin fecha'} (#{item.id})</option>)}
              </select>
            </FormField> : <SearchableSelect label="Planta (sin vincular)" id={`crop-name-${crop.id}`} value={crop.name} onChange={name => updateCrop(crop.id,{name, cicloCultivoId: null})} options={catalogOptions(crops)} />}
            <FormField label="Etapa" id={`crop-stage-${crop.id}`}><select id={`crop-stage-${crop.id}`} className={input} value={crop.stage} onChange={e => updateCrop(crop.id,{stage:e.target.value})}><Options items={stages}/></select></FormField>
            <FormField label="Plantas observadas" id={`crop-plants-${crop.id}`}><input id={`crop-plants-${crop.id}`} className={input} type="number" min="0" step="1" value={crop.plants} onChange={e=>updateCrop(crop.id,{plants:e.target.value})}/></FormField>
            <FormField label="Calidad" id={`crop-quality-${crop.id}`}><select id={`crop-quality-${crop.id}`} className={input} value={crop.quality} onChange={e=>updateCrop(crop.id,{quality:e.target.value})}><Options items={qualities}/></select></FormField>
          </div>
          <div className="mt-4">
            <FormField label="Observaciones del cultivo" id={`crop-observations-${crop.id}`}>
              <textarea id={`crop-observations-${crop.id}`} className={area} maxLength={2000}
                value={crop.observacionesCultivo} onChange={e => updateCrop(crop.id, { observacionesCultivo: e.target.value })} />
            </FormField>
          </div>
          <details className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><summary className="cursor-pointer font-medium text-slate-900 dark:text-white">¿Detectaste plagas o enfermedades? <span className="text-xs font-normal text-slate-500">({crop.findings.length} hallazgos)</span></summary>
            <div className="mt-4 space-y-3">{crop.findings.map(f => <div key={f.id} className="grid gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40 md:grid-cols-[135px_1fr_110px_auto] md:items-end">
              <FormField id={`finding-type-${f.id}`} label="Tipo"><select id={`finding-type-${f.id}`} className={input} value={f.type} onChange={e => updateFinding(crop.id,f.id,{type:e.target.value as Finding['type'],name:''})}><option value="plaga">Plaga</option><option value="enfermedad">Enfermedad</option></select></FormField>
              <SearchableSelect id={`finding-name-${f.id}`} label="Hallazgo" value={f.name} onChange={name => updateFinding(crop.id,f.id,{name})} options={catalogOptions(f.type === 'plaga' ? pests : diseases)} />
              <FormField id={`finding-damage-${f.id}`} label="Daño"><select id={`finding-damage-${f.id}`} className={input} value={f.damage} onChange={e => updateFinding(crop.id,f.id,{damage:e.target.value})}><option value="">Sin estimar</option>{damage.map(n => <option key={n} value={n}>{n}%</option>)}</select></FormField>
              <Button type="button" variant="secondary" size="sm" onClick={() => updateCrop(crop.id, {findings: crop.findings.filter(item => item.id !== f.id)})}>Quitar</Button>
            </div>)}<Button type="button" variant="secondary" size="sm" onClick={()=>updateCrop(crop.id,{findings:[...crop.findings,{id:crypto.randomUUID(),type:'plaga',name:'',damage:''}]})}>+ Añadir hallazgo</Button></div>
          </details>
          <details className="mt-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700" open={crop.production || undefined}><summary className="cursor-pointer font-medium text-slate-900 dark:text-white">¿Hubo producción o ventas? <span className="text-xs font-normal text-slate-500">(opcional)</span></summary>
            <div className="mt-4 space-y-4"><label className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={crop.production} onChange={e=>updateCrop(crop.id,{production:e.target.checked})}/> Registrar producción y ventas</label>
              {crop.production && <><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {([['perPlantUnits','Producto/planta (unidades)'],['perPlantKg','Producto/planta (kg)'],['units','Total obtenido (unidades)'],['kg','Total obtenido (kg)']] as const).map(([key,name]) => <FormField key={key} id={`${key}-${crop.id}`} label={name}><input id={`${key}-${crop.id}`} className={input} type="number" min="0" step="any" value={crop[key]} onChange={e=>updateCrop(crop.id,{[key]:e.target.value})}/></FormField>)}
              </div><div className="grid gap-3 md:grid-cols-2"><FormField id={`price-basis-${crop.id}`} label="Precio por"><select id={`price-basis-${crop.id}`} className={input} value={crop.priceBasis} onChange={e=>updateCrop(crop.id,{priceBasis:e.target.value as CropEntry['priceBasis']})}><option value="unidad">Unidad</option><option value="kg">Kilogramo</option></select></FormField><FormField id={`price-q-${crop.id}`} label="Precio de venta (Q)"><input id={`price-q-${crop.id}`} className={input} type="number" min="0" step="any" value={crop.priceQ} onChange={e=>updateCrop(crop.id,{priceQ:e.target.value})}/></FormField></div>
              <div className="grid gap-3 md:grid-cols-1"><div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800"><div className="text-slate-500">Total de venta (Q)</div><strong className="text-lg text-slate-900 dark:text-white">{currencyTotal(crop,'priceQ')}</strong></div></div></>}
            </div>
          </details>
        </article>)}
      </section>}

      {step === 2 && <section className={`${card} space-y-5`} aria-label="Recomendaciones y observaciones">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recomendaciones y compromisos</h2>
        <FormField id="visit-recommendations" label="Recomendación general"><textarea id="visit-recommendations" className={area} value={recommendation} onChange={e=>setRecommendation(e.target.value)} /></FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField id="visit-treatment-type" label="Tipo de insumo recomendado"><select id="visit-treatment-type" value={treatmentGroup} className={input} onChange={e=>{setTreatmentGroup(e.target.value);setTreatment('')}}><option value="orgánico">Insecticida orgánico</option><option value="abono">Abono orgánico</option><option value="químico">Producto químico</option></select></FormField>
          <SearchableSelect id="visit-treatment" label="Insumo" value={treatment} onChange={setTreatment} options={catalogOptions(treatmentGroup === 'orgánico' ? organicInsecticides : treatmentGroup === 'abono' ? fertilizers : chemicalInsecticides)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold text-slate-900 dark:text-white">Compromisos</h3><Button type="button" size="sm" variant="secondary" onClick={()=>setCommitments(list=>[...list,newCommitment()])}>+ Agregar compromiso</Button></div>
        {commitments.map((c,i) => <div key={c.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800 md:grid-cols-[minmax(0,1fr)_135px_250px_auto] md:items-end">
          <FormField id={`commitment-${c.id}`} label={`Compromiso ${i+1}`}><input id={`commitment-${c.id}`} className={input} value={c.text} onChange={e=>updateCommitment(c.id,{text:e.target.value})} /></FormField>
          <FormField id={`owner-${c.id}`} label="Responsable"><select id={`owner-${c.id}`} className={input} value={c.category} onChange={e=>updateCommitment(c.id,{category:e.target.value})}><option value="Familia">Familia</option><option value="ONG">ONG</option></select></FormField>
          <div className="space-y-2">
            <FormField id={`due-mode-${c.id}`} label="Revisión">
              <select id={`due-mode-${c.id}`} className={input} value={c.nextVisit ? 'proxima' : 'fecha'}
                onChange={e => updateCommitment(c.id, { nextVisit: e.target.value === 'proxima', due: e.target.value === 'proxima' ? '' : c.due })}>
                <option value="proxima">Próxima visita</option>
                <option value="fecha">Fecha específica</option>
              </select>
            </FormField>
            {!c.nextVisit && <input id={`due-${c.id}`} aria-label="Fecha de revisión" type="date" min={today} className={input} value={c.due} onChange={e=>updateCommitment(c.id,{due:e.target.value})}/>}
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={()=>setCommitments(list=>list.filter(item=>item.id!==c.id))}>Quitar</Button>
        </div>)}
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Observaciones técnicas</h2>
        <FormField id="visit-observations" label="Observaciones"><textarea id="visit-observations" className={area} value={observations} onChange={e=>setObservations(e.target.value)} /></FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h3 className="mb-3 font-medium text-slate-900 dark:text-white">Audio técnico</h3><Button type="button" variant="secondary" disabled>Grabar audio</Button></div>
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><h3 className="mb-3 font-medium text-slate-900 dark:text-white">Audio para la familia</h3><Button type="button" variant="secondary" disabled>Grabar audio</Button></div>
        </div>
        <VisitEvidencePicker photos={photos} onChange={setPhotos} disabled={saving || Boolean(saved)} />
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/40"><strong>{selectedFamily?.nombreReferencia ?? 'Sin familia'}</strong><span>{date}</span><span>{cropsState.length} cultivo(s)</span><span>{commitments.length} compromiso(s)</span><span>{photos.length} foto(s)</span></div>
      </section>}
      {saved && <div role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
        <strong>{saved.status === 'synced' ? 'Visita guardada en el servidor.' : 'Visita guardada en este dispositivo.'}</strong>
        {saved.status !== 'synced' && <p className="mt-1">Pendiente de sincronización.</p>}
        <div className="mt-3 flex flex-wrap gap-3"><Link className="font-semibold underline" to={saved.type === 'PROGRAMADA' ? '/visitas/agenda' : '/visitas/historial'}>Ver visita</Link><Link className="underline" to="/visitas/nueva" reloadDocument>Nueva visita</Link></div>
      </div>}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700/30 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-8">
        <Button type="button" variant="secondary" onClick={()=>{setStep(s=>Math.max(0,s-1));setError('')}} disabled={step===0 || saving || Boolean(saved)}>Anterior</Button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500">Paso {step+1} de {steps.length}</span>
          {step < steps.length-1 ? <Button type="button" onClick={next} disabled={Boolean(saved)}>Siguiente →</Button> : <>
            <Button type="button" disabled={saving || Boolean(saved)} onClick={()=>void save('REALIZADA')}>{saving ? 'Guardando…' : 'Guardar visita'}</Button>
          </>}
        </div>
      </div>
    </div>
  </>
}
