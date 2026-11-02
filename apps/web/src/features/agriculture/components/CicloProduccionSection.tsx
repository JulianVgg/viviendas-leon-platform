import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import Card, { CardBody } from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteProduction } from '@/features/auth/screenPermissions'
import { listProductions, type Production } from '../services/productionService'

/** AGR-05: resultados reales, independientes de las estimaciones de visitas. */
export default function CicloProduccionSection({ cicloId }: { cicloId: number }) {
  const { usuario } = useAuth()
  const canRead = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/produccion'))
  const canRegister = Boolean(usuario && canWriteProduction(usuario))
  const [retry, setRetry] = useState(0)
  const requestKey = `${cicloId}:${retry}:${usuario?.id ?? 'anon'}`
  const [loaded, setLoaded] = useState<{ key: string; records: Production[]; error: string }>({ key: '', records: [], error: '' })
  const loading = canRead && loaded.key !== requestKey
  const records = loaded.key === requestKey ? loaded.records : []
  const error = loaded.key === requestKey ? loaded.error : ''

  useEffect(() => {
    if (!canRead) return
    const controller = new AbortController()
    listProductions(cicloId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setLoaded({ key: requestKey, records: data, error: '' }) })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setLoaded({ key: requestKey, records: [], error: cause instanceof Error ? cause.message : 'No se pudo consultar las cosechas.' })
      })
    return () => controller.abort()
  }, [cicloId, canRead, requestKey])

  if (!canRead) return null
  return <Card><CardBody>
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Producción cosechada</h2>
        <p className="mt-1 text-sm text-slate-500">Cosechas efectivamente registradas para este ciclo; no incluye estimaciones de las visitas.</p>
      </div>
      {canRegister && <Link className="layout-focus inline-flex min-h-10 items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600" to={`/gestion-agricola/produccion?cicloId=${cicloId}`}>Registrar cosecha</Link>}
    </div>
    {error && <Alert variant="error" title="No se pudo consultar la producción">{error}<Button type="button" variant="secondary" className="mt-3" onClick={() => setRetry(n => n + 1)}>Reintentar</Button></Alert>}
    {loading && <LoadingState label="Consultando producción real..." />}
    {!loading && !error && records.length === 0 && <p className="text-sm text-slate-500">Aún no hay cosechas registradas en este ciclo.</p>}
    {!loading && !error && records.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm">
      <thead><tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800"><th className="py-2 pr-4 font-medium">Fecha o período</th><th className="py-2 pr-4 font-medium">Cantidad cosechada</th><th className="py-2 font-medium">Observaciones</th></tr></thead>
      <tbody>{records.map(record => <tr key={record.id} className="border-b border-slate-100 align-top dark:border-slate-800">
        <td className="py-3 pr-4">{record.fechaCosecha ?? `${record.fechaInicioPeriodo} – ${record.fechaFinPeriodo}`}</td>
        <td className="py-3 pr-4">{record.detalles.map(detail => <div key={detail.id}>{detail.cantidadTotal} {detail.unidadMedida.abreviatura ?? detail.unidadMedida.nombre}</div>)}</td>
        <td className="py-3">{record.observaciones || '—'}</td>
      </tr>)}</tbody>
    </table></div>}
    <p className="mt-3 text-xs text-slate-500">Se muestran hasta 500 registros recientes. Las cantidades de unidades distintas no deben sumarse sin conversión validada.</p>
  </CardBody></Card>
}
