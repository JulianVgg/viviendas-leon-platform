import { useEffect, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import LoadingState from '@/components/ui/LoadingState'
import { getCycle } from '../services/cyclesService'

/** Mantiene accesibles enlaces anteriores sin abrir el listado duplicado. */
export default function LegacyProductionRedirect() {
  const [params] = useSearchParams()
  const { id } = useParams()
  const cycleId = Number(id ?? params.get('cicloId'))
  const gardenId = Number(params.get('huertoId'))
  const [resolved, setResolved] = useState<{ cycle: number; garden: number } | null>(null)
  useEffect(() => {
    if (!Number.isSafeInteger(cycleId) || cycleId < 1) return
    const controller = new AbortController()
    getCycle(cycleId, controller.signal)
      .then(cycle => { if (!controller.signal.aborted) setResolved({ cycle: cycle.id, garden: cycle.huertoId }) })
      .catch(() => { if (!controller.signal.aborted) setResolved({ cycle: cycleId, garden: 0 }) })
    return () => controller.abort()
  }, [cycleId])
  if (Number.isSafeInteger(cycleId) && cycleId > 0 && resolved?.cycle !== cycleId) {
    return <LoadingState label="Abriendo huerto..." />
  }
  const target = Number.isSafeInteger(cycleId) && cycleId > 0
    ? resolved?.garden ? `/gestion-agricola/huertos/${resolved.garden}?cicloId=${cycleId}${params.get('registrarCosecha') === '1' ? '&registrarCosecha=1' : ''}` : '/gestion-agricola/huertos'
    : Number.isSafeInteger(gardenId) && gardenId > 0 ? `/gestion-agricola/huertos/${gardenId}` : '/gestion-agricola/huertos'
  return <Navigate replace to={target} />
}
