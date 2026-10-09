import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
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
    <PageHeader title="Expediente de familia" description="Datos del registro almacenado en la plataforma." actions={<Link to="/familias" className="rounded-lg px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-400">Volver al listado</Link>} />
    {loading && <LoadingState label="Consultando expediente..." />}
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
    {!loading && family && <Card>
      <CardHeader title={family.nombreReferencia} description={`Expediente ${family.id}`} />
      <CardBody><dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {fields.map(([label, value]) => <div key={label} className={label === 'Observaciones' ? 'sm:col-span-2' : ''}>
          <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-900 dark:text-slate-100">{value}</dd>
        </div>)}
      </dl></CardBody>
    </Card>}
  </>
}
