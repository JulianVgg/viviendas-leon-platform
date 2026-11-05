import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ClipboardCheck, ClipboardList, Leaf, UserRound } from 'lucide-react'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import Badge from '@/components/ui/Badge'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'
import { listCycleSeguimientos, type CycleSeguimientosPage } from '../services/cyclesService'
import { formatAgriculturalDate } from './agriculturalDate'

type LoadedEvaluations = {
  requestKey: string
  history: CycleSeguimientosPage | null
  error: string
}

function qualityVariant(quality: string | null): 'neutral' | 'success' | 'warning' | 'error' {
  const value = quality?.toUpperCase() ?? ''
  if (value.includes('BUEN') || value.includes('ALTA')) return 'success'
  if (value.includes('REGULAR') || value.includes('MEDIA')) return 'warning'
  if (value.includes('MALA') || value.includes('BAJA')) return 'error'
  return 'neutral'
}

/** AGR-06: solo lectura de evaluaciones AGR-04; no mezcla compromisos de las visitas. */
export default function CicloEvaluacionesSection({ cicloId }: { cicloId: number }) {
  const { usuario } = useAuth()
  const canRead = Boolean(usuario && canViewPath(usuario, '/gestion-agricola/ciclos'))
  const canViewVisits = Boolean(usuario && canViewPath(usuario, '/visitas/historial'))
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const [loaded, setLoaded] = useState<LoadedEvaluations>({ requestKey: '', history: null, error: '' })
  const requestKey = `${usuario?.id ?? 'anon'}:${cicloId}:${page}:${retry}`
  const loading = canRead && loaded.requestKey !== requestKey
  const history = loaded.requestKey === requestKey ? loaded.history : null
  const error = loaded.requestKey === requestKey ? loaded.error : ''

  useEffect(() => { setPage(1) }, [cicloId])
  useEffect(() => {
    if (!canRead || !Number.isSafeInteger(cicloId) || cicloId < 1) return
    const controller = new AbortController()
    listCycleSeguimientos(cicloId, page, controller.signal)
      .then(result => { if (!controller.signal.aborted) setLoaded({ requestKey, history: result, error: '' }) })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setLoaded({ requestKey, history: null,
          error: cause instanceof Error ? cause.message : 'No fue posible consultar las evaluaciones.' })
      })
    return () => controller.abort()
  }, [canRead, cicloId, page, requestKey])

  if (!canRead) return null
  return <Card className="h-full"><CardBody>
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"><ClipboardList aria-hidden="true" size={20} /></div>
        <div><h3 className="text-base font-semibold text-gray-900 dark:text-white">Evaluaciones agrícolas</h3><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Registradas durante visitas técnicas</p></div>
      </div>
      {canViewVisits && <Link to="/visitas/historial" className="layout-focus text-xs font-semibold text-brand-600 underline-offset-2 hover:underline dark:text-brand-400">Historial de visitas</Link>}
    </div>
    {error && <Alert variant="error" title="No se pudieron cargar las evaluaciones">{error}
      <Button type="button" variant="secondary" className="mt-3" onClick={() => setRetry(value => value + 1)}>Reintentar</Button>
    </Alert>}
    {loading && <LoadingState label="Consultando evaluaciones agrícolas..." />}
    {!loading && !error && history?.items.length === 0 && <div className="rounded-xl border border-dashed border-gray-200 px-4 py-7 text-center dark:border-gray-800">
      <ClipboardCheck aria-hidden="true" size={28} className="mx-auto mb-2 text-gray-400" />
      <p className="text-sm font-medium text-gray-800 dark:text-white">Sin evaluaciones sincronizadas</p>
      <p className="mt-1 text-xs text-gray-500">Las evaluaciones pendientes aparecerán al sincronizar las visitas.</p>
    </div>}
    {!loading && !error && history && history.items.length > 0 && <ol className="space-y-0" aria-label="Evaluaciones del ciclo">
      {history.items.map((item, index) => <li key={item.id} className="relative pb-5 pl-11 last:pb-0">
        {index < history.items.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[17px] top-9 border-l-2 border-dashed border-gray-200 dark:border-gray-700" />}
        <span aria-hidden="true" className="absolute left-0 top-0 flex size-9 items-center justify-center rounded-full border-2 border-white bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:border-gray-900 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/20"><ClipboardCheck size={17} /></span>
        <article className="min-w-0 rounded-xl border border-gray-200 bg-gray-50/50 p-3 sm:p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><time dateTime={item.fecha} className="text-sm font-semibold text-gray-900 dark:text-white">{formatAgriculturalDate(item.fecha)}</time><p className="mt-1 text-xs text-gray-500">Evaluación #{item.id}</p></div>
            <Badge>Visita #{item.visitaId}</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            <div><dt className="text-xs text-gray-500">Etapa</dt><dd className="mt-1 flex items-center gap-1.5 break-words text-sm font-medium text-gray-800 dark:text-white"><Leaf aria-hidden="true" size={14} className="shrink-0 text-success-600" />{item.etapa || 'No registrada'}</dd></div>
            <div><dt className="text-xs text-gray-500">Calidad</dt><dd className="mt-1"><Badge variant={qualityVariant(item.calidad)}>{item.calidad || 'No registrada'}</Badge></dd></div>
            <div className="col-span-2"><dt className="text-xs text-gray-500">Plantas observadas</dt><dd className="mt-1 text-sm font-medium text-gray-800 dark:text-white">{item.cantidadPlantasObservadas ?? 'Sin registro'}</dd></div>
          </dl>
          {item.observaciones && <p className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">{item.observaciones}</p>}
          <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><UserRound aria-hidden="true" size={14} /><span className="break-words">{item.responsable || 'Responsable no indicado'}</span></div>
        </article>
      </li>)}
    </ol>}
    {!loading && !error && history && history.pagination.totalPages > 1 && <nav aria-label="Paginación de evaluaciones" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
      <Button type="button" size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>Anterior</Button>
      <span aria-live="polite" className="text-xs font-medium text-gray-500">Página {history.pagination.page} de {history.pagination.totalPages}</span>
      <Button type="button" size="sm" variant="secondary" disabled={page >= history.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Siguiente</Button>
    </nav>}
  </CardBody></Card>
}
