import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Alert from '@/components/ui/Alert'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import LoadingState from '@/components/ui/LoadingState'
import FamilyIntegralRecord from '../components/FamilyIntegralRecord'
import { FamilyApiError, fetchIntegralFamily } from '../services/familyService'
import { recordFailure, type RecordFailure } from '../services/familyRecord'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import type { IntegralFamilyRecord } from '../types/familyIntegral'
import { useAuth } from '@/features/auth/AuthProvider'
import { canWriteFamilies } from '@/features/auth/screenPermissions'

type RecordState = { kind: 'loading' } | { kind: 'loaded'; family: IntegralFamilyRecord } | { kind: 'error'; failure: RecordFailure }

function FamilyDetailRequest({ id, onRetry }: { id: string; onRetry: () => void }) {
  const [state, setState] = useState<RecordState>({ kind: 'loading' })
  const errorPanel = useRef<HTMLDivElement>(null)
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const family = await fetchIntegralFamily(id, signal)
    if (!signal?.aborted) setState({ kind: 'loaded', family })
    return family
  }, [id])
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const family = await fetchIntegralFamily(id, controller.signal)
        if (!controller.signal.aborted) setState({ kind: 'loaded', family })
      } catch (cause) {
        if (!controller.signal.aborted) setState({ kind: 'error', failure: recordFailure(cause instanceof FamilyApiError ? cause.status : undefined, cause instanceof FamilyApiError ? cause.code : undefined) })
      }
    }
    void load()
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    if (state.kind === 'error') errorPanel.current?.focus()
  }, [state])

  if (state.kind === 'loading') return <Card><CardBody><LoadingState label="Consultando expediente integral..." /></CardBody></Card>
  if (state.kind === 'error') return <div ref={errorPanel} tabIndex={-1} className="layout-focus rounded-xl"><Alert variant="error" title={state.failure.title}>
    <p>{state.failure.message}</p>
    {state.failure.retry && <Button type="button" variant="secondary" className="mt-3" onClick={onRetry}>Reintentar</Button>}
    {state.failure.kind === 'session' && <Link to="/login" className="layout-focus mt-3 inline-flex min-h-11 items-center rounded-lg px-2 font-medium underline">Iniciar sesión</Link>}
  </Alert></div>
  return <FamilyIntegralRecord family={state.family} onRefresh={() => refresh()} />
}

export default function FamilyDetailPage() {
  const { id = '' } = useParams()
  const { usuario } = useAuth()
  const canEdit = Boolean(usuario && canWriteFamilies(usuario))
  const [version, setVersion] = useState(0)
  const isOnline = useOnlineStatus()
  return <>
    <PageMeta title="Expediente integral de familia | Viviendas León Guatemala" description="Consulta de información general, integrantes y programas de una familia." />
    <PageHeader title="Expediente familiar" description={canEdit ? 'Consulta el expediente y administra la información autorizada.' : 'Información general, integrantes y programas. Consulta de solo lectura.'} actions={<div className="flex flex-wrap gap-2">{canEdit && <Link to={`/familias/${id}/editar`} className="layout-focus inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600">Editar información</Link>}<Link to="/familias" className="layout-focus inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-theme-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Volver al listado</Link></div>} />
    <div className="min-w-0 space-y-5">
      <Alert variant="warning" title="Protección de datos">Consulta únicamente expedientes autorizados y evita compartir información personal fuera de la plataforma.</Alert>
      {!isOnline ? <Alert variant="warning" title="Sin conexión">Conéctate a la red para consultar el expediente integral. No se guarda una copia local con datos personales. La consulta se reanudará al recuperar la conexión.</Alert> : <FamilyDetailRequest key={`${id}-${version}`} id={id} onRetry={() => setVersion((value) => value + 1)} />}
    </div>
  </>
}
