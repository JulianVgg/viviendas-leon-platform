import { useEffect } from 'react'
import { subscribeConnectionRecovery } from '@/services/connectivity'
import { listPendingOperations } from '@/services/pendingOperations'
import { syncDemoPendingOperations } from '@/services/offlineSync'

export const SYNC_READY_EVENT = 'viviendas-leon:sync-ready'
export const SYNC_FINISHED_EVENT = 'viviendas-leon:sync-finished'

/**
 * OFF-05 + OFF-06: una recuperación comprobada puede iniciar el envío real
 * únicamente de notas sintéticas en DEV. No se procesan operaciones de negocio.
 */
export default function ConnectivitySyncBridge() {
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

    if (!import.meta.env.DEV) return
    try {
      const summary = await syncDemoPendingOperations()
      window.dispatchEvent(new CustomEvent(SYNC_FINISHED_EVENT, { detail: summary }))
    } catch {
      window.dispatchEvent(new CustomEvent(SYNC_FINISHED_EVENT, { detail: null }))
    }
  }), [])

  return null
}
