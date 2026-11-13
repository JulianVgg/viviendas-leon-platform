import { useEffect, useRef, useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Clock3, Lightbulb, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react'
import type { FiltrosDashboard } from '../lib/dashboardFilters'
import { nombreIndicadorIA } from '../lib/aiIndicatorLabels'
import {
  solicitarAnalisisIA, type ElementoAnalisisIA, type RecomendacionIA,
  type RespuestaAnalisisIA, type MesesAnalisis, type ErrorAnalisisIA,
} from '../services/aiAnalysisService'

const card = 'rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'

type Estado = 'inicial' | 'generando' | 'listo' | 'error'

function Referencias({ indicadores }: { indicadores: string[] }) {
  return <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Indicadores de referencia">
    {indicadores.map(indicador => <span key={indicador} title={indicador} className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300">
      {nombreIndicadorIA(indicador)}
    </span>)}
  </div>
}

function Hallazgo({ dato, tipo }: { dato: ElementoAnalisisIA; tipo: 'hallazgo' | 'riesgo' }) {
  const Icono = tipo === 'riesgo' ? AlertTriangle : CheckCircle2
  return <article className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40">
    <div className="flex items-start gap-2.5">
      <Icono aria-hidden="true" size={17} className={`mt-0.5 shrink-0 ${tipo === 'riesgo' ? 'text-amber-600' : 'text-brand-600'}`} />
      <div className="min-w-0"><h4 className="text-sm font-semibold text-gray-900 dark:text-white">{dato.titulo}</h4><p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300">{dato.descripcion}</p></div>
    </div>
    <Referencias indicadores={dato.indicadores} />
  </article>
}

function Recomendacion({ dato }: { dato: RecomendacionIA }) {
  return <article className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-gray-800/40">
    <div className="flex items-start gap-2.5"><Lightbulb aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-brand-600"/><div className="min-w-0">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{dato.accion}</h4>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300">{dato.justificacion}</p>
    </div></div>
    <Referencias indicadores={dato.indicadores}/>
  </article>
}

function fechaGeneracion(fecha: string): string {
  const date = new Date(fecha)
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString('es-GT', {
    timeZone: 'America/Guatemala', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AnalisisAsistidoPanel({ meses, filtros }: { meses: MesesAnalisis; filtros: FiltrosDashboard }) {
  const [estado, setEstado] = useState<Estado>('inicial')
  const [datos, setDatos] = useState<RespuestaAnalisisIA | null>(null)
  const [error, setError] = useState('')
  const [codigoError, setCodigoError] = useState('')
  const solicitudActual = useRef<AbortController | null>(null)

  // Evitar resultados obsoletos y solicitudes activas al salir del Dashboard.
  useEffect(() => () => { solicitudActual.current?.abort() }, [])

  const generar = async () => {
    if (solicitudActual.current) return
    const controller = new AbortController()
    solicitudActual.current = controller
    setEstado('generando'); setError(''); setCodigoError('')
    try {
      const resultado = await solicitarAnalisisIA(meses, filtros, controller.signal)
      if (controller.signal.aborted) return
      setDatos(resultado); setEstado('listo')
    } catch (fallo: unknown) {
      if (controller.signal.aborted) return
      const errorIA = fallo as Partial<ErrorAnalisisIA>
      setCodigoError(typeof errorIA.codigo === 'string' ? errorIA.codigo : 'AI_UNAVAILABLE')
      setError(fallo instanceof Error && fallo.message ? fallo.message : 'No fue posible generar el análisis.')
      setEstado('error')
    } finally {
      if (solicitudActual.current === controller) solicitudActual.current = null
    }
  }

  return <section aria-label="Análisis asistido" className={`${card} overflow-hidden`}>
    <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><Sparkles size={21} aria-hidden="true"/></span>
        <div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Análisis asistido</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Resumen y recomendaciones a partir de los indicadores.</p></div>
      </div>
      <button type="button" onClick={() => { void generar() }} disabled={estado === 'generando'}
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60">
        {estado === 'generando' ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true"/> : datos ? <RefreshCw size={17} aria-hidden="true"/> : <Sparkles size={17} aria-hidden="true"/>}
        {estado === 'generando' ? 'Generando...' : datos ? 'Generar nuevamente' : 'Generar análisis'}
      </button>
    </div>

    {estado === 'inicial' && <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800"><Sparkles size={26} className="text-brand-500" aria-hidden="true"/></span>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Tu análisis institucional</h3>
      <p className="max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400">Se utilizarán el período y los filtros seleccionados en el Dashboard.</p>
    </div>}

    {estado === 'generando' && <div className="space-y-4 px-5 py-8 sm:px-6" role="status" aria-live="polite" aria-label="Generando análisis asistido">
      <div className="flex items-center gap-2 text-sm font-medium text-brand-600"><LoaderCircle size={18} className="animate-spin" aria-hidden="true"/>Generando análisis...</div>
      <div className="h-4 w-3/4 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800"/>
      <div className="h-4 w-full animate-pulse rounded-full bg-gray-100 dark:bg-gray-800"/>
      <div className="h-4 w-2/3 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800"/>
    </div>}

    {estado === 'error' && <div role="alert" className="px-5 py-6 sm:px-6">
      <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-200">
        <AlertCircle size={19} className="mt-0.5 shrink-0" aria-hidden="true"/>
        <div><h3 className="text-sm font-semibold">{codigoError === 'AI_NOT_CONFIGURED' ? 'Servicio pendiente de configuración' : 'Análisis no disponible'}</h3>
          <p className="mt-1 text-sm leading-relaxed">{error}</p></div>
      </div>
    </div>}

    {estado === 'listo' && datos && <div className="analysis-result-enter space-y-5 px-5 py-6 sm:px-6" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true"/> {fechaGeneracion(datos.metadata.generadoEn)}</span>
        <span>{meses} meses{filtros.comunidadId ? ' · Comunidad filtrada' : ''}{filtros.responsableId ? ' · Responsable filtrado' : ''}</span>
      </div>
      <div className="rounded-xl border border-brand-100 bg-brand-50/70 p-5 dark:border-brand-500/20 dark:bg-brand-500/5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Resumen ejecutivo</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-200">{datos.resultado.resumen}</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><CheckCircle2 size={17} className="text-brand-600"/> Hallazgos</h3>
          {datos.resultado.hallazgos.length ? datos.resultado.hallazgos.map((dato, i) => <Hallazgo key={i} dato={dato} tipo="hallazgo"/>) : <p className="text-sm text-gray-500">Sin hallazgos destacados.</p>}
        </div>
        <div className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><AlertTriangle size={17} className="text-amber-600"/> Riesgos</h3>
          {datos.resultado.riesgos.length ? datos.resultado.riesgos.map((dato, i) => <Hallazgo key={i} dato={dato} tipo="riesgo"/>) : <p className="text-sm text-gray-500">Sin riesgos destacados.</p>}
        </div>
      </div>
      <div className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Lightbulb size={17} className="text-brand-600"/> Recomendaciones</h3>
        <div className="grid gap-3 md:grid-cols-2">{datos.resultado.recomendaciones.length ? datos.resultado.recomendaciones.map((dato, i) => <Recomendacion key={i} dato={dato}/>) : <p className="text-sm text-gray-500">Sin recomendaciones para este período.</p>}</div>
      </div>
      {datos.resultado.limitaciones.length > 0 && <div className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Limitaciones</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{datos.resultado.limitaciones.map((texto, i) => <li key={i}>{texto}</li>)}</ul>
      </div>}
      <p className="text-xs text-gray-400 dark:text-gray-500">Análisis orientativo. Contrasta los hallazgos con los indicadores institucionales.</p>
    </div>}
  </section>
}
