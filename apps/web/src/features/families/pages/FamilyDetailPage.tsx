import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import { FamilyApiError } from '@/features/families/services/familyService'
import { fetchFamilyWithOffline } from '@/features/families/services/familyOfflineService'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import type { FamilyDetail } from '@/features/families/types/family'

export default function FamilyDetailPage() {
  const { id = '' } = useParams()
  const [family, setFamily] = useState<FamilyDetail>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [notFound, setNotFound] = useState(false)
  const [requestVersion, setRequestVersion] = useState(0)
  const [dataOrigin, setDataOrigin] = useState<'remote' | 'cache' | null>(null)
  const [cachedAt, setCachedAt] = useState<string | null>(null)
  const isOnline = useOnlineStatus()

  useEffect(() => {
    const controller = new AbortController()
    async function loadFamily() {
      setLoading(true)
      setFamily(undefined)
      setError(undefined)
      setNotFound(false)
      setDataOrigin(null)
      setCachedAt(null)
      try {
        const response = await fetchFamilyWithOffline(id, controller.signal)
        if (!controller.signal.aborted) {
          setFamily(response.data)
          setDataOrigin(response.source)
          setCachedAt(response.savedAt)
        }
      } catch (cause) {
        if (controller.signal.aborted) return
        setNotFound(cause instanceof FamilyApiError && cause.status === 404)
        setError(cause instanceof Error ? cause.message : 'No fue posible consultar la familia.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadFamily()
    return () => controller.abort()
  }, [id, requestVersion, isOnline])

  const fields = family ? [
    ['ID del expediente', String(family.id)],
    ['Nombre de referencia', family.nombreReferencia],
    ['Comunidad', family.comunidad.nombre],
    ['Municipio', family.comunidad.municipio.nombre],
    ['Estado', family.estado],
    ['Fecha de ingreso', family.fechaIngreso ? new Intl.DateTimeFormat('es-GT', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(family.fechaIngreso)) : 'Sin fecha'],
    ['Observaciones', family.observaciones || 'Sin observaciones'],
  ] : []

  return <>
    <PageMeta title="Expediente de familia | Viviendas León Guatemala" description="Consulta de los datos básicos de una familia beneficiaria." />
    <PageHeader title="Expediente de familia" description="Consulta la identificación, ubicación y datos de ingreso de la familia." actions={<Link to="/familias" className="layout-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-theme-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Volver al listado</Link>} />
    {loading && <Card><CardBody><LoadingState label="Consultando expediente..." /></CardBody></Card>}
    {!loading && error && <Alert variant="error" title={notFound ? 'Familia no encontrada' : 'No se pudo consultar el expediente'}>
      <p>{error}</p>
      {!notFound && <Button className="mt-3" variant="secondary" onClick={() => setRequestVersion((value) => value + 1)}>Reintentar</Button>}
    </Alert>}
    {!loading && family && dataOrigin === 'cache' && (
      <Alert variant="warning" title="Expediente desde una copia local" className="mb-4">
        Copia guardada {cachedAt ? new Date(cachedAt).toLocaleString('es-GT') : 'anteriormente'}.
        Solo lectura; los datos podrían estar desactualizados.
      </Alert>
    )}
    {!loading && family && <div className="grid min-w-0 items-start gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader title={family.nombreReferencia} description={`Expediente #${family.id}`} />
        <CardBody>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
            {fields.filter(([label]) => label !== 'Observaciones').map(([label, value]) => <div key={label} className="min-w-0 border-b border-slate-100 pb-5 dark:border-slate-800">
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-slate-900 dark:text-slate-100">
                {label === 'Estado' ? <Badge variant={family.estado.toUpperCase() === 'ACTIVA' ? 'success' : family.estado.toUpperCase() === 'RETIRADA' ? 'warning' : 'neutral'}>{value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()}</Badge> : value}
              </dd>
            </div>)}
          </dl>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Observaciones" description="Información complementaria del expediente." />
        <CardBody><dl><dt className="sr-only">Observaciones</dt><dd className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-slate-300">{family.observaciones || 'Sin observaciones'}</dd></dl></CardBody>
      </Card>
    </div>}
  </>
}
