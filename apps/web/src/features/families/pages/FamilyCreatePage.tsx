import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import LoadingState from '@/components/ui/LoadingState'
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
    <PageHeader title="Registrar familia" description="Crea el expediente básico de una familia beneficiaria." />
    {loading && <LoadingState label="Cargando comunidades..." />}
    {!loading && error && <Alert variant="error" title="No se pudieron cargar las comunidades">
      <p>{error}</p>
      <Button className="mt-3" variant="secondary" onClick={() => setRequestVersion((value) => value + 1)}>Reintentar</Button>
    </Alert>}
    {!loading && !error && <>
      {!communities.length && <Alert variant="warning" title="No hay comunidades disponibles">Se requiere una comunidad activa cuyo municipio también esté activo para registrar una familia.</Alert>}
      <div className="mt-4"><FamilyForm communities={communities} onSave={saveFamily} onCancel={() => navigate('/familias')} onCreated={(family) => navigate(`/familias/${family.id}`)} /></div>
    </>}
    {!loading && (error || !communities.length) && <Button className="mt-4" variant="secondary" onClick={() => navigate('/familias')}>Volver al listado</Button>}
  </>
}
