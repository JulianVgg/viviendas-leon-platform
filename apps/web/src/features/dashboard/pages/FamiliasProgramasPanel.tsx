import { useMemo, useState } from 'react'
import { ArrowUpRight, CheckCircle2, UsersRound } from 'lucide-react'
import type { ResumenFamiliasProgramas } from '../services/dashboardSummaryService'

const porcentaje = (n: number) => `${Math.max(0, Math.min(100, n))}%`
const tarjeta = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-6'

export default function FamiliasProgramasPanel({ datos }: { datos: ResumenFamiliasProgramas }) {
  const [seleccion, setSeleccion] = useState<number | 'todos'>('todos')
  const programa = useMemo(() => datos.programas.find(item => item.id === seleccion), [datos.programas, seleccion])
  const principal = programa ? programa.familias : datos.familiasConPrograma
  const pct = programa ? programa.porcentaje : datos.porcentajeCobertura
  const radio = 68
  const circunferencia = 2 * Math.PI * radio
  return <section aria-label="MON-02 · Familias y programas" className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Familias y programas</h2></div>
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Programa
        <select value={seleccion} onChange={e => setSeleccion(e.target.value === 'todos' ? 'todos' : Number(e.target.value))}
          className="ml-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200" aria-label="Consultar participación por programa">
          <option value="todos">Todos</option>
          {datos.programas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </label>
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <div className={tarjeta}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Participación</h3>
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{programa ? programa.nombre : 'Institucional'}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8">
          <div className="relative size-48 shrink-0" role="img" aria-label={`${pct}% de las familias registradas en ${programa?.nombre ?? 'algún programa'}`}>
            <svg viewBox="0 0 180 180" className="size-full -rotate-90" aria-hidden="true">
              <circle cx="90" cy="90" r={radio} strokeWidth="15" stroke="currentColor" className="fill-none text-gray-100 dark:text-gray-800"/>
              <circle cx="90" cy="90" r={radio} stroke="#3C6E8E" strokeWidth="15" strokeLinecap="round" fill="none"
                strokeDasharray={circunferencia} strokeDashoffset={circunferencia * (1 - pct/100)}
                className="transition-[stroke-dashoffset] duration-700 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-semibold tracking-tight text-gray-900 tabular-nums dark:text-white">{pct}%</span>
              <span className="mt-1 text-xs text-gray-500">Cobertura</span>
            </div>
          </div>
          <div className="min-w-32 space-y-4">
            <div><span className="block text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{principal}</span><span className="text-xs text-gray-500">Familias participantes</span></div>
            <div><span className="block text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{datos.totalFamilias}</span><span className="text-xs text-gray-500">Familias registradas</span></div>
            {!programa && <div className="flex items-center gap-2 text-xs text-gray-500"><UsersRound size={15}/>{datos.familiasSinPrograma} sin programa activo</div>}
          </div>
        </div>
      </div>
      <div className={tarjeta}>
        <div className="mb-5 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Participación por programa</h3><ArrowUpRight size={17} className="text-gray-400"/></div>
        <div className="max-h-80 space-y-5 overflow-y-auto pr-1">
          {datos.programas.map(p => <button type="button" key={p.id} onClick={() => setSeleccion(current => current === p.id ? 'todos' : p.id)}
            aria-pressed={seleccion === p.id}
            className={`block w-full rounded-lg p-1 text-left focus-visible:outline-2 focus-visible:outline-brand-500 ${seleccion === p.id ? 'bg-brand-50/70 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <span className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-gray-800 dark:text-gray-200" title={p.nombre}>{p.nombre}</span><span className="shrink-0 font-semibold tabular-nums text-gray-900 dark:text-white">{p.familias} <span className="font-normal text-gray-400">· {p.porcentaje}%</span></span></span>
            <span className="block h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><span className="block h-full rounded-full bg-[#3C6E8E] transition-[width] duration-700 ease-out" style={{width:porcentaje(p.porcentaje)}} /></span>
          </button>)}
          {!datos.programas.length && <p className="text-sm text-gray-500">Sin programas registrados.</p>}
        </div>
      </div>
    </div>
    <div className={tarjeta}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Familias por comunidad</h3><span className="flex items-center gap-1.5 text-xs text-gray-500"><CheckCircle2 size={14}/> Registros vigentes</span></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {datos.comunidades.map(c => <div key={c.nombre} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3"><span className="min-w-0 truncate text-sm font-medium text-gray-700 dark:text-gray-200" title={c.nombre}>{c.nombre}</span><span className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{c.total}</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-[#15A38D] transition-[width] duration-700" style={{width:porcentaje(c.total ? Math.round(c.conPrograma/c.total*100) : 0)}}/></div>
          <p className="mt-2 text-xs text-gray-500">{c.conPrograma} con programa</p>
        </div>)}
        {!datos.comunidades.length && <p className="text-sm text-gray-500">Sin familias registradas.</p>}
      </div>
    </div>
  </section>
}
