import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import LoadingState from '@/components/ui/LoadingState'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import FamilyForm from '@/features/families/components/FamilyForm'
import { fetchCommunities, saveFamily } from '@/features/families/services/familyService'
import type { CommunityOption } from '@/features/families/types/family'

export default function FamilyCreatePage() {
  const navigate = useNavigate()
  const [communities, setCommunities] = useState<CommunityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function loadCommunities() {
      setLoading(true)
      setError(undefined)
      try {
        const data = await fetchCommunities(controller.signal)
        if (!controller.signal.aborted) setCommunities(data)
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible consultar las comunidades.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadCommunities()
    return () => controller.abort()
  }, [requestVersion])

  return <>
    <PageMeta title="Registrar familia | Viviendas León Guatemala" description="Registro de una familia beneficiaria." />
    <PageHeader title="Registrar familia" description="Completa los datos básicos para crear un expediente de familia." actions={<Link to="/familias" className="layout-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-theme-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Volver al listado</Link>} />
    {loading && <Card><CardBody><LoadingState label="Cargando comunidades..." /></CardBody></Card>}
    {!loading && error && <Alert variant="error" title="No se pudieron cargar las comunidades">
      <p>{error}</p>
      <Button className="mt-3" variant="secondary" onClick={() => setRequestVersion((value) => value + 1)}>Reintentar</Button>
    </Alert>}
    {!loading && !error && <>
      {!communities.length && <Alert variant="warning" title="No hay comunidades disponibles">Se requiere una comunidad activa cuyo municipio también esté activo para registrar una familia.</Alert>}
      <div className="mt-5 grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <FamilyForm communities={communities} onSave={saveFamily} onCancel={() => navigate('/familias')} onCreated={(family) => navigate(`/familias/${family.id}`)} />
        <Card><CardHeader title="Antes de guardar" /><CardBody><ul className="space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-300"><li>El nombre de referencia y la comunidad son obligatorios.</li><li>La fecha de ingreso y las observaciones son opcionales.</li><li>La familia se registrará con estado activo. Al guardar, se abrirá su expediente.</li></ul></CardBody></Card>
      </div>
    </>}
    {!loading && (error || !communities.length) && <Button className="mt-4" variant="secondary" onClick={() => navigate('/familias')}>Volver al listado</Button>}
  </>
}
