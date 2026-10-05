import { cn } from '@/app/lib/cn'

export type SyncState = 'synced' | 'syncing' | 'pending' | 'offline' | 'error'

const labels: Record<SyncState, string> = {
  synced: 'Sincronizado',
  syncing: 'Sincronizando',
  pending: 'Pendiente de sincronización',
  offline: 'Sin conexión',
  error: 'Error de sincronización',
}

const styles: Record<SyncState, string> = {
  synced: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  syncing: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  pending: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  offline: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
  error: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
}

export default function SyncStatus({ state, pendingCount = 0 }: { state: SyncState; pendingCount?: number }) {
  const label = state === 'pending' && pendingCount > 0 ? `${labels[state]} (${pendingCount})` : labels[state]
  return <div aria-label={`Estado de conectividad: ${label}`} role="status" className={cn('inline-flex rounded-full border px-2.5 py-1 text-xs font-medium', styles[state])}>{label}</div>
}
