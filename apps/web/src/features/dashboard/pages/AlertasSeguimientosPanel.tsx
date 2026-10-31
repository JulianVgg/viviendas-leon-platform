import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, ExternalLink, X } from 'lucide-react'
import type { FiltrosDashboard } from '../lib/dashboardFilters'
import { consultarDetalleAlertas, type DetalleAlertas, type RegistroAlerta, type ResumenAlertas,
  type SituacionListaAlertas, type TipoListaAlertas } from '../services/dashboardSummaryService'

const fechaCorta = (valor: string | null) => valor ? valor.split('-').reverse().join('/') : 'Próxima visita'

type Seleccion = { tipo: TipoListaAlertas; situacion: SituacionListaAlertas }

function FilaAlerta({ dato, abrir }: { dato: RegistroAlerta; abrir: (url: string) => void }) {
  return <button type="button" onClick={() => abrir(dato.destino)} className="group flex w-full items-start justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 text-left transition hover:border-brand-200 hover:bg-brand-50/50 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-700">
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{dato.titulo}</span>
      <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{[dato.familia, dato.comunidad, dato.responsable].filter(Boolean).join(' · ')}</span>
      <span className="mt-1.5 block text-xs text-gray-500 dark:text-gray-400">{fechaCorta(dato.fecha)} · {dato.estado === 'VENCIDA' ? 'Vencido' : 'Pendiente'}</span>
    </span>
    <ExternalLink size={16} className="mt-1 shrink-0 text-gray-400 transition group-hover:text-brand-600" aria-hidden="true"/>
  </button>
}

function DetalleAlertasDialog({ seleccion, filtros, cerrar }: { seleccion: Seleccion; filtros: FiltrosDashboard; cerrar: () => void }) {
  const navigate = useNavigate()
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState<DetalleAlertas | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  const botonCerrar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previo = document.body.style.overflow
    const previoFoco = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.style.overflow = 'hidden'
    botonCerrar.current?.focus()
    const teclado = (event: KeyboardEvent) => { if (event.key === 'Escape') cerrar() }
    window.addEventListener('keydown', teclado)
    return () => { document.body.style.overflow = previo; window.removeEventListener('keydown', teclado); previoFoco?.focus({ preventScroll: true }) }
  }, [cerrar])
  useEffect(() => {
    const controller = new AbortController()
    setCargando(true); setError('')
    void consultarDetalleAlertas(seleccion.tipo, seleccion.situacion, pagina, controller.signal, filtros)
      .then(respuesta => { if (!controller.signal.aborted) setDatos(respuesta) })
      .catch(() => { if (!controller.signal.aborted) setError('No se pudieron cargar los registros.') })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [seleccion.tipo, seleccion.situacion, pagina, intento, filtros.comunidadId, filtros.responsableId])
  const abrir = (url: string) => { cerrar(); navigate(url) }
  const titulo = seleccion.tipo === 'visitas' ? 'Visitas vencidas' : seleccion.situacion === 'vencidas' ? 'Compromisos vencidos' : 'Compromisos pendientes'
  return createPortal(<div className="indicator-detail-backdrop fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) cerrar() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="mon06-modal-titulo" className="indicator-detail-enter flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
      <header className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-800">
        <h3 id="mon06-modal-titulo" className="text-lg font-semibold text-gray-900 dark:text-white">{titulo}</h3>
        <button ref={botonCerrar} type="button" onClick={cerrar} aria-label="Cerrar detalle" className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-700"><X size={18}/></button>
      </header>
      <div className="min-h-40 flex-1 space-y-2 overflow-y-auto p-4 sm:p-5" aria-live="polite">
        {cargando && <div className="space-y-3" aria-label="Consultando pendientes">{[0,1,2].map(n => <div key={n} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800"/>)}</div>}
        {!cargando && error && <p role="alert" className="text-sm text-rose-600">{error} <button type="button" className="underline" onClick={() => setIntento(n => n + 1)}>Reintentar</button></p>}
        {!cargando && !error && !datos?.registros.length && <p className="p-7 text-center text-sm text-gray-500">Sin registros pendientes.</p>}
        {!cargando && !error && datos?.registros.map(dato => <FilaAlerta key={dato.id} dato={dato} abrir={abrir}/>)}
      </div>
      <footer className="flex items-center justify-between border-t border-gray-100 p-4 dark:border-gray-800">
        <span className="text-xs text-gray-500">{datos ? `${datos.total} registros · ${datos.pagina} de ${datos.totalPaginas}` : 'Registros'}</span>
        <div className="flex gap-2">
          <button type="button" aria-label="Página anterior" disabled={cargando || pagina === 1} onClick={() => setPagina(n => Math.max(1, n - 1))} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 dark:border-gray-700"><ChevronLeft size={17}/></button>
          <button type="button" aria-label="Página siguiente" disabled={cargando || !datos || pagina >= datos.totalPaginas} onClick={() => setPagina(n => n + 1)} className="rounded-lg border border-gray-200 p-2 disabled:opacity-40 dark:border-gray-700"><ChevronRight size={17}/></button>
        </div>
      </footer>
    </section>
  </div>, document.body)
}

export default function AlertasSeguimientosPanel({ datos, filtros }: { datos: ResumenAlertas; filtros: FiltrosDashboard }) {
  const navigate = useNavigate()
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)
  const abrir = (url: string) => navigate(url)
  const tarjetas = [
    { titulo: 'Visitas vencidas', valor: datos.indicadores.visitasVencidas, icono: CalendarClock,
      seleccion: { tipo: 'visitas', situacion: 'todas' } as Seleccion },
    { titulo: 'Compromisos pendientes', valor: datos.indicadores.compromisosPendientes, icono: ClipboardList,
      seleccion: { tipo: 'compromisos', situacion: 'todas' } as Seleccion },
    { titulo: 'Compromisos vencidos', valor: datos.indicadores.compromisosVencidos, icono: AlertTriangle,
      seleccion: { tipo: 'compromisos', situacion: 'vencidas' } as Seleccion },
  ]
  return <section aria-label="Alertas y seguimientos" className="space-y-4">
    <div className="flex items-center gap-2"><AlertTriangle size={19} className="text-brand-600"/><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Alertas y seguimientos</h2></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {tarjetas.map(({ titulo, valor, icono: Icono, seleccion: opcion }) => <button type="button" key={titulo} onClick={() => setSeleccion(opcion)} className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-theme-xs transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-gray-800 dark:bg-gray-900">
        <span className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300"><Icono size={17}/>{titulo}</span>
        <span className="mt-3 block text-3xl font-semibold tabular-nums text-gray-900 dark:text-white">{valor.toLocaleString('es-GT')}</span>
      </button>)}
    </div>
    {datos.indicadores.visitasVencidas === 0 && datos.indicadores.compromisosPendientes === 0
      ? <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900"><CheckCircle2 className="text-emerald-500" size={20}/>Sin pendientes que requieran atención.</div>
      : <div className="grid gap-4 lg:grid-cols-2">
        {([
          { titulo: 'Visitas vencidas', items: datos.visitas, opcion: { tipo: 'visitas', situacion: 'todas' } as Seleccion },
          { titulo: 'Compromisos pendientes', items: datos.compromisos, opcion: { tipo: 'compromisos', situacion: 'todas' } as Seleccion },
        ]).map(grupo => <div key={grupo.titulo} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-gray-800 dark:text-white">{grupo.titulo}</h3><button type="button" onClick={() => setSeleccion(grupo.opcion)} className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">Ver todos</button></div>
          <div className="space-y-2">{grupo.items.length ? grupo.items.map(item => <FilaAlerta key={item.id} dato={item} abrir={abrir}/>) : <p className="py-4 text-sm text-gray-500">Sin registros.</p>}</div>
        </div>)}
      </div>}
    {seleccion && <DetalleAlertasDialog key={`${seleccion.tipo}-${seleccion.situacion}`} seleccion={seleccion} filtros={filtros} cerrar={() => setSeleccion(null)}/>}
  </section>
}
