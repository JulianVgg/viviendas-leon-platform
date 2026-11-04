import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { FiltrosDashboard } from '../lib/dashboardFilters'
import { consultarCosechasDashboard, type ResumenCosechasDashboard } from '../services/dashboardSummaryService'

const fechaGT = (fecha: string) => fecha.split('-').reverse().join('/')

/** MON-04/AGR-05: consulta sin edición y con los filtros activos del Dashboard. */
export default function CosechasDashboardDialog({ meses, filtros, cerrar }: {
  meses: 3 | 6 | 12
  filtros: FiltrosDashboard
  cerrar: () => void
}) {
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState<ResumenCosechasDashboard | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const cerrarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previo = document.body.style.overflow
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    cerrarRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') cerrar() }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previo
      window.removeEventListener('keydown', onKeyDown)
      focoAnterior?.focus({ preventScroll: true })
    }
  }, [cerrar])

  useEffect(() => {
    const controller = new AbortController()
    setCargando(true)
    setError('')
    void consultarCosechasDashboard(meses, pagina, controller.signal, filtros)
      .then(resultado => { if (!controller.signal.aborted) setDatos(resultado) })
      .catch(() => { if (!controller.signal.aborted) setError('No se pudieron cargar las cosechas.') })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [meses, pagina, intento, filtros.comunidadId, filtros.responsableId])

  return createPortal(<div className="indicator-detail-backdrop fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6"
    onMouseDown={event => { if (event.target === event.currentTarget) cerrar() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="cosechas-dashboard-titulo"
      className="indicator-detail-enter flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
      <header className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-800">
        <h2 id="cosechas-dashboard-titulo" className="text-lg font-semibold text-gray-900 dark:text-white">Cosechas registradas</h2>
        <button ref={cerrarRef} type="button" onClick={cerrar} aria-label="Cerrar cosechas"
          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"><X size={18}/></button>
      </header>
      <div className="min-h-40 flex-1 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        {cargando && <div className="space-y-3" aria-label="Consultando cosechas">{Array.from({length:4}, (_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"/>)}</div>}
        {!cargando && error && <p role="alert" className="text-sm text-rose-600">{error} <button type="button" onClick={() => setIntento(i => i + 1)} className="underline">Reintentar</button></p>}
        {!cargando && !error && !datos?.registros.length && <p className="rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500 dark:bg-gray-800">Sin cosechas registradas para este período.</p>}
        {!cargando && !error && datos?.registros.map(item => <article key={item.id}
          className="mb-2 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.cultivo}</p>
              <p className="mt-1 text-xs text-gray-500">{item.familia} · {item.comunidad}</p>
              {item.huerto && <p className="mt-1 text-xs text-gray-500">{item.huerto}</p>}
            </div>
            <span className="flex items-center gap-1.5 text-xs text-gray-500"><CalendarDays size={13}/>{fechaGT(item.fecha)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{item.cantidades.map((cantidad, i) => <span key={i}
            className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            {cantidad.cantidad} {cantidad.unidad}</span>)}</div>
        </article>)}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-4 dark:border-gray-800">
        <span className="text-xs text-gray-500">{datos ? `${datos.total.toLocaleString('es-GT')} registros · ${datos.pagina} de ${datos.totalPaginas}` : 'Registros'}</span>
        <div className="flex gap-2">
          <button type="button" aria-label="Página anterior" disabled={cargando || pagina <= 1} onClick={() => setPagina(p => Math.max(1,p-1))}
            className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 dark:border-gray-700"><ChevronLeft size={17}/></button>
          <button type="button" aria-label="Página siguiente" disabled={cargando || !datos || pagina >= datos.totalPaginas} onClick={() => setPagina(p => p+1)}
            className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 dark:border-gray-700"><ChevronRight size={17}/></button>
        </div>
      </footer>
    </section>
  </div>, document.body)
}
