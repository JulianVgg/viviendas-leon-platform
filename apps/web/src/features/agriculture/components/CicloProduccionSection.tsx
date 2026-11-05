import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CalendarDays, PackageCheck, Scale } from 'lucide-react'
import Card, { CardBody } from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import LoadingState from '@/components/ui/LoadingState'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, canWriteProduction } from '@/features/auth/screenPermissions'
import { listProductions, type Production } from '../services/productionService'
import { formatAgriculturalDate } from './agriculturalDate'

/** AGR-05: cosechas registradas; las estimaciones de visitas no se incluyen. */
export default function CicloProduccionSection({ cicloId }: { cicloId: number }) {
  const { usuario } = useAuth()
  const canRead = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/produccion'))
  const canRegister = Boolean(usuario && canWriteProduction(usuario))
  const [retry, setRetry] = useState(0)
  const requestKey = `${cicloId}:${retry}:${usuario?.id ?? 'anon'}`
  const [loaded, setLoaded] = useState<{ key: string; records: Production[]; error: string }>({ key: '', records: [], error: '' })
  const loading = canRead && loaded.key !== requestKey
  const records = loaded.key === requestKey ? loaded.records.filter(record => record.cicloCultivoId === cicloId) : []
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
  return <Card className="h-full"><CardBody>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400"><PackageCheck aria-hidden="true" size={20} /></div>
        <div><h3 className="text-base font-semibold text-gray-900 dark:text-white">Cosechas reales</h3><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Producción AGR-05, sin estimaciones de visitas</p></div>
      </div>
      {canRegister && <Link to={`/gestion-agricola/produccion?cicloId=${cicloId}`}
        className="layout-focus inline-flex min-h-9 items-center rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600">Registrar cosecha</Link>}
    </div>
    {error && <Alert variant="error" title="No se pudo consultar la producción">{error}
      <Button type="button" variant="secondary" className="mt-3" onClick={() => setRetry(n => n + 1)}>Reintentar</Button>
    </Alert>}
    {loading && <LoadingState label="Consultando cosechas reales..." />}
    {!loading && !error && records.length === 0 && <div className="rounded-xl border border-dashed border-gray-200 px-4 py-7 text-center dark:border-gray-800">
      <PackageCheck aria-hidden="true" size={28} className="mx-auto mb-2 text-gray-400" />
      <p className="text-sm font-medium text-gray-800 dark:text-white">Sin cosechas registradas</p>
      <p className="mt-1 text-xs text-gray-500">Este ciclo todavía no registra producción real.</p>
    </div>}
    {!loading && !error && records.length > 0 && <ul className="space-y-3" aria-label="Cosechas del ciclo">
      {records.map(record => <li key={record.id} className="min-w-0 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2"><CalendarDays aria-hidden="true" size={17} className="shrink-0 text-gray-400" />
            <div><p className="text-sm font-semibold text-gray-900 dark:text-white">{record.fechaCosecha ? formatAgriculturalDate(record.fechaCosecha) : `${formatAgriculturalDate(record.fechaInicioPeriodo)} – ${formatAgriculturalDate(record.fechaFinPeriodo)}`}</p>
              <p className="mt-1 text-xs text-gray-500">Registro #{record.id}</p></div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {record.detalles.map(detail => <div key={detail.id} className="inline-flex min-w-0 items-center gap-2 rounded-lg bg-success-50 px-3 py-2 dark:bg-success-500/10">
            <Scale aria-hidden="true" size={16} className="shrink-0 text-success-700 dark:text-success-400" />
            <span className="break-words text-sm font-semibold text-success-800 dark:text-success-300">{detail.cantidadTotal} {detail.unidadMedida.abreviatura || detail.unidadMedida.nombre}</span>
          </div>)}
          {record.detalles.length === 0 && <span className="text-sm text-gray-500">Sin cantidades detalladas.</span>}
        </div>
        {record.observaciones && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-300">{record.observaciones}</p>}
      </li>)}
    </ul>}
    {!loading && !error && records.length > 0 && <p className="mt-4 text-xs text-gray-500">Se muestran hasta 500 registros recientes. Las unidades se conservan tal como fueron registradas y no se suman entre sí.</p>}
  </CardBody></Card>
}
