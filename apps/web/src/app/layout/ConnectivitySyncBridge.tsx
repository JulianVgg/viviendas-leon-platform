import { useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { syncPendingVisits } from '@/features/visits/services/visitService'
import { getConnectivitySnapshot, subscribeConnectivity, subscribeConnectionRecovery } from '@/services/connectivity'
import { listPendingOperations } from '@/services/pendingOperations'
import { syncDemoPendingOperations } from '@/services/offlineSync'

export const SYNC_READY_EVENT = 'viviendas-leon:sync-ready'
export const SYNC_FINISHED_EVENT = 'viviendas-leon:sync-finished'

/**
 * OFF-05 + OFF-06: una recuperación comprobada puede iniciar el envío real
 * únicamente de notas sintéticas en DEV. No se procesan operaciones de negocio.
 */
export default function ConnectivitySyncBridge() {
  const { usuario } = useAuth()
  // Procesa una vez al abrir una sesión que ya tiene la API disponible.
  useEffect(() => {
    if (!usuario) return
    let started = false
    const startOnce = () => {
      if (started || getConnectivitySnapshot().status !== 'connected') return
      started = true
      void syncPendingVisits(usuario.id).catch(() => { /* conservar cola */ })
    }
    startOnce()
    return subscribeConnectivity(startOnce)
  }, [usuario])
  useEffect(() => subscribeConnectionRecovery(async () => {
    try {
      const outstanding = await listPendingOperations()
      window.dispatchEvent(new CustomEvent(SYNC_READY_EVENT, {
        detail: { pendingCount: outstanding.length },
      }))
    } catch {
      window.dispatchEvent(new CustomEvent(SYNC_READY_EVENT, {
        detail: { pendingCount: null },
      }))
    }

    if (usuario) {
      try { await syncPendingVisits(usuario.id) } catch { /* Pendientes conservados */ }
    }
    if (!import.meta.env.DEV) return
    try {
      const summary = await syncDemoPendingOperations()
      window.dispatchEvent(new CustomEvent(SYNC_FINISHED_EVENT, { detail: summary }))
    } catch {
      window.dispatchEvent(new CustomEvent(SYNC_FINISHED_EVENT, { detail: null }))
    }
  }), [usuario])

  return null
}
