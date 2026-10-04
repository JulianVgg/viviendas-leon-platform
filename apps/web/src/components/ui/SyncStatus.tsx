import Badge from './Badge'

type SyncState = 'synced' | 'syncing' | 'pending' | 'offline' | 'error'
const labels: Record<SyncState, string> = { synced: 'Sincronizado', syncing: 'Sincronizando', pending: 'Pendiente de sincronización', offline: 'Sin conexión', error: 'Error de sincronización' }
const variants = { synced: 'success', syncing: 'neutral', pending: 'warning', offline: 'neutral', error: 'error' } as const

export default function SyncStatus({ state, pendingCount = 0 }: { state: SyncState; pendingCount?: number }) {
  const label = state === 'pending' && pendingCount > 0 ? `${labels[state]} (${pendingCount})` : labels[state]
  return <div aria-label={`Estado de conectividad: ${label}`} role="status" className="inline-flex"><Badge variant={variants[state]}>{label}</Badge></div>
}
