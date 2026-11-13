import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronRight, Leaf, MapPin, Plus, Sprout, Warehouse } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteGardens, canWriteProduction, isDireccionGeneral } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { finishCycle, listCycles, type Cycle } from '../services/cyclesService'
import { gardenImageUrl, getGarden, type Garden } from '../services/gardens'
import GardenScene from '../components/GardenScene'
import { entornoLabels, modalidadLabels } from '../components/GardenClassificationFields'
import { formatAgriculturalDate } from '../components/agriculturalDate'
import RegisterSowingDialog from '../components/RegisterSowingDialog'
import CicloEvaluacionesSection from '../components/CicloEvaluacionesSection'
import CicloProduccionSection from '../components/CicloProduccionSection'
import RegistrarCosechaDialog from '../components/RegistrarCosechaDialog'
import EditGardenClassification from '../components/EditGardenClassification'
import FamilyStatusDot from '@/features/families/components/FamilyStatusDot'

function CycleCard({ cycle, number, selected, onSelect }: { cycle: Cycle; number: number; selected: boolean; onSelect: () => void }) {
  return <button
    type="button"
    onClick={onSelect}
    className={`layout-focus flex min-h-32 w-full flex-col justify-between rounded-2xl border p-4 text-left shadow-theme-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-theme-sm motion-reduce:transform-none ${selected ? 'border-brand-400 bg-brand-50/70 dark:border-brand-500 dark:bg-brand-500/10' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Ciclo {number}</p>
        <h3 className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">{cycle.cultivo.nombre}</h3>
      </div>
      <Badge variant={cycle.estado === 'ACTIVO' ? 'success' : 'neutral'}>{cycle.estado}</Badge>
    </div>
    <div className="grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
      <p>Siembra: {formatAgriculturalDate(cycle.fechaSiembra)}</p>
      <p>Plantas: {cycle.cantidadPlantas ?? 'Sin dato'}</p>
    </div>
  </button>
}

export default function HuertoDetallePage() {
  const { id = '' } = useParams()
  const numericId = Number(id)
  const [params] = useSearchParams()
  const routeCycleId = Number(params.get('cicloId'))
  const online = useOnlineStatus()
  const { usuario } = useAuth()
  const canReadCycles = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/ciclos'))
  const canReadProduction = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/produccion'))
  const canRegisterHarvest = Boolean(canReadProduction && usuario && canWriteProduction(usuario))
  const canRegisterCycle = Boolean(usuario && (isDireccionGeneral(usuario) || usuario.permisos.includes('CICLOS_WRITE')))
  const canEditGarden = Boolean(usuario && canWriteGardens(usuario))
  const [garden, setGarden] = useState<Garden | null>(null)
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [showPhoto, setShowPhoto] = useState(false)
  const [harvestOpen, setHarvestOpen] = useState(params.get('registrarCosecha') === '1')
  const [harvestRefresh, setHarvestRefresh] = useState(0)
  const [editing, setEditing] = useState(false)
  const [closingId, setClosingId] = useState<number | null>(null)
  const [cycleError, setCycleError] = useState('')

  useEffect(() => {
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setLoading(false)
      setError('El huerto solicitado no es válido.')
      return
    }
    const controller = new AbortController()
    setLoading(true)
    Promise.all([
      getGarden(numericId, controller.signal),
      canReadCycles ? listCycles({ huertoId: numericId }, controller.signal) : Promise.resolve([]),
    ]).then(([garden, gardenCycles]) => {
      if (controller.signal.aborted) return
      const found = garden.id === numericId ? garden : null
      setGarden(found)
      setCycles(gardenCycles)
      setSelectedCycleId(gardenCycles.some(c => c.id === routeCycleId) ? routeCycleId : gardenCycles.find((cycle) => cycle.estado === 'ACTIVO')?.id ?? gardenCycles[0]?.id ?? null)
      setError(found ? '' : 'No se encontró el huerto solicitado.')
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el huerto.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [numericId, canReadCycles, routeCycleId])

  const selectedCycle = useMemo(() => cycles.find((cycle) => cycle.id === selectedCycleId) ?? cycles[0] ?? null, [cycles, selectedCycleId])
  const activeCycles = cycles.filter((cycle) => cycle.estado === 'ACTIVO')
  const historicalCycles = cycles.filter((cycle) => cycle.estado !== 'ACTIVO')
  // Numeración visual por huerto: nunca se guarda ni reemplaza los IDs de PostgreSQL.
  const cycleNumbers = new Map([...cycles].sort((a, b) => a.id - b.id).map((item, index) => [item.id, index + 1]))
  const activeCropNames = Array.from(new Set(activeCycles.map(item => item.cultivo.nombre)))
  async function finishSelectedCycle() {
    if (!selectedCycle || !online || closingId !== null) return
    if (!window.confirm(`¿Finalizar el cultivo ${selectedCycle.cultivo.nombre}? Se conservarán sus visitas, evaluaciones y cosechas.`)) return
    setClosingId(selectedCycle.id); setCycleError('')
    try {
      const updated = await finishCycle(selectedCycle.id)
      setCycles(current => current.map(item => item.id === updated.id ? updated : item))
      setNotice('Cultivo finalizado. Ya puedes registrar una nueva siembra.')
    } catch (cause) { setCycleError(cause instanceof Error ? cause.message : 'No se pudo finalizar el cultivo.') }
    finally { setClosingId(null) }
  }

  return <>
    <PageMeta title="Detalle de huerto | Viviendas León Guatemala" description="Consulta integral del huerto y sus ciclos agrícolas." />
    <PageHeader
      title={garden?.entornoCultivo ? entornoLabels[garden.entornoCultivo] : 'Detalle de huerto'}
      description={garden ? `${garden.familia.nombreReferencia} · ${garden.familia.comunidad.nombre}` : 'Consulta del huerto'}
      actions={<div className="flex flex-wrap gap-2">
        {garden && <Link to={`/familias/${garden.familiaId}?tab=gardens`} className="layout-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-theme-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Volver al expediente</Link>}
        <Link to="/gestion-agricola/huertos" className="layout-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-theme-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Volver a huertos</Link>
      </div>}
    />

    {notice && <Alert variant="success" className="mb-5">{notice}</Alert>}
    {loading && <Card><CardBody><LoadingState label="Consultando huerto..." /></CardBody></Card>}
    {!loading && error && <Alert variant="error" title="No se pudo cargar">{error}</Alert>}

    {!loading && !error && garden && <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardBody className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-medium text-slate-500">{showPhoto ? 'Fotografía del huerto' : 'Vista ilustrativa · sin escala'}</p>
              {garden.tieneImagen && <Button type="button" size="sm" variant="secondary" onClick={() => setShowPhoto(value => !value)}>{showPhoto ? 'Ver ilustración' : 'Ver fotografía'}</Button>}
            </div>
            {showPhoto && gardenImageUrl(garden)
              ? <img src={gardenImageUrl(garden)!} alt={`Fotografía del huerto de ${garden.familia.nombreReferencia}`} loading="lazy" className="h-64 w-full rounded-2xl object-cover sm:h-80" />
              : <GardenScene garden={garden} cycles={cycles} className="rounded-2xl" />}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estado</p><div className="mt-2"><Badge variant={garden.estado === 'ACTIVO' ? 'success' : 'neutral'}>{garden.estado}</Badge></div></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estructura</p><p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{garden.entornoCultivo ? entornoLabels[garden.entornoCultivo] : 'Sin clasificar'}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ciclos</p><p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{cycles.length}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Inicio</p><p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatAgriculturalDate(garden.fechaInicio)}</p></div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Información del huerto" actions={<div className="flex flex-wrap gap-2">
            {canEditGarden && <Button type="button" size="sm" variant="secondary" disabled={!online} onClick={() => setEditing(value => !value)}>{editing ? 'Cerrar edición' : 'Editar clasificación'}</Button>}
            {garden.estado === 'ACTIVO' && canRegisterCycle && <Button type="button" size="sm" disabled={!online} onClick={() => setRegisterOpen(true)}><Plus size={16} /> Registrar siembra</Button>}
          </div>} />
          <CardBody className="space-y-5">
            {editing && <div className="garden-view-enter"><EditGardenClassification garden={garden} onCancel={() => setEditing(false)} onSaved={updated => { setGarden(updated); setEditing(false); setNotice('Clasificación guardada.') }} /></div>}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-start gap-3"><Warehouse className="mt-0.5 text-brand-600 dark:text-brand-300" size={18} /><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estructura</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{garden.entornoCultivo ? entornoLabels[garden.entornoCultivo] : 'Sin clasificar'}</p></div></div>
              <div className="flex items-start gap-3"><Sprout className="mt-0.5 text-brand-600 dark:text-brand-300" size={18} /><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Familia asignada</p><Link to={`/familias/${garden.familiaId}?tab=gardens`} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300"><FamilyStatusDot state={garden.familia.estado}/>{garden.familia.nombreReferencia}<ChevronRight size={14} /></Link></div></div>
              <div className="flex items-start gap-3"><MapPin className="mt-0.5 text-brand-600 dark:text-brand-300" size={18} /><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Comunidad</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{garden.familia.comunidad.nombre}</p></div></div>
              <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 text-brand-600 dark:text-brand-300" size={18} /><div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fecha de inicio</p><p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{formatAgriculturalDate(garden.fechaInicio)}</p></div></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Clasificación</p><p className="mt-2 text-sm font-semibold dark:text-white">{garden.tipo === 'FAMILIAR' ? 'Familiar' : garden.tipo === 'COMUNITARIO' ? 'Comunitario' : 'Sin clasificar'}</p></div>
              <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Modalidades</p><div className="mt-2 flex flex-wrap gap-1.5">{garden.modalidadesProductivas.length
                ? garden.modalidadesProductivas.map(item => <Badge key={item} variant="neutral">{modalidadLabels[item]}</Badge>)
                : <span className="text-xs text-slate-500">Sin definir</span>}</div></div>
            </div>
            <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cultivos activos</p>
              <div className="mt-2 flex flex-wrap gap-2">{activeCropNames.length ? activeCropNames.map(name => <Badge key={name} variant="success">{name}</Badge>) : <span className="text-xs text-slate-500">Sin cultivos activos</span>}</div>
              {canRegisterCycle && <p className="mt-2 text-xs text-slate-500">Para cambiar cultivos, finaliza el ciclo anterior y registra una nueva siembra.</p>}
            </div>
            {garden.observaciones && <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Observaciones</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{garden.observaciones}</p>
            </div>}

          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Ciclos agrícolas" description="" />
        <CardBody className="space-y-6">
          {!canReadCycles && <Alert variant="warning">No tienes permiso para consultar ciclos agrícolas.</Alert>}
          {canReadCycles && cycles.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700">Aún no hay ciclos agrícolas registrados para este huerto.</div>}
          {canReadCycles && cycles.length > 0 && <>
            <section className="space-y-3">
              <div className="flex items-center gap-2"><Leaf size={16} className="text-success-600" /><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Activos</h3></div>
              {activeCycles.length ? <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{activeCycles.map((cycle) => <CycleCard key={cycle.id} cycle={cycle} number={cycleNumbers.get(cycle.id) ?? 1} selected={selectedCycle?.id === cycle.id} onSelect={() => setSelectedCycleId(cycle.id)} />)}</div> : <p className="text-sm text-slate-500">No hay ciclos activos.</p>}
            </section>
            {historicalCycles.length > 0 && <section className="space-y-3">
              <div className="flex items-center gap-2"><Leaf size={16} className="text-slate-500" /><h3 className="text-sm font-semibold text-slate-900 dark:text-white">Históricos</h3></div>
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{historicalCycles.map((cycle) => <CycleCard key={cycle.id} cycle={cycle} number={cycleNumbers.get(cycle.id) ?? 1} selected={selectedCycle?.id === cycle.id} onSelect={() => setSelectedCycleId(cycle.id)} />)}</div>
            </section>}
          </>}
        </CardBody>
      </Card>

      {canReadCycles && selectedCycle && <div key={selectedCycle.id} className="garden-view-enter space-y-5">
        {cycleError && <Alert variant="error">{cycleError}</Alert>}
        <Card>
          <CardHeader title={selectedCycle.cultivo.nombre} description={`Ciclo ${cycleNumbers.get(selectedCycle.id) ?? 1}`} actions={<div className="flex flex-wrap gap-2">
            {canRegisterCycle && selectedCycle.estado === 'ACTIVO' && <Button type="button" variant="secondary" size="sm" disabled={!online || closingId !== null} onClick={() => void finishSelectedCycle()}>{closingId === selectedCycle.id ? 'Finalizando…' : 'Finalizar cultivo'}</Button>}
            {canRegisterHarvest && selectedCycle.estado === 'ACTIVO' && <Button type="button" size="sm" disabled={!online} onClick={() => setHarvestOpen(true)}>Registrar cosecha</Button>}
          </div>} />
          <CardBody>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Inicio de siembra</dt><dd className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatAgriculturalDate(selectedCycle.fechaSiembra)}</dd></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Plantas iniciales</dt><dd className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{selectedCycle.cantidadPlantas ?? 'Sin dato'}</dd></div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/70"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Estado</dt><dd className="mt-2"><Badge variant={selectedCycle.estado === 'ACTIVO' ? 'success' : 'neutral'}>{selectedCycle.estado}</Badge></dd></div>
            </dl>
            {selectedCycle.observaciones && <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{selectedCycle.observaciones}</p>}
          </CardBody>
        </Card>
        <section className="space-y-4" aria-label="Evaluaciones y producción del ciclo seleccionado">
          <CicloEvaluacionesSection key={`evaluaciones-${selectedCycle.id}`} cicloId={selectedCycle.id} />
          {canReadProduction && <CicloProduccionSection key={`produccion-${selectedCycle.id}-${harvestRefresh}`} cicloId={selectedCycle.id} onRegister={canRegisterHarvest ? () => setHarvestOpen(true) : undefined} />}
        </section>
      </div>}
    </div>}

    {selectedCycle && harvestOpen && canRegisterHarvest && <RegistrarCosechaDialog key={selectedCycle.id} cycle={selectedCycle} cycleNumber={cycleNumbers.get(selectedCycle.id) ?? 1} onClose={() => setHarvestOpen(false)} onSaved={() => { setHarvestOpen(false); setHarvestRefresh(current => current + 1); setNotice('Cosecha registrada correctamente.') }} />}

    {garden && registerOpen && <RegisterSowingDialog
      key={garden.id}
      huertoId={garden.id}
      huerto={garden.entornoCultivo ? entornoLabels[garden.entornoCultivo] : 'Huerto'}
      familia={garden.familia.nombreReferencia}
      onClose={() => setRegisterOpen(false)}
      onSaved={(cycle) => {
        setCycles((current) => [cycle, ...current])
        setSelectedCycleId(cycle.id)
        setNotice('Siembra registrada correctamente.')
        setRegisterOpen(false)
      }}
    />}
  </>
}
