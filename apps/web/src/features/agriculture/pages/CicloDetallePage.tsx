import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Alert from '@/components/ui/Alert'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'
import { getCycle, listCycleSeguimientos, type Cycle, type CycleSeguimientosPage } from '../services/cyclesService'
import CicloProduccionSection from '../components/CicloProduccionSection'

const emptyPage = (): CycleSeguimientosPage => ({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } })

export default function CicloDetallePage() {
  const { id = '' } = useParams()
  const cycleId = /^[1-9]\d*$/.test(id) ? Number(id) : 0
  const { usuario } = useAuth()
  const allowed = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/ciclos'))
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [seguimientos, setSeguimientos] = useState<CycleSeguimientosPage>(emptyPage)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => { setPage(1); setCycle(null); setSeguimientos(emptyPage()) }, [cycleId])
  useEffect(() => {
    if (!allowed || !cycleId || !Number.isSafeInteger(cycleId)) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setError('')
    Promise.all([getCycle(cycleId, controller.signal), listCycleSeguimientos(cycleId, page, controller.signal)])
      .then(([record, history]) => { if (!controller.signal.aborted) { setCycle(record); setSeguimientos(history) } })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el seguimiento.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [cycleId, page, retry, allowed])

  if (!allowed) return <Alert variant="error" title="Acceso restringido">No tienes permiso para consultar seguimientos agrícolas.</Alert>
  if (!cycleId || !Number.isSafeInteger(cycleId)) return <Alert variant="error" title="Ciclo inválido">El identificador de la siembra no es válido.</Alert>
  return <>
    <PageMeta title="Historial del ciclo | ViviendasLeón" description="Evolución de una siembra durante las visitas técnicas." />
    <PageHeader title="Seguimiento del ciclo agrícola" description="Evaluaciones registradas durante visitas técnicas realizadas." actions={<Link to="/gestion-agricola/ciclos" className="text-sm text-brand-600 underline">Volver a ciclos agrícolas</Link>} />
    {error && <Alert variant="error" title="No se pudo consultar" className="mb-4">{error}<Button type="button" variant="secondary" onClick={() => setRetry(value => value + 1)} className="mt-3">Reintentar</Button></Alert>}
    {loading && <LoadingState label="Consultando ciclo e historial..." />}
    {cycle && <div className="space-y-5">
      <Card><CardBody>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{cycle.cultivo.nombre} · Ciclo #{cycle.id}</h2><Badge>{cycle.estado}</Badge></div>
        <p className="text-sm">Familia: <Link className="text-brand-600 underline" to={`/familias/${cycle.huerto.familiaId}?tab=gardens`}>{cycle.huerto.familia.nombreReferencia}</Link> · {cycle.huerto.familia.comunidad.nombre}</p>
        <p className="mt-1 text-sm">Huerto: {cycle.huerto.nombre || `Huerto #${cycle.huertoId}`}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Siembra: {cycle.fechaSiembra || 'Sin fecha'} · Trasplante: {cycle.fechaTrasplante || 'Sin fecha'} · Plantas iniciales: {cycle.cantidadPlantas ?? 'No registradas'}</p>
        {cycle.observaciones && <p className="mt-2 whitespace-pre-wrap text-sm">Observaciones iniciales: {cycle.observaciones}</p>}
      </CardBody></Card>
      <CicloProduccionSection cicloId={cycle.id} />
      <Card><CardBody>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold">Historial de evaluaciones</h2><p className="text-sm text-slate-500">{seguimientos.pagination.total} evaluaciones registradas</p></div></div>
        {!loading && !error && seguimientos.items.length === 0 && <p className="text-sm text-slate-500">Este ciclo todavía no tiene evaluaciones registradas.</p>}
        <ol className="space-y-3">{seguimientos.items.map(item => <li key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Visita #{item.visitaId} · {item.fecha}</h3><span className="text-xs text-slate-500">Evaluación #{item.id}</span></div>
          <p className="mt-2 text-sm">Responsable: {item.responsable}</p>
          <p className="mt-1 text-sm">Etapa: {item.etapa || 'No registrada'} · Calidad: {item.calidad || 'No registrada'}</p>
          <p className="mt-1 text-sm">Plantas observadas: {item.cantidadPlantasObservadas ?? 'No registradas'}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{item.observaciones || 'Sin observaciones específicas registradas.'}</p>
          {usuario && canViewPath(usuario, '/visitas/historial') && <Link to="/visitas/historial" className="mt-2 inline-block text-sm text-brand-600 underline">Consultar historial de visitas</Link>}
        </li>)}</ol>
        {seguimientos.pagination.totalPages > 1 && <div className="mt-5 flex items-center justify-between gap-3">
          <Button type="button" variant="secondary" disabled={loading || page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Anterior</Button>
          <span className="text-sm">Página {seguimientos.pagination.page} de {seguimientos.pagination.totalPages}</span>
          <Button type="button" variant="secondary" disabled={loading || page >= seguimientos.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Siguiente</Button>
        </div>}
      </CardBody></Card>
    </div>}
  </>
}
