import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck2, CalendarClock, CalendarDays, Search, Sprout } from 'lucide-react'
import FamilyStatusDot from '@/features/families/components/FamilyStatusDot'
import { filterFamilyVisitCoverage, type CoverageFilter, type FamilyCoverageRow } from '../services/familyVisitCoverage'

type Props = {
  rows: FamilyCoverageRow[]
  loading?: boolean
  local?: boolean
  compact?: boolean
  selectionDisabled?: boolean
  selectedFamilyId?: number | null
  onSelect?: (familyId: number) => void
  onSchedule?: (familyId: number) => void
}
const LIMIT = 8
const selectClass = 'h-9 min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 text-xs text-gray-700 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
const stateStyle = {
  realizada: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-500/10',
  agendada: 'border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-500/10',
  vencida: 'border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-500/10',
  pendiente: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900',
} as const

export default function FamilyVisitCoveragePanel({ rows, loading = false, local = false, compact = false, selectionDisabled = false, selectedFamilyId, onSelect, onSchedule }: Props) {
  const [filter, setFilter] = useState<CoverageFilter>('faltan')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(LIMIT)
  const filtered = useMemo(() => filterFamilyVisitCoverage(rows, filter, search), [rows, filter, search])
  const missing = rows.filter(row => row.status === 'pendiente' || row.status === 'vencida').length
  useEffect(() => { setLimit(LIMIT) }, [filter, search])
  const available = filtered.slice(0, limit)
  return <section className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 `} aria-label="Familias con huerto y cobertura de visitas">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      <div className="flex items-center gap-2"><Sprout size={17} className="text-brand-600"/><h2 className="text-sm font-semibold text-gray-900 dark:text-white">Familias con huerto</h2></div>
      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{missing} por gestionar</span>
    </header>
    <div className="grid gap-2 border-b border-gray-100 p-3 dark:border-gray-800 sm:grid-cols-[minmax(0,1fr)_minmax(130px,auto)]">
      <label className="relative min-w-0"><span className="sr-only">Buscar familia o comunidad</span><Search aria-hidden="true" size={15} className="absolute left-2.5 top-2.5 text-gray-400"/>
        <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar familia o comunidad" className={`${selectClass} w-full pl-8`}/>
      </label>
      <label><span className="sr-only">Filtrar cobertura de visitas</span><select aria-label="Filtrar cobertura de visitas" value={filter} onChange={e => setFilter(e.target.value as CoverageFilter)} className={`${selectClass} w-full`}>
        <option value="faltan">Por gestionar</option><option value="todas">Todas</option><option value="pendiente">Por agendar</option><option value="vencida">Vencidas</option><option value="agendada">Agendadas</option><option value="realizada">Visitadas</option>
      </select></label>
    </div>
    <div className={`custom-scrollbar space-y-2 overflow-y-auto p-3 ${compact ? 'max-h-[35vh]' : 'max-h-[42vh]'}`}>
      {local && <p className="text-xs text-amber-700 dark:text-amber-300">Datos locales.</p>}
      {loading && rows.length === 0 ? <p role="status" className="py-4 text-center text-xs text-gray-500">Consultando familias…</p> : null}
      {!loading && filtered.length === 0 ? <p className="py-5 text-center text-xs text-gray-500">{rows.length ? 'Sin familias para estos filtros.' : 'Sin familias con huerto disponibles.'}</p> : null}
      {available.map(row => {
        const completed = row.status === 'realizada' || row.status === 'agendada'
        const subtitle = row.status === 'realizada' ? 'Visitada · últimos 8 días'
          : row.status === 'agendada' ? `Agendada · ${row.scheduledDate}`
            : row.status === 'vencida' ? 'Visita vencida · reprogramar' : 'Por agendar'
        return <div key={row.familyId} className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 text-xs ${stateStyle[row.status]} ${selectedFamilyId === row.familyId ? 'ring-2 ring-brand-400' : ''}`}>
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${row.status === 'realizada' ? 'bg-emerald-100 text-emerald-700' : row.status === 'agendada' ? 'bg-sky-100 text-sky-700' : row.status === 'vencida' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`} aria-hidden="true">
            {row.status === 'realizada' ? <CalendarCheck2 size={16}/> : row.status === 'agendada' ? <CalendarCheck2 size={16}/> : row.status === 'vencida' ? <CalendarClock size={16}/> : <CalendarDays size={16}/>}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-100 ${completed ? 'line-through decoration-gray-400' : ''}`}><FamilyStatusDot state={row.familyState}/><span className="min-w-0 truncate" title={row.name}>{row.name}</span></p>
            <p className="mt-0.5 truncate text-gray-500" title={`${row.community} · ${subtitle}`}>{subtitle}</p>
          </div>
          {onSelect ? <button type="button" disabled={selectionDisabled} aria-label={`Seleccionar ${row.name}`} onClick={() => onSelect(row.familyId)} className="shrink-0 rounded-lg border border-brand-200 px-2.5 py-2 font-medium text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-brand-700 dark:text-brand-300" >{selectedFamilyId === row.familyId ? 'Elegida' : 'Elegir'}</button>
            : row.status === 'pendiente' && onSchedule ? <button type="button" onClick={() => onSchedule(row.familyId)} className="shrink-0 rounded-lg bg-brand-500 px-2.5 py-2 font-semibold text-white transition hover:bg-brand-600">Agendar</button> : null}
        </div>
      })}
      {filtered.length > available.length && <button type="button" onClick={() => setLimit(prev => prev + LIMIT)} className="w-full rounded-lg border border-gray-200 py-2 text-xs font-medium text-brand-600 transition hover:bg-brand-50 dark:border-gray-700 dark:text-brand-300">Mostrar {Math.min(LIMIT, filtered.length - available.length)} más</button>}
    </div>
    <footer className="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-500 dark:border-gray-800">{filtered.length} de {rows.length} familias · Ciclo de 8 días</footer>
  </section>
}
