import { useMemo, useState } from 'react'
import { CalendarCheck, CalendarClock, CalendarX2, CheckCircle2, GraduationCap, History, UsersRound } from 'lucide-react'
import type { IndicadoresVisitasCapacitaciones } from '../services/dashboardSummaryService'

const fmt = (n: number) => n.toLocaleString('es-GT')
const tile = 'rounded-xl border border-gray-200 p-4 dark:border-gray-800'
export default function VisitasCapacitacionesPanel({ datos }: { datos: IndicadoresVisitasCapacitaciones }) {
  const [buscar,setBuscar]=useState('')
  const responsables=useMemo(()=>datos.porResponsable.filter(r=>r.nombre.toLocaleLowerCase('es').includes(buscar.trim().toLocaleLowerCase('es'))),[buscar,datos.porResponsable])
  const tarjetas = [
    {etiqueta:'Visitas realizadas',valor:datos.visitas.realizadas,icono:CheckCircle2},
    {etiqueta:'Programadas',valor:datos.visitas.programadas,icono:CalendarCheck},
    {etiqueta:'Vencidas',valor:datos.visitas.vencidas,icono:CalendarX2},
    {etiqueta:'Reprogramadas',valor:datos.visitas.reprogramadas,icono:History},
    {etiqueta:'Capacitaciones realizadas',valor:datos.capacitaciones.realizadas,icono:GraduationCap},
    {etiqueta:'Capacitaciones programadas',valor:datos.capacitaciones.programadas,icono:CalendarClock},
  ]
  const max=Math.max(1,...responsables.map(item=>item.visitas+item.capacitaciones))
  return <section aria-label="MON-03 · Visitas y capacitaciones" className="space-y-4">
    <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Visitas y capacitaciones</h2></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{tarjetas.map(item=><div key={item.etiqueta} className={tile}>
      <item.icono size={18} className="mb-3 text-[#3C6E8E]"/><p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{fmt(item.valor)}</p><p className="mt-1 text-xs text-gray-500">{item.etiqueta}</p>
    </div>)}</div>
    {datos.alcance==='INSTITUCIONAL' && <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><UsersRound size={18} className="text-[#3C6E8E]"/><h3 className="text-sm font-semibold text-gray-800 dark:text-white">Actividad realizada por responsable</h3></div>
        <input aria-label="Filtrar por responsable" placeholder="Buscar responsable" value={buscar} onChange={e=>setBuscar(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-gray-200 sm:w-52"/>
      </div>
      <div className="max-h-80 space-y-4 overflow-y-auto pr-1">{responsables.map(item=><div key={item.id}>
        <div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="truncate font-medium text-gray-700 dark:text-gray-200">{item.nombre}</span><span className="shrink-0 text-gray-500">{fmt(item.visitas)} visitas · {fmt(item.capacitaciones)} capacitaciones</span></div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" aria-label={`${item.nombre}: ${item.visitas} visitas, ${item.capacitaciones} capacitaciones`}>
          <div className="bg-[#3C6E8E] transition-[width] duration-700" style={{width:`${item.visitas/max*100}%`}}/><div className="bg-[#15A38D] transition-[width] duration-700" style={{width:`${item.capacitaciones/max*100}%`}}/>
        </div>
      </div>)}{!responsables.length && <p className="text-sm text-gray-500">Sin actividad realizada para mostrar.</p>}</div>
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500"><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#3C6E8E]"/>Visitas</span><span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-[#15A38D]"/>Capacitaciones</span></div>
    </div>}
  </section>
}
