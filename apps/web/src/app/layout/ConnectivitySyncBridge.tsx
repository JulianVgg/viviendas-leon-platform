import { useEffect } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { esTecnicoCampo } from '@/features/auth/calendarAccess'
import { fieldAccessActive } from '@/features/auth/services/fieldAccess'
import { getFieldDownload, prepareFieldData } from '@/features/offline/services/prepareFieldData'
import { syncPendingVisits } from '@/features/visits/services/visitService'
import { getConnectivitySnapshot, subscribeConnectivity } from '@/services/connectivity'
import { listPendingOperations } from '@/services/pendingOperations'
import { syncDemoPendingOperations } from '@/services/offlineSync'

export const SYNC_READY_EVENT = 'viviendas-leon:sync-ready'
export const SYNC_FINISHED_EVENT = 'viviendas-leon:sync-finished'
export const FIELD_REFRESH_EVENT = 'viviendas-leon:field-refresh'
const FRESH_FOR_MS = 15 * 60_000

/** Una sola coordinación de fondo por sesión: sin pedirle al técnico que cambie de modo.
 * Sin clave local, la información solo permanece en memoria hasta cerrar la PWA.
 */
export default function ConnectivitySyncBridge() {
  const { usuario, modoAcceso, verificarSesion } = useAuth()
  const userId = usuario?.id
  const isFieldWorker = Boolean(usuario && esTecnicoCampo(usuario))

  useEffect(() => {
    if (!userId || !isFieldWorker || modoAcceso !== 'online') return
    let disposed = false
    let inFlight = false
    let lastAuthCheck = 0
    let lastRefreshAttempt = 0
    let lastStatus = getConnectivitySnapshot().status

    const emit = (state: string, detail: Record<string, unknown> = {}) => {
      if (!disposed) window.dispatchEvent(new CustomEvent(FIELD_REFRESH_EVENT, { detail: { state, ...detail } }))
    }
    const run = async () => {
      if (disposed || inFlight || getConnectivitySnapshot().status !== 'connected') return
      inFlight = true
      try {
        // Al reconectar primero se comprueba la cookie real, nunca la clave local.
        if (Date.now() - lastAuthCheck > 60_000) {
          if (!await verificarSesion()) { emit('auth-required'); return }
          lastAuthCheck = Date.now()
        }
        // La precarga nunca debe quedar detrás de fotos pendientes y reintentos.
        void syncPendingVisits(userId, true).catch(() => { /* Cola conservada. */ })
        const pending = await listPendingOperations().catch(() => [])
        if (!disposed) window.dispatchEvent(new CustomEvent(SYNC_READY_EVENT, { detail: {
          pendingCount: pending.filter(op => op.status !== 'synced').length,
        } }))

        // Siempre se descargan los datos autorizados al iniciar sesión. Sin
        // clave: copia de memoria (cortes durante la sesión). Con clave: copia
        // cifrada en IndexedDB (permite cerrar/reabrir sin internet).
        if (Date.now() - lastRefreshAttempt > 60_000) {
          const prior = await getFieldDownload(userId).catch(() => null)
          const durable = fieldAccessActive(userId)
          if (!prior || (durable && prior.storage !== 'encrypted') ||
              Date.now() - Date.parse(prior.downloadedAt) > FRESH_FOR_MS) {
            lastRefreshAttempt = Date.now()
            emit('downloading')
            try {
              const result = await prepareFieldData(userId, (message) => emit('downloading', { message }))
              emit('ready', { downloadedAt: result.downloadedAt, storage: result.storage })
            } catch (error) {
              emit('error', { message: error instanceof Error ? error.message : 'No se pudo actualizar.' })
            }
          }
        }
      } finally { inFlight = false }
    }
    const onConnection = () => {
      const now = getConnectivitySnapshot().status
      if (now === 'connected' && lastStatus !== 'connected') lastAuthCheck = 0
      lastStatus = now
      void run()
    }
    // La comprobación periódica también reintenta sin exigir una transición online/offline.
    const unlisten = subscribeConnectivity(onConnection)
    const timer = window.setInterval(() => void run(), 15_000)
    const onForeground = () => void run()
    const onPrepared = () => { lastRefreshAttempt = 0; void run() }
    window.addEventListener('focus', onForeground)
    window.addEventListener('viviendas-leon:field-prepared', onPrepared)
    void run()
    return () => {
      disposed = true
      unlisten()
      window.clearInterval(timer)
      window.removeEventListener('focus', onForeground)
      window.removeEventListener('viviendas-leon:field-prepared', onPrepared)
    }
  }, [userId, isFieldWorker, modoAcceso, verificarSesion])

  // Se mantiene únicamente la sincronización de demostración durante desarrollo.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    let previous = getConnectivitySnapshot().status
    return subscribeConnectivity(() => {
      const current = getConnectivitySnapshot().status
      if (current === 'connected' && previous !== 'connected') {
        void syncDemoPendingOperations().then(summary => {
          window.dispatchEvent(new CustomEvent(SYNC_FINISHED_EVENT, { detail: summary }))
        }).catch(() => {})
      }
      previous = current
    })
  }, [])

  return null
}
