import { useEffect } from 'react'
import { subscribeConnectionRecovery } from '@/services/connectivity'
import { listPendingOperations } from '@/services/pendingOperations'

export const SYNC_READY_EVENT = 'viviendas-leon:sync-ready'

/**
 * OFF-05: informa que el servidor volvió y hay una cola local para revisar.
 * NO envía operaciones ni cambia su estado; no existe aún sincronización real.
 * Un módulo futuro podrá escuchar el evento y procesar cada operación con
 * un endpoint autenticado, idempotencia y confirmaciones válidas del servidor.
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
  }), [])

  return null
}
