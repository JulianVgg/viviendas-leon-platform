import type { FiltrosDashboard } from '../lib/dashboardFilters'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { consultarDetalleIndicador, type DetalleIndicador, type TipoDetalleIndicador } from '../services/dashboardSummaryService'

const titulos: Record<TipoDetalleIndicador,string> = {
  familias:'Familias beneficiarias', huertos:'Huertos activos', ciclos:'Ciclos activos',
  visitas:'Visitas realizadas', capacitaciones:'Capacitaciones', vencidas:'Visitas vencidas',
}
const fechaGT = (fecha?:string) => fecha ? fecha.split('-').reverse().join('/') : null

export default function IndicadorDetalleDialog({ tipo, meses, filtros, cerrar }: {
  tipo: TipoDetalleIndicador; meses: 3|6|12; filtros?: FiltrosDashboard; cerrar: () => void
}) {
  const [pagina,setPagina] = useState(1)
  const [detalle,setDetalle] = useState<DetalleIndicador|null>(null)
  const [cargando,setCargando] = useState(true)
  const [error,setError] = useState('')
  const [intento,setIntento] = useState(0)
  const cerrarRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previo = document.body.style.overflow
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    cerrarRef.current?.focus()
    const keydown = (event:KeyboardEvent) => { if(event.key==='Escape') cerrar() }
    window.addEventListener('keydown',keydown)
    return () => {document.body.style.overflow=previo;window.removeEventListener('keydown',keydown);focoAnterior?.focus({preventScroll:true})}
  },[cerrar])
  useEffect(()=>{
    const controller=new AbortController()
    setCargando(true);setError('')
    void consultarDetalleIndicador(tipo,meses,pagina,controller.signal,filtros).then(datos=>{
      if(!controller.signal.aborted) setDetalle(datos)
    }).catch(()=>{if(!controller.signal.aborted) setError('No se pudo cargar el listado.')})
      .finally(()=>{if(!controller.signal.aborted) setCargando(false)})
    return ()=>controller.abort()
  },[tipo,meses,pagina,intento,filtros?.comunidadId,filtros?.responsableId])
  return createPortal(<div className="indicator-detail-backdrop fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6" onMouseDown={event=>{if(event.target===event.currentTarget) cerrar()}}>
    <section role="dialog" aria-modal="true" aria-labelledby="detalle-indicador-titulo" className="indicator-detail-enter flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
      <header className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-800">
        <div><h2 id="detalle-indicador-titulo" className="text-lg font-semibold text-gray-900 dark:text-white">{titulos[tipo]}</h2>
</div>
        <button type="button" ref={cerrarRef} onClick={cerrar} aria-label="Cerrar detalle" className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"><X size={18}/></button>
      </header>
      <div className="min-h-40 flex-1 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        {cargando && <div className="space-y-3" aria-label="Consultando registros">{Array.from({length:4},(_,i)=><div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"/>)}</div>}
        {!cargando && error && <p role="alert" className="text-sm text-rose-600">{error} <button type="button" onClick={()=>setIntento(i=>i+1)} className="underline">Reintentar</button></p>}
        {!cargando && !error && !detalle?.registros.length && <p className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500 dark:bg-gray-800">Sin registros para mostrar.</p>}
        {!cargando && !error && detalle?.registros.map(registro=><article key={registro.id} className="mb-2 flex items-start justify-between gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100" title={registro.titulo}>{registro.titulo}</p><p className="mt-1 text-xs text-gray-500">{registro.subtitulo}</p>
            {registro.fecha && <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500"><CalendarDays size={13}/>{fechaGT(registro.fecha)}</p>}
          </div>{registro.estado && <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{registro.estado}</span>}
        </article>)}
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-gray-100 p-4 dark:border-gray-800">
        <span className="text-xs text-gray-500">{detalle ? `${detalle.total.toLocaleString('es-GT')} registros · ${detalle.pagina} de ${detalle.totalPaginas}` : 'Registros'}</span>
        <div className="flex gap-2">
          <button type="button" aria-label="Página anterior" disabled={cargando||pagina<=1} onClick={()=>setPagina(p=>Math.max(1,p-1))} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 dark:border-gray-700"><ChevronLeft size={17}/></button>
          <button type="button" aria-label="Página siguiente" disabled={cargando||!detalle||pagina>=detalle.totalPaginas} onClick={()=>setPagina(p=>p+1)} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 dark:border-gray-700"><ChevronRight size={17}/></button>
        </div>
      </footer>
    </section>
  </div>, document.body)
}
