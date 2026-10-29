import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import ComponentCard from '@/components/common/ComponentCard'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteGardens, isDireccionGeneral } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { gardenImageUrl, listGardens, type Garden } from '../services/gardens'
import { listCycles, type Cycle } from '../services/cyclesService'
import RegisterSowingDialog from './RegisterSowingDialog'

export default function FamilyGardensSection({ familyId }: { familyId: number }) {
  const [gardens, setGardens] = useState<Garden[]>([])
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selectedGarden, setSelectedGarden] = useState<Garden | null>(null)
  const [notice, setNotice] = useState('')
  const [params] = useSearchParams()
  const { usuario } = useAuth()
  const online = useOnlineStatus()
  const canCreate = Boolean(usuario && canWriteGardens(usuario))
  const canReadCycles = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/ciclos'))
  const canRegister = Boolean(usuario && (isDireccionGeneral(usuario) || usuario.permisos.includes('CICLOS_WRITE')))

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

  const renderCycles = (garden: Garden) => {
    if (!canReadCycles) return <p className="text-xs text-slate-500">No tienes permiso para consultar siembras.</p>
    const related = cycles.filter(c => c.huertoId === garden.id)
    const current = related.filter(c => c.estado === 'ACTIVO')
    const historic = related.filter(c => c.estado !== 'ACTIVO')
    const line = (cycle: Cycle) => <li key={cycle.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
      <div><p className="font-medium text-slate-900 dark:text-white">{cycle.cultivo.nombre} <span className="text-xs text-slate-500">#{cycle.id}</span></p>
        <p className="text-xs text-slate-500">Siembra: {cycle.fechaSiembra || 'No indicada'} · Trasplante: {cycle.fechaTrasplante || 'No indicado'}</p>
        <p className="text-xs text-slate-500">Cantidad inicial: {cycle.cantidadPlantas ?? 'No indicada'} plantas</p>
        <Link to={`/gestion-agricola/ciclos/${cycle.id}`} className="mt-1 inline-block text-xs font-semibold text-brand-600 underline">Ver seguimiento</Link>
      </div><Badge>{cycle.estado}</Badge>
    </li>
    return <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <h4 className="text-sm font-semibold">Siembras activas ({current.length})</h4>
      {current.length ? <ul>{current.map(line)}</ul> : <p className="text-xs text-slate-500">Sin siembras activas.</p>}
      {historic.length > 0 && <details className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
        <summary className="cursor-pointer text-sm font-medium">Historial de siembras ({historic.length})</summary>
        <ul className="mt-2">{historic.map(line)}</ul>
      </details>}
    </div>
  }

  return <ComponentCard title="Huertos y cultivos" description="Registra siembras directamente desde cada huerto de la familia." actions={canCreate ? <Link to={`/gestion-agricola/huertos/nuevo?familiaId=${familyId}`} className="layout-focus inline-flex min-h-10 items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">+ Registrar huerto</Link> : undefined}>
    {!online && <Alert variant="warning" title="Sin conexión" className="mb-4">Las altas de huertos y siembras requieren conexión. Las visitas técnicas conservan su propio flujo de sincronización.</Alert>}
    {params.get('creado') === '1' && <Alert variant="success" className="mb-4">Huerto guardado. Si está activo, ya puedes registrar la primera siembra.</Alert>}
    {params.has('imagenError') && <Alert variant="warning" className="mb-4">El huerto se registró, pero su imagen no pudo guardarse. Puedes incorporarla desde la vista general de huertos.</Alert>}
    {notice && <Alert variant="success" className="mb-4">{notice}</Alert>}
    {loading && <LoadingState label="Consultando huertos y siembras..." />}
    {error && <Alert variant="error" title="No se pudo cargar" className="mb-4">{error}<Button variant="secondary" type="button" onClick={() => setRetry((n) => n + 1)} className="mt-3">Reintentar</Button></Alert>}
    {!loading && !error && gardens.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Esta familia todavía no tiene huertos registrados.</p>}
    {!loading && !error && gardens.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{gardens.map(garden => <article key={garden.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {gardenImageUrl(garden) && <img src={gardenImageUrl(garden)!} alt={`Vista satelital de ${garden.nombre || `huerto ${garden.id}`}`} loading="lazy" className="h-40 w-full object-cover" />}
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900 dark:text-white">{garden.nombre || `Huerto #${garden.id}`}</h3><Badge>{garden.estado}</Badge></div>
        <p className="text-xs text-slate-500">{garden.tipo || 'Tipo no especificado'} · {garden.fechaInicio || 'Sin fecha de inicio'}</p>
        {garden.observaciones && <p className="text-xs text-slate-500">{garden.observaciones}</p>}
        {renderCycles(garden)}
        {garden.estado === 'ACTIVO' && canRegister && <Button type="button" size="sm" disabled={!online} onClick={() => { setNotice(''); setSelectedGarden(garden) }}>+ Registrar siembra</Button>}
        {garden.estado !== 'ACTIVO' && <p className="text-xs text-slate-500">Activa el huerto antes de registrar nuevas siembras.</p>}
      </div>
    </article>)}</div>}
    {selectedGarden && <RegisterSowingDialog key={selectedGarden.id} huertoId={selectedGarden.id} huerto={selectedGarden.nombre || `Huerto #${selectedGarden.id}`}
      familia={selectedGarden.familia.nombreReferencia} onClose={() => setSelectedGarden(null)}
      onSaved={cycle => { setCycles(current => [cycle, ...current]); setNotice('Siembra registrada correctamente.'); setSelectedGarden(null) }} />}
  </ComponentCard>
}
