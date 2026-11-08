import { useMemo, useState } from 'react'
import { CalendarCheck, CalendarClock, CalendarX2, CheckCircle2, GraduationCap, History, UsersRound } from 'lucide-react'
import type { IndicadoresVisitasCapacitaciones } from '../services/dashboardSummaryService'
import { ProBarChart } from '../charts/TailAdminCharts'
import { seriesActividadResponsables } from '../lib/chartSeries'

const fmt = (n: number) => n.toLocaleString('es-GT')
const tile = 'rounded-xl border border-gray-200 p-4 dark:border-gray-800'
export default function VisitasCapacitacionesPanel({ datos, alNavegar, puedeAbrir }: { datos: IndicadoresVisitasCapacitaciones; alNavegar: (ruta: string) => void; puedeAbrir: (ruta: string) => boolean }) {
  const [buscar,setBuscar]=useState('')
  const responsables=useMemo(()=>datos.porResponsable.filter(r=>r.nombre.toLocaleLowerCase('es').includes(buscar.trim().toLocaleLowerCase('es'))),[buscar,datos.porResponsable])
  const tarjetas = [
    {etiqueta:'Visitas realizadas',valor:datos.visitas.realizadas,icono:CheckCircle2,ruta:'/visitas/historial'},
    {etiqueta:'Programadas',valor:datos.visitas.programadas,icono:CalendarCheck,ruta:'/visitas/agenda'},
    {etiqueta:'Vencidas',valor:datos.visitas.vencidas,icono:CalendarX2,ruta:'/visitas/agenda'},
    {etiqueta:'Reprogramadas',valor:datos.visitas.reprogramadas,icono:History,ruta:'/visitas/historial'},
    {etiqueta:'Capacitaciones realizadas',valor:datos.capacitaciones.realizadas,icono:GraduationCap,ruta:'/actividades/capacitaciones/historial'},
    {etiqueta:'Capacitaciones programadas',valor:datos.capacitaciones.programadas,icono:CalendarClock,ruta:'/actividades/capacitaciones/historial'},
  ]
  const seriesResponsables = seriesActividadResponsables(responsables)
  return <section aria-label="MON-03 · Visitas y capacitaciones" className="space-y-4">
    <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Visitas y capacitaciones</h2></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{tarjetas.map(item=><button type="button" key={item.etiqueta} onClick={() => alNavegar(item.ruta)} disabled={!puedeAbrir(item.ruta)} aria-label={`Ir a ${item.etiqueta}`} className={`${tile} text-left transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:border-brand-300 enabled:hover:shadow-theme-sm focus-visible:outline-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50`}>
      <item.icono size={18} className="mb-3 text-[#3C6E8E]"/><p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{fmt(item.valor)}</p><p className="mt-1 text-xs text-gray-500">{item.etiqueta}</p>
    </button>)}</div>
    {datos.alcance==='INSTITUCIONAL' && <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><UsersRound size={18} className="text-[#3C6E8E]"/><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Actividad realizada por responsable</h3></div>
        <input aria-label="Filtrar por responsable" placeholder="Buscar responsable" value={buscar} onChange={e=>setBuscar(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-gray-200 sm:w-52"/>
      </div>
      {responsables.length > 0 ? <div className="max-h-[460px] overflow-y-auto">
        <ProBarChart labels={seriesResponsables.labels} series={seriesResponsables.series}
          ariaLabel="Actividad realizada por cada responsable" stacked horizontal
          height={Math.max(230, responsables.length * 52)} colors={['#3C6E8E','#15A38D']}/>
      </div> : <p className="text-sm text-gray-500">Sin actividad realizada para mostrar.</p>}
    </div>}
  </section>
}
