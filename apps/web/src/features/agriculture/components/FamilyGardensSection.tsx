import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CalendarDays, ChevronRight, Leaf, MapPinned, Plus, Sprout } from 'lucide-react'
import ComponentCard from '@/components/common/ComponentCard'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteGardens, isDireccionGeneral } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { listGardens, type Garden } from '../services/gardens'
import { entornoLabels, modalidadLabels } from './GardenClassificationFields'
import { listCycles, type Cycle } from '../services/cyclesService'
import RegisterSowingDialog from './RegisterSowingDialog'
import CicloEvaluacionesSection from './CicloEvaluacionesSection'
import CicloProduccionSection from './CicloProduccionSection'
import { formatAgriculturalDate } from './agriculturalDate'
import GardenScene from './GardenScene'

function CycleOption({ cycle, selected, onSelect }: { cycle: Cycle; selected: boolean; onSelect: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={`layout-focus group flex min-h-28 w-full flex-col justify-between gap-3 rounded-2xl border p-4 text-left transition-colors duration-150 ${selected ? 'border-brand-500 bg-brand-50/70 ring-1 ring-brand-500/20 dark:bg-brand-500/10' : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-600 dark:hover:bg-white/[0.06]'}`}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ciclo #{cycle.id}</p><p className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">{cycle.cultivo.nombre}</p></div>
      <Badge variant={cycle.estado === 'ACTIVO' ? 'success' : 'neutral'} className="shrink-0">{cycle.estado}</Badge>
    </div>
    <div className="flex items-end justify-between gap-2 text-xs text-gray-500 dark:text-gray-400"><div><p>Siembra: {formatAgriculturalDate(cycle.fechaSiembra)}</p><p>Plantas: {cycle.cantidadPlantas ?? 'Sin dato'}</p></div><ChevronRight size={16} className={selected ? 'text-brand-600' : 'text-gray-400'} /></div>
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

  const familyGardens = !loading && !error ? gardens.filter((garden) => garden.familiaId === familyId) : []
  const familyCycles = !loading && !error && canReadCycles
    ? cycles.filter((cycle) => cycle.huerto.familiaId === familyId && familyGardens.some((garden) => garden.id === cycle.huertoId))
    : []
  const currentGarden = familyGardens.find((garden) => garden.id === selectedGardenId) ?? familyGardens[0]
  const gardenCycles = currentGarden ? familyCycles.filter((cycle) => cycle.huertoId === currentGarden.id) : []
  const selectedCycle = useMemo(() => gardenCycles.find((cycle) => cycle.id === selectedCycleId) ?? gardenCycles.find((cycle) => cycle.estado === 'ACTIVO') ?? gardenCycles[0] ?? null, [gardenCycles, selectedCycleId])

  return <ComponentCard title="Huertos y cultivos" description="" actions={canCreate ? <Link
    to={`/gestion-agricola/huertos/nuevo?familiaId=${familyId}`}
    className="layout-focus inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-theme-xs hover:bg-brand-600">
    <Plus aria-hidden="true" size={17} /> Registrar huerto
  </Link> : undefined}>
    <div className="space-y-6">
      {!online && <Alert variant="warning" title="Sin conexión">La consulta del expediente requiere conexión.</Alert>}
      {params.get('creado') === '1' && <Alert variant="success">Huerto guardado. Si está activo, ya puedes registrar la primera siembra.</Alert>}
      {params.has('imagenError') && <Alert variant="warning">El huerto se registró, pero su imagen no pudo guardarse.</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      {loading && <LoadingState label="Consultando huertos y siembras..." />}
      {error && <Alert variant="error" title="No se pudo cargar">{error}
        <Button variant="secondary" type="button" onClick={() => setRetry((n) => n + 1)} className="mt-3">Reintentar</Button>
      </Alert>}
      {!loading && !error && familyGardens.length === 0 && <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-10 text-center dark:border-gray-700">
        <Sprout aria-hidden="true" size={32} className="mx-auto mb-3 text-gray-400" />
        <p className="text-sm font-semibold text-gray-800 dark:text-white">Sin huertos registrados</p>
      </div>}
      {!loading && !error && familyGardens.length > 0 && <>
        <div className="grid gap-3 sm:max-w-xl sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.03]"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><MapPinned size={20} aria-hidden="true" /></div><div><p className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{familyGardens.length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Huertos</p></div></div>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.03]"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"><Sprout size={20} aria-hidden="true" /></div><div><p className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{familyGardens.filter((garden) => garden.estado === 'ACTIVO').length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Activos</p></div></div>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-white/[0.03]"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Leaf size={20} aria-hidden="true" /></div><div><p className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{familyCycles.length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Ciclos</p></div></div>
        </div>

        <section aria-label="Huertos asociados" className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            {familyGardens.map((garden) => <article key={garden.id} className={`overflow-hidden rounded-[1.45rem] border bg-white shadow-theme-xs transition-all dark:bg-gray-900 ${currentGarden?.id === garden.id ? 'border-brand-500 ring-1 ring-brand-500/20 dark:border-brand-500' : 'border-gray-200 dark:border-gray-800'}`}>
              <button type="button" onClick={() => { setSelectedGardenId(garden.id); setSelectedCycleId(null) }} className="block w-full text-left">
                <GardenScene garden={garden} cycles={familyCycles.filter((cycle) => cycle.huertoId === garden.id)} compact showLegend={false} />
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h4 className="break-words text-sm font-semibold text-gray-900 dark:text-white">{garden.nombre || `Huerto #${garden.id}`}</h4><p className="mt-1 text-xs text-gray-500">{garden.entornoCultivo ? entornoLabels[garden.entornoCultivo] : 'Sin clasificar'}</p></div><Badge variant={garden.estado === 'ACTIVO' ? 'success' : 'neutral'}>{garden.estado}</Badge></div>
                  <p className="text-xs text-gray-500">{garden.modalidadesProductivas.length ? garden.modalidadesProductivas.map((item) => modalidadLabels[item]).join(', ') : 'Sin clasificar'}</p>
                </div>
              </button>
            </article>)}
          </div>

          {currentGarden && <div className="space-y-4">
            <div className="rounded-[1.6rem] border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">Huerto seleccionado</p><h3 className="mt-1 break-words text-xl font-semibold text-gray-900 dark:text-white">{currentGarden.nombre || `Huerto #${currentGarden.id}`}</h3><p className="mt-1 text-sm text-gray-500">{currentGarden.entornoCultivo ? entornoLabels[currentGarden.entornoCultivo] : 'Sin clasificar'} · {currentGarden.fechaInicio ? formatAgriculturalDate(currentGarden.fechaInicio) : 'Sin fecha'}</p></div>
                <div className="flex flex-wrap gap-2"><Badge variant={currentGarden.estado === 'ACTIVO' ? 'success' : 'neutral'}>{currentGarden.estado}</Badge><Link to={`/gestion-agricola/huertos/${currentGarden.id}`} className="layout-focus inline-flex min-h-9 items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Abrir huerto <ChevronRight size={14} /></Link></div>
              </div>
              {currentGarden.observaciones && <p className="mt-4 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">{currentGarden.observaciones}</p>}
              {currentGarden.estado === 'ACTIVO' && canRegister && <div className="mt-4"><Button type="button" variant="secondary" size="sm" disabled={!online} onClick={() => { setNotice(''); setGardenToRegister(currentGarden) }}>Registrar siembra</Button></div>}
            </div>

            {!canReadCycles ? <Alert variant="warning">No tienes permiso para consultar los ciclos agrícolas de este huerto.</Alert> : <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">{gardenCycles.length ? gardenCycles.map((cycle) => <CycleOption key={cycle.id} cycle={cycle} selected={selectedCycle?.id === cycle.id} onSelect={() => setSelectedCycleId(cycle.id)} />) : <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-gray-500 dark:border-gray-700">Aún no hay ciclos agrícolas para este huerto.</div>}</div>
            </div>}
          </div>}
        </section>

        {canReadCycles && selectedCycle && <section id="family-agricultural-cycle-history" aria-label={`Historial de ${selectedCycle.cultivo.nombre}`} className="space-y-4 scroll-mt-6">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4 sm:p-5 dark:border-gray-800 dark:from-white/[0.04] dark:to-white/[0.02]">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"><Leaf aria-hidden="true" size={23} /></div><div className="min-w-0"><p className="text-xs font-medium text-gray-500">Ciclo seleccionado #{selectedCycle.id}</p><h3 className="mt-1 break-words text-lg font-semibold text-gray-900 dark:text-white">{selectedCycle.cultivo.nombre}</h3></div></div><div className="flex flex-wrap items-center gap-2"><Badge variant={selectedCycle.estado === 'ACTIVO' ? 'success' : 'neutral'}>{selectedCycle.estado}</Badge><Link to={`/gestion-agricola/ciclos/${selectedCycle.id}`} className="layout-focus inline-flex min-h-9 items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">Detalle completo <ChevronRight aria-hidden="true" size={15} /></Link></div></div>
            <dl className="mt-4 grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2 dark:border-gray-800"><div className="flex items-start gap-2"><CalendarDays aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><dt className="text-xs text-gray-500">Inicio de siembra</dt><dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white">{formatAgriculturalDate(selectedCycle.fechaSiembra)}</dd></div></div><div className="flex items-start gap-2"><Sprout aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-gray-400" /><div><dt className="text-xs text-gray-500">Plantas iniciales</dt><dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white">{selectedCycle.cantidadPlantas ?? 'Sin registro'}</dd></div></div></dl>
            {selectedCycle.observaciones && <p className="mt-4 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">{selectedCycle.observaciones}</p>}
          </div>
          <div className={`grid min-w-0 items-start gap-4 ${canReadProduction ? 'xl:grid-cols-2' : ''}`}>
            <CicloEvaluacionesSection key={`evaluaciones-${selectedCycle.id}`} cicloId={selectedCycle.id} />
            <CicloProduccionSection key={`produccion-${selectedCycle.id}`} cicloId={selectedCycle.id} />
          </div>
        </section>}
      </>}
      {gardenToRegister && <RegisterSowingDialog key={gardenToRegister.id} huertoId={gardenToRegister.id} huerto={gardenToRegister.nombre || `Huerto #${gardenToRegister.id}`}
        familia={gardenToRegister.familia.nombreReferencia} onClose={() => setGardenToRegister(null)}
        onSaved={(cycle) => { setCycles((current) => [cycle, ...current]); setSelectedGardenId(cycle.huertoId); setSelectedCycleId(cycle.id); setNotice('Siembra registrada correctamente.'); setGardenToRegister(null) }} />}
    </div>
  </ComponentCard>
}
