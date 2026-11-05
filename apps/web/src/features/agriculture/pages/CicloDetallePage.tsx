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
import { getCycle, type Cycle } from '../services/cyclesService'
import CicloProduccionSection from '../components/CicloProduccionSection'
import CicloEvaluacionesSection from '../components/CicloEvaluacionesSection'

export default function CicloDetallePage() {
  const { id = '' } = useParams()
  const cycleId = /^[1-9]\d*$/.test(id) ? Number(id) : 0
  const { usuario } = useAuth()
  const allowed = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/ciclos'))
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => { setCycle(null) }, [cycleId])
  useEffect(() => {
    if (!allowed || !cycleId || !Number.isSafeInteger(cycleId)) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setError('')
    getCycle(cycleId, controller.signal)
      .then(record => { if (!controller.signal.aborted) setCycle(record) })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el seguimiento.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [cycleId, retry, allowed])

  if (!allowed) return <Alert variant="error" title="Acceso restringido">No tienes permiso para consultar seguimientos agrícolas.</Alert>
  if (!cycleId || !Number.isSafeInteger(cycleId)) return <Alert variant="error" title="Ciclo inválido">El identificador de la siembra no es válido.</Alert>
  return <>
    <PageMeta title="Historial del ciclo | ViviendasLeón" description="Evolución de una siembra durante las visitas técnicas." />
    <PageHeader title="Seguimiento del ciclo agrícola" description="Evaluaciones registradas durante visitas técnicas realizadas." actions={<Link to="/gestion-agricola/ciclos" className="text-sm text-brand-600 underline">Volver a ciclos agrícolas</Link>} />
    {error && <Alert variant="error" title="No se pudo consultar" className="mb-4">{error}<Button type="button" variant="secondary" onClick={() => setRetry(value => value + 1)} className="mt-3">Reintentar</Button></Alert>}
    {loading && <LoadingState label="Consultando ciclo e historial..." />}
    {!loading && !error && cycle && <div className="space-y-5">
      <Card><CardBody>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{cycle.cultivo.nombre} · Ciclo #{cycle.id}</h2><Badge>{cycle.estado}</Badge></div>
        <p className="text-sm">Familia: <Link className="text-brand-600 underline" to={`/familias/${cycle.huerto.familiaId}?tab=gardens`}>{cycle.huerto.familia.nombreReferencia}</Link> · {cycle.huerto.familia.comunidad.nombre}</p>
        <p className="mt-1 text-sm">Huerto: {cycle.huerto.nombre || `Huerto #${cycle.huertoId}`}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Siembra: {cycle.fechaSiembra || 'Sin fecha'} · Trasplante: {cycle.fechaTrasplante || 'Sin fecha'} · Plantas iniciales: {cycle.cantidadPlantas ?? 'No registradas'}</p>
        {cycle.observaciones && <p className="mt-2 whitespace-pre-wrap text-sm">Observaciones iniciales: {cycle.observaciones}</p>}
      </CardBody></Card>
      <CicloProduccionSection cicloId={cycle.id} />
      <CicloEvaluacionesSection key={cycle.id} cicloId={cycle.id} />
    </div>}
  </>
}
