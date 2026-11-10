import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CalendarDays, Check, ChevronRight, Leaf, MapPinned, Sprout, Warehouse } from 'lucide-react'
import ComponentCard from '@/components/common/ComponentCard'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteGardens, isDireccionGeneral } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { gardenImageUrl, listGardens, type Garden } from '../services/gardens'
import { entornoLabels, modalidadLabels } from './GardenClassificationFields'
import { listCycles, type Cycle } from '../services/cyclesService'
import RegisterSowingDialog from './RegisterSowingDialog'
import CicloEvaluacionesSection from './CicloEvaluacionesSection'
import CicloProduccionSection from './CicloProduccionSection'
import { formatAgriculturalDate } from './agriculturalDate'

/** Tarjeta con fotografía del huerto; la ausencia o falla de imagen tiene un reemplazo local. */
function GardenCover({ garden }: { garden: Garden }) {
  const imageUrl = gardenImageUrl(garden)
  const [failedImage, setFailedImage] = useState(false)
  useEffect(() => { setFailedImage(false) }, [imageUrl])
  return <div className="relative h-36 overflow-hidden bg-gradient-to-br from-emerald-50 via-lime-50 to-slate-100 dark:from-emerald-950/40 dark:via-slate-800 dark:to-slate-900">
    {imageUrl && !failedImage
      ? <img src={imageUrl} alt={`Imagen del huerto ${garden.nombre || garden.id}`} loading="lazy"
          onError={() => setFailedImage(true)} className="h-full w-full object-cover" />
      : <div aria-hidden="true" className="flex h-full flex-col items-center justify-center gap-2 text-emerald-700/70 dark:text-emerald-300/60">
          <Sprout size={42} strokeWidth={1.5} /><span className="text-xs font-medium">{garden.tipo === 'COMUNITARIO' ? 'Huerto comunitario' : garden.tipo === 'FAMILIAR' ? 'Huerto familiar' : 'Huerto'}</span>
        </div>}
  </div>
}

function CycleOption({ cycle, selected, onSelect }: { cycle: Cycle; selected: boolean; onSelect: () => void }) {
  const active = cycle.estado === 'ACTIVO'
  return <button type="button" aria-pressed={selected} aria-controls="family-agricultural-cycle-history"
    onClick={onSelect}
    className={`layout-focus group flex min-h-28 w-full flex-col justify-between gap-3 rounded-xl border p-4 text-left transition-colors duration-150 ${selected
      ? 'border-brand-500 bg-brand-50/70 ring-1 ring-brand-500/30 dark:bg-brand-500/10'
      : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-600 dark:hover:bg-white/[0.06]'}`}>
    <div className="flex w-full items-start justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
        <Leaf aria-hidden="true" size={17} className={active ? 'shrink-0 text-success-600' : 'shrink-0 text-gray-500'} />
        <span className="break-words">{cycle.cultivo.nombre}</span>
      </span>
      <Badge variant={active ? 'success' : 'neutral'} className="shrink-0">{cycle.estado}</Badge>
    </div>
    <div className="flex w-full items-end justify-between gap-2">
      <div className="min-w-0 space-y-1 text-xs text-gray-500 dark:text-gray-400">
        <p>Ciclo #{cycle.id}</p>
        <p>Siembra: {formatAgriculturalDate(cycle.fechaSiembra)}</p>
      </div>
      <ChevronRight aria-hidden="true" size={18} className={`shrink-0 ${selected ? 'text-brand-600' : 'text-gray-400 group-hover:text-brand-500'}`} />
    </div>
  </button>
}

export default function FamilyGardensSection({ familyId }: { familyId: number }) {
  const [gardens, setGardens] = useState<Garden[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [gardenToRegister, setGardenToRegister] = useState<Garden | null>(null)
  const [selectedGardenId, setSelectedGardenId] = useState<number | null>(null)
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [params] = useSearchParams()
  const { usuario } = useAuth()
  const online = useOnlineStatus()
  const canCreate = Boolean(usuario && canWriteGardens(usuario))
  const canReadCycles = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/ciclos'))
  const canReadProduction = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/produccion'))
  const canRegister = Boolean(usuario && (isDireccionGeneral(usuario) || usuario.permisos.includes('CICLOS_WRITE')))

  useEffect(() => { setSelectedGardenId(null); setSelectedCycleId(null) }, [familyId])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    Promise.all([
      listGardens(familyId, controller.signal),
      canReadCycles ? listCycles({ familiaId: familyId }, controller.signal) : Promise.resolve([]),
    ]).then(([huertos, siembras]) => {
      if (!controller.signal.aborted) { setGardens(huertos); setCycles(siembras); setError('') }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible consultar huertos y siembras.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [familyId, retry, canReadCycles])

  // Validación también en la interfaz: nunca asociar ciclos de otra familia al expediente.
  const familyGardens = !loading && !error ? gardens.filter(garden => garden.familiaId === familyId) : []
  const familyCycles = !loading && !error && canReadCycles
    ? cycles.filter(cycle => cycle.huerto.familiaId === familyId && familyGardens.some(garden => garden.id === cycle.huertoId))
    : []
  const cyclesMayBeIncomplete = canReadCycles && cycles.length >= 500
  const currentGarden = familyGardens.find(garden => garden.id === selectedGardenId) ?? familyGardens[0]
  const gardenCycles = currentGarden ? familyCycles.filter(cycle => cycle.huertoId === currentGarden.id) : []
  const activeCycles = gardenCycles.filter(cycle => cycle.estado === 'ACTIVO')
  const historicalCycles = gardenCycles.filter(cycle => cycle.estado !== 'ACTIVO')
  const selectedCycle = gardenCycles.find(cycle => cycle.id === selectedCycleId) ?? activeCycles[0] ?? historicalCycles[0]

  return <ComponentCard title="Huertos y cultivos" description="Seguimiento agrícola de la familia" actions={canCreate ? <Link
    to={`/gestion-agricola/huertos/nuevo?familiaId=${familyId}`}
    className="layout-focus inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-theme-xs hover:bg-brand-600">
    <Sprout aria-hidden="true" size={17} /> Registrar huerto
  </Link> : undefined}>
    <div className="space-y-6">
      {!online && <Alert variant="warning" title="Sin conexión">La consulta del expediente requiere conexión. Las evaluaciones capturadas sin conexión aparecerán después de sincronizar las visitas.</Alert>}
      {params.get('creado') === '1' && <Alert variant="success">Huerto guardado. Si está activo, ya puedes registrar la primera siembra.</Alert>}
      {params.has('imagenError') && <Alert variant="warning">El huerto se registró, pero su imagen no pudo guardarse.</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      {loading && <LoadingState label="Consultando huertos y siembras..." />}
      {error && <Alert variant="error" title="No se pudo cargar">{error}
        <Button variant="secondary" type="button" onClick={() => setRetry(n => n + 1)} className="mt-3">Reintentar</Button>
      </Alert>}
      {!loading && !error && familyGardens.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 px-5 py-10 text-center dark:border-gray-700">
        <Sprout aria-hidden="true" size={32} className="mx-auto mb-3 text-gray-400" />
        <p className="text-sm font-semibold text-gray-800 dark:text-white">Sin huertos registrados</p>
        <p className="mt-1 text-sm text-gray-500">Esta familia todavía no tiene huertos asociados.</p>
      </div>}
      {!loading && !error && familyGardens.length > 0 && <>
        {/* Solo contadores de elementos recibidos; sin estimar evaluaciones ni cosechas. */}
        <div className="grid grid-cols-2 gap-3 sm:max-w-lg">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><MapPinned size={20} aria-hidden="true" /></div>
            <div><p className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{familyGardens.length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Huertos consultados</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"><Sprout size={20} aria-hidden="true" /></div>
            <div><p className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{familyGardens.filter(garden => garden.estado === 'ACTIVO').length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Huertos activos</p></div>
          </div>
        </div>

        <section aria-label="Seleccionar huerto" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Seleccionar huerto</h3><span className="text-xs text-gray-500">{familyGardens.length} disponibles</span></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {familyGardens.map(garden => <article key={garden.id}
              className={`min-w-0 overflow-hidden rounded-xl border bg-white shadow-theme-xs transition-colors dark:bg-gray-900 ${currentGarden?.id === garden.id ? 'border-brand-500 ring-1 ring-brand-500/25' : 'border-gray-200 dark:border-gray-800'}`}>
              <button type="button" aria-pressed={currentGarden?.id === garden.id} aria-label={`Consultar ${garden.nombre || `huerto ${garden.id}`}`}
                onClick={() => { setSelectedGardenId(garden.id); setSelectedCycleId(null) }}
                className="layout-focus block w-full text-left hover:bg-gray-50/70 dark:hover:bg-white/[0.04]">
                <GardenCover garden={garden} />
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="min-w-0 break-words text-sm font-semibold text-gray-900 dark:text-white">{garden.nombre || `Huerto #${garden.id}`}</h4>
                    {currentGarden?.id === garden.id && <Check aria-label="Seleccionado" size={17} className="shrink-0 text-brand-600" />}
                  </div>
                  <div className="flex flex-wrap items-center gap-2"><Badge variant={garden.estado === 'ACTIVO' ? 'success' : 'neutral'}>{garden.estado}</Badge><span className="text-xs text-gray-500">{garden.tipo || 'Tipo sin clasificar'}</span></div>
                  <p className="text-xs text-gray-500">Inicio: {formatAgriculturalDate(garden.fechaInicio)}</p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400">Explorar huerto <ChevronRight aria-hidden="true" size={14} /></span>
                </div>
              </button>
              {garden.estado === 'ACTIVO' && canRegister && <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
                <Button type="button" variant="ghost" size="sm" className="w-full" disabled={!online} onClick={() => { setNotice(''); setGardenToRegister(garden) }}>+ Registrar siembra</Button>
              </div>}
            </article>)}
          </div>
        </section>

        {currentGarden && <section aria-label={`Ciclos del huerto ${currentGarden.nombre || currentGarden.id}`} className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
            <Warehouse aria-hidden="true" size={19} className="text-brand-600" />
            <h3 className="min-w-0 break-words text-base font-semibold text-gray-800 dark:text-white">{currentGarden.nombre || `Huerto #${currentGarden.id}`}</h3>
            <Badge variant={currentGarden.estado === 'ACTIVO' ? 'success' : 'neutral'}>{currentGarden.estado}</Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Entorno: {currentGarden.entornoCultivo ? entornoLabels[currentGarden.entornoCultivo] : 'Sin clasificar'} · Modalidad: {currentGarden.modalidadesProductivas.length ? currentGarden.modalidadesProductivas.map(m => modalidadLabels[m]).join(', ') : 'Sin clasificar'}</p>
          {currentGarden.entornoCultivo === 'OTRO' && currentGarden.detalleEntorno && <p className="text-sm text-gray-600 dark:text-gray-300">{currentGarden.detalleEntorno}</p>}
          {currentGarden.observaciones && <p className="whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">{currentGarden.observaciones}</p>}
          {!canReadCycles ? <Alert variant="warning">No tienes permiso para consultar los ciclos agrícolas de este huerto.</Alert> : <>
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Ciclos activos</h4>
              {activeCycles.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{activeCycles.map(cycle => <CycleOption key={cycle.id} cycle={cycle} selected={selectedCycle?.id === cycle.id} onSelect={() => setSelectedCycleId(cycle.id)} />)}</div>
                : <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500 dark:bg-white/[0.03]">No hay ciclos activos en este huerto.</p>}
            </div>
            {historicalCycles.length > 0 && <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Ciclos anteriores</h4>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{historicalCycles.map(cycle => <CycleOption key={cycle.id} cycle={cycle} selected={selectedCycle?.id === cycle.id} onSelect={() => setSelectedCycleId(cycle.id)} />)}</div>
            </div>}
            {gardenCycles.length === 0 && <p className="text-sm text-gray-500">No se encontraron ciclos de cultivo entre los registros consultados para este huerto.</p>}
            {cyclesMayBeIncomplete && <p className="text-xs text-amber-700 dark:text-amber-400">La consulta alcanzó el límite de 500 ciclos. Algunos registros anteriores podrían no estar visibles.</p>}
          </>}
        </section>}

        {canReadCycles && selectedCycle && <section id="family-agricultural-cycle-history" aria-label={`Historial de ${selectedCycle.cultivo.nombre}`} className="space-y-4 scroll-mt-6">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4 sm:p-5 dark:border-gray-800 dark:from-white/[0.04] dark:to-white/[0.02]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"><Leaf aria-hidden="true" size={23} /></div>
                <div className="min-w-0"><p className="text-xs font-medium text-gray-500">Ciclo seleccionado #{selectedCycle.id}</p><h3 className="mt-1 break-words text-lg font-semibold text-gray-900 dark:text-white">{selectedCycle.cultivo.nombre}</h3></div>
              </div>
              <div className="flex flex-wrap items-center gap-2"><Badge variant={selectedCycle.estado === 'ACTIVO' ? 'success' : 'neutral'}>{selectedCycle.estado}</Badge>
                <Link to={`/gestion-agricola/ciclos/${selectedCycle.id}`} className="layout-focus inline-flex min-h-9 items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Detalle completo <ChevronRight aria-hidden="true" size={15} /></Link>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2 dark:border-gray-800">
              <div className="flex items-start gap-2"><CalendarDays aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><dt className="text-xs text-gray-500">Inicio de siembra</dt><dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white">{formatAgriculturalDate(selectedCycle.fechaSiembra)}</dd></div></div>
              <div className="flex items-start gap-2"><Sprout aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><dt className="text-xs text-gray-500">Plantas iniciales</dt><dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white">{selectedCycle.cantidadPlantas ?? 'Sin registro'}</dd></div></div>
            </dl>
            {selectedCycle.observaciones && <p className="mt-4 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">{selectedCycle.observaciones}</p>}
          </div>
          {/* Dos consultas separadas: evaluaciones paginadas y cosechas reales. */}
          <div className={`grid min-w-0 items-start gap-4 ${canReadProduction ? 'xl:grid-cols-2' : ''}`}>
            <CicloEvaluacionesSection key={`evaluaciones-${selectedCycle.id}`} cicloId={selectedCycle.id} />
            <CicloProduccionSection key={`produccion-${selectedCycle.id}`} cicloId={selectedCycle.id} />
          </div>
        </section>}
      </>}
      {gardenToRegister && <RegisterSowingDialog key={gardenToRegister.id} huertoId={gardenToRegister.id} huerto={gardenToRegister.nombre || `Huerto #${gardenToRegister.id}`}
        familia={gardenToRegister.familia.nombreReferencia} onClose={() => setGardenToRegister(null)}
        onSaved={cycle => { setCycles(current => [cycle, ...current]); setSelectedGardenId(cycle.huertoId); setSelectedCycleId(cycle.id); setNotice('Siembra registrada correctamente.'); setGardenToRegister(null) }} />}
    </div>
  </ComponentCard>
}
