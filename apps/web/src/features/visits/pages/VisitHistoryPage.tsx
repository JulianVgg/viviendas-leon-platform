import '../visits.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { RefreshCw, Search } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Button from '@/components/ui/Button'
import { useAuth } from '@/features/auth/AuthProvider'
import VisitDetailDialog from '@/features/visits/components/VisitDetailDialog'
import {
  getVisitFollowUps, getVisitList, syncPendingVisits,
  type VisitFollowUp, type VisitListItem,
} from '@/features/visits/services/visitService'

const card = 'rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('es-GT')
const statusName = (item: VisitListItem) => item.syncStatus && item.syncStatus !== 'synced'
  ? item.syncStatus === 'failed' ? 'Error de sincronización' : 'Pendiente de sincronización'
  : item.status === 'PROGRAMADA' ? 'Programada' : 'Realizada'
const visitStatusColor = (item: VisitListItem) => {
  if (item.syncStatus === 'failed') return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
  if (item.syncStatus && item.syncStatus !== 'synced') return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
  if (item.status === 'PROGRAMADA') return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
  return 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'
}

/** Los seguimientos de la visita son los creados allí o revisados en su captura.
 * El estado de compromiso NO reemplaza el estado administrativo de la visita. */
function visitFollowUps(visit: VisitListItem, all: VisitFollowUp[]): VisitFollowUp[] {
  const original = new Set((visit.capture?.commitments ?? []).map(c => c.id))
  const reviewed = new Set((visit.capture?.reviews ?? []).map(r => r.id))
  return all.filter(f => (visit.id !== null && f.sourceVisitId === visit.id) || original.has(f.id) || reviewed.has(f.id))
}
function nonComplianceCount(visit: VisitListItem, followups: VisitFollowUp[]) {
  const ids = new Set(followups.filter(f => f.status === 'NO_CUMPLIDO').map(f => f.id))
  for (const review of visit.capture?.reviews ?? []) {
    if (review.status === 'NO_CUMPLIDO') ids.add(review.id)
  }
  return ids.size
}

export default function VisitHistoryPage() {
  const { usuario } = useAuth()
  const [rows, setRows] = useState<VisitListItem[]>([])
  const [followups, setFollowups] = useState<VisitFollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [followUpError, setFollowUpError] = useState('')
  const [local, setLocal] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('TODAS')
  const [selected, setSelected] = useState<VisitListItem | null>(null)

  const refresh = useCallback(async () => {
    if (!usuario) { setLoading(false); return }
    setLoading(true)
    try {
      await syncPendingVisits(usuario.id)
      const visits = await getVisitList(usuario.id)
      setRows(visits.items)
      setLocal(visits.local)
      setError('')
      try {
        const result = await getVisitFollowUps(usuario.id)
        setFollowups(result.items)
        setFollowUpError(result.local ? 'Los compromisos pueden no estar actualizados porque se consultan datos locales.' : '')
      } catch (cause) {
        setFollowups([])
        setFollowUpError(cause instanceof Error ? cause.message : 'No se pudieron consultar los seguimientos.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial.')
    } finally { setLoading(false) }
  }, [usuario])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const followUpsByVisit = useMemo(() => new Map(rows.map(row => [
    row.operationId ?? `visit-${row.id}`, visitFollowUps(row, followups),
  ])), [rows, followups])
  const getFor = (row: VisitListItem) => followUpsByVisit.get(row.operationId ?? `visit-${row.id}`) ?? []
  const visible = rows.filter(row => {
    const term = search.trim().toLocaleLowerCase('es')
    if (term && !`${row.familyName} ${row.community}`.toLocaleLowerCase('es').includes(term)) return false
    if (filter === 'PENDIENTES') return row.syncStatus === 'pending' || row.syncStatus === 'syncing' || row.syncStatus === 'failed'
    if (filter === 'PROGRAMADA' || filter === 'REALIZADA') return row.status === filter
    if (filter === 'INCUMPLIDOS') return nonComplianceCount(row, getFor(row)) > 0
    return true
  })
  const completed = rows.filter(row => row.status === 'REALIZADA').length
  const upcoming = rows.filter(row => row.status === 'PROGRAMADA').length
  const pending = rows.filter(row => row.syncStatus && row.syncStatus !== 'synced').length
  const failures = rows.filter(row => nonComplianceCount(row, getFor(row)) > 0).length
  const selectedFollowUps = selected ? getFor(selected) : []

  return <div className="visits-enter">
    <PageMeta title="Historial de visitas | Viviendas León" description="Registro de visitas técnicas" />
    <PageHeader title="Historial de visitas" description="" actions={<Link to="/visitas/nueva" className="inline-flex min-h-11 items-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600">+ Registrar visita</Link>} />
    {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
    {followUpError && <p role="status" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Seguimientos: {followUpError}. No se debe interpretar una ausencia de indicadores como cumplimiento.</p>}
    {local && !error && <p className="mb-3 text-xs font-medium text-amber-700 dark:text-amber-300">Mostrando datos guardados en este dispositivo</p>}
    <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {([['Visitas realizadas', completed], ['Programadas', upcoming], ['Pendientes de sincronizar', pending], ['Visitas con incumplimientos', followUpError ? '—' : failures]] as const).map(([title, count]) =>
        <div key={title} className={`${card} p-5`}><p className="text-sm text-gray-500 dark:text-gray-400">{title}</p><p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{count}</p></div>
      )}
    </div>
    <section className={card} aria-label="Registro de visitas">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800"><h2 className="font-semibold text-gray-900 dark:text-white">Registro de visitas</h2><Button size="sm" variant="secondary" type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} /> Actualizar</Button></header>
      <div className="grid gap-3 p-5 md:grid-cols-[1fr_240px]">
        <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900"><Search size={17} className="text-gray-400" /><input aria-label="Buscar por familia o comunidad" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar familia o comunidad" className="h-11 min-w-0 flex-1 bg-transparent text-sm text-gray-800 outline-none dark:text-white" /></label>
        <select aria-label="Filtrar por estado" value={filter} onChange={e => setFilter(e.target.value)} className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value="TODAS">Todos los estados</option><option value="REALIZADA">Realizadas</option><option value="PROGRAMADA">Programadas</option><option value="INCUMPLIDOS">Con compromisos no cumplidos</option><option value="PENDIENTES">Pendientes de sincronizar</option>
        </select>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[810px] text-left text-sm"><thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:bg-gray-800/40"><tr><th className="px-5 py-3">Familia</th><th className="px-5 py-3">Comunidad</th><th className="px-5 py-3">Fecha</th><th className="px-5 py-3">Estado de visita</th><th className="px-5 py-3">Seguimientos</th><th className="px-5 py-3">Detalle</th></tr></thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {visible.map(row => {
            const key = row.operationId ?? `visit-${row.id}`
            const related = getFor(row)
            const notCompleted = nonComplianceCount(row, related)
            const open = related.filter(f => f.status === 'PENDIENTE').length
            return <tr key={key} className="align-top text-gray-700 dark:text-gray-300">
              <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">{row.familyName}</td>
              <td className="px-5 py-4">{row.community}</td>
              <td className="px-5 py-4">{dateLabel(row.date)}</td>
              <td className="px-5 py-4"><span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${visitStatusColor(row)}`}>{statusName(row)}</span></td>
              <td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">
                {notCompleted > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">No cumplido ({notCompleted})</span>}
                {open > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Pendiente ({open})</span>}
                {!notCompleted && !open && <span className="text-xs text-gray-500">{followUpError ? 'No disponible' : related.length ? 'Sin pendientes' : '—'}</span>}
              </div></td>
              <td className="px-5 py-4"><button type="button" onClick={() => setSelected(row)} className="text-sm font-semibold text-brand-600 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500 dark:text-brand-400">Ver detalle</button></td>
            </tr>
          })}
        </tbody></table>
        {!loading && visible.length === 0 && <div className="px-5 py-14 text-center text-sm text-gray-500">No se encontraron visitas</div>}
        {loading && <div className="px-5 py-14 text-center text-sm text-gray-500">Cargando visitas…</div>}
      </div>
      <footer className="border-t border-gray-200 px-5 py-4 text-xs text-gray-500 dark:border-gray-800">{visible.length} visita(s) · Los incumplimientos corresponden a compromisos, no al estado de la visita.</footer>
    </section>
    <VisitDetailDialog key={selected?.operationId ?? selected?.id ?? 'none'} visit={selected} onClose={() => setSelected(null)}
      extra={selectedFollowUps.length > 0 ? <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Seguimientos relacionados</h3>
        <div className="space-y-2">{selectedFollowUps.map(f => <div key={f.id} className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
          <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${f.status === 'NO_CUMPLIDO' ? 'bg-red-100 text-red-700' : f.status === 'CUMPLIDO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{f.status === 'NO_CUMPLIDO' ? 'No cumplido' : f.status === 'CUMPLIDO' ? 'Cumplido' : 'Pendiente'}</span>{f.due && <span className="text-xs text-gray-500">Revisar: {dateLabel(f.due)}</span>}</div>
          <p className="mt-2 text-gray-800 dark:text-gray-200">{f.text}</p>
          {f.observation && <p className="mt-1 text-xs text-gray-500">{f.observation}</p>}
        </div>)}</div>
      </section> : undefined} />
  </div>
}
