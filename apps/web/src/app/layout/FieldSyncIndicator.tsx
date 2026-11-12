import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CloudCheck, CloudOff, CloudUpload, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { esTecnicoCampo } from '@/features/auth/calendarAccess'
import { useConnectivityStatus } from '@/hooks/useConnectivityStatus'
import { listQueueOperations } from '@/services/pendingOperations'
import { VISIT_QUEUE_EVENT, VISIT_SYNC_KIND } from '@/features/visits/services/visitService'
import { canRetryVisitSync } from '@/features/visits/services/visitRetryPolicy'
import SyncStatus from '@/components/ui/SyncStatus'

export default function FieldSyncIndicator() {
  const { usuario } = useAuth()
  const connectivity = useConnectivityStatus()
  const [counts, setCounts] = useState({ pending: 0, review: 0, syncing: 0 })
  const worker = Boolean(usuario && esTecnicoCampo(usuario))

  useEffect(() => {
    if (!usuario || !worker) return
    let mounted = true
    const userId = usuario.id
    const refresh = () => {
      void listQueueOperations().then(operations => {
        if (!mounted) return
        const own = operations.filter(op => op.kind === VISIT_SYNC_KIND &&
          (op.payload as { ownerId?: number } | undefined)?.ownerId === userId)
        setCounts({
          pending: own.filter(op => op.status === 'pending' || (op.status === 'failed' && canRetryVisitSync(op.lastError))).length,
          review: own.filter(op => op.status === 'failed' && !canRetryVisitSync(op.lastError)).length,
          syncing: own.filter(op => op.status === 'syncing').length,
        })
      }).catch(() => {})
    }
    refresh()
    const interval = window.setInterval(refresh, 15_000)
    window.addEventListener(VISIT_QUEUE_EVENT, refresh)
    return () => { mounted = false; window.clearInterval(interval); window.removeEventListener(VISIT_QUEUE_EVENT, refresh) }
  }, [usuario?.id, worker])

  if (!worker) return <SyncStatus state={connectivity.status} />
  const down = connectivity.status !== 'connected'
  const pending = counts.pending + counts.syncing
  const label = counts.review ? `${counts.review} visita(s) por revisar`
    : counts.syncing ? `Sincronizando · ${counts.syncing} en proceso`
    : pending ? `${pending} visita(s) pendiente(s)`
    : down ? 'Sin conexión · datos del dispositivo' : 'Todo sincronizado'
  const Icon = counts.review ? AlertTriangle : counts.syncing || pending ? CloudUpload : down ? CloudOff : CloudCheck
  return <div role="status" aria-live="polite" className="inline-flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
    <Icon aria-hidden="true" size={15} className={counts.review ? 'text-rose-600' : pending || down ? 'text-amber-600' : 'text-emerald-600'} />
    <span>{label}</span>
    {counts.review > 0 && <Link to="/visitas/historial" className="font-semibold text-brand-600 underline dark:text-brand-300">Revisar</Link>}
  </div>
}
