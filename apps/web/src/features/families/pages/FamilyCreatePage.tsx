import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import LoadingState from '@/components/ui/LoadingState'
import Card, { CardBody } from '@/components/ui/Card'
import FamilyWizard from '@/features/families/components/FamilyWizard'
import { FamilyApiError, fetchCommunities } from '@/features/families/services/familyService'
import { integralErrorMessage } from '@/features/families/services/familyWizard'
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
        if (!controller.signal.aborted) setError(integralErrorMessage(cause instanceof FamilyApiError ? cause.status : undefined))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void loadCommunities()
    return () => controller.abort()
  }, [requestVersion])

  return <>
    <PageMeta title="Registrar familia | Viviendas León Guatemala" description="Registro de una familia beneficiaria." />
    <PageHeader title="Registrar familia" description="Registra la familia, sus integrantes y programas en cuatro pasos." actions={<Link to="/familias" className="layout-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-theme-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Volver al listado</Link>} />
    {loading && <Card><CardBody><LoadingState label="Cargando comunidades..." /></CardBody></Card>}
    {!loading && error && <Alert variant="error" title="No se pudieron cargar las comunidades">
      <p>{error}</p>
      <Button className="mt-3" variant="secondary" onClick={() => setRequestVersion((value) => value + 1)}>Reintentar</Button>
    </Alert>}
    {!loading && !error && <>
      {!communities.length && <Alert variant="warning" title="No hay comunidades disponibles">Se requiere una comunidad activa cuyo municipio también esté activo para registrar una familia.</Alert>}
      <div className="mt-5 min-w-0">
        <FamilyWizard communities={communities} onCreated={(family) => navigate(`/familias/${family.id}`)} />
      </div>
    </>}
    {!loading && (error || !communities.length) && <Button className="mt-4" variant="secondary" onClick={() => navigate('/familias')}>Volver al listado</Button>}
  </>
}
