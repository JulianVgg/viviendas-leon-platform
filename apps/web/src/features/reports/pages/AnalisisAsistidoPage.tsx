import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bot, CheckCircle2, Clock3, Lightbulb, LoaderCircle, MessageSquareText, Plus, Send, ShieldCheck, Sparkles } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import { solicitarAnalisisIA, type MesesAnalisis, type RespuestaAnalisisIA } from '@/features/dashboard/services/aiAnalysisService'
import { nombreIndicadorIA } from '@/features/dashboard/lib/aiIndicatorLabels'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

type Consulta = { id: number; meses: MesesAnalisis; respuesta: RespuestaAnalisisIA }
const periodoTexto = (meses: MesesAnalisis) => `últimos ${meses} meses`
const fechaGt = (fecha: string) => new Intl.DateTimeFormat('es-GT', {
  timeZone: 'America/Guatemala', dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(fecha))

function AnalisisResultado({ datos }: { datos: RespuestaAnalisisIA }) {
  const { resultado, metadata } = datos
  return <article className="space-y-4 rounded-2xl border border-gray-200 bg-white px-5 py-5 text-sm leading-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:px-6">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
      <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><Sparkles size={17} className="text-brand-600"/> Análisis asistido</div>
      <span className="flex items-center gap-1 text-xs text-gray-400"><Clock3 size={13}/>{fechaGt(metadata.generadoEn)}</span>
    </div>
    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-200">{resultado.resumen}</p>
    {resultado.hallazgos.length > 0 && <section><h3 className="mb-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><CheckCircle2 size={17} className="text-green-600"/> Hallazgos</h3>
      <div className="space-y-2">{resultado.hallazgos.map((x, i) => <div key={i} className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/60"><strong className="text-gray-800 dark:text-white">{x.titulo}</strong><p className="mt-1 text-gray-600 dark:text-gray-300">{x.descripcion}</p></div>)}</div>
    </section>}
    {resultado.riesgos.length > 0 && <section><h3 className="mb-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><AlertTriangle size={17} className="text-amber-600"/> Datos por atender</h3>
      <div className="space-y-2">{resultado.riesgos.map((x, i) => <div key={i} className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-500/10"><strong>{x.titulo}</strong><p className="mt-1">{x.descripcion}</p></div>)}</div>
    </section>}
    {resultado.recomendaciones.length > 0 && <section><h3 className="mb-2 flex items-center gap-2 font-semibold text-gray-900 dark:text-white"><Lightbulb size={17} className="text-brand-600"/> Recomendaciones</h3>
      <div className="space-y-2">{resultado.recomendaciones.map((x, i) => <div key={i} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800"><strong>{x.accion}</strong><p className="mt-1 text-gray-600 dark:text-gray-300">{x.justificacion}</p><div className="mt-2 flex flex-wrap gap-1.5">{x.indicadores.map((ind) => <span key={ind} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{nombreIndicadorIA(ind)}</span>)}</div></div>)}</div>
    </section>}
    {resultado.limitaciones.length > 0 && <div className="border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800"><strong>Limitaciones del análisis</strong><ul className="mt-1 list-disc pl-5">{resultado.limitaciones.map((texto,i) => <li key={i}>{texto}</li>)}</ul></div>}
  </article>
}

export default function AnalisisAsistidoPage() {
  const online = useOnlineStatus()
  const [meses, setMeses] = useState<MesesAnalisis>(6)
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)
  const final = useRef<HTMLDivElement>(null)
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => { final.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [consultas.length])

  const generar = async (cantidad: MesesAnalisis = meses) => {
    if (generando || !online || controller.current) return
    setError('')
    setMeses(cantidad)
    const solicitud = new AbortController()
    controller.current = solicitud
    setGenerando(true)
    try {
      // AI-01 admite análisis de indicadores por período; no es un chat de texto libre.
      const respuesta = await solicitarAnalisisIA(cantidad, {}, solicitud.signal)
      if (!solicitud.signal.aborted) setConsultas((prev) => [...prev, { id: Date.now(), meses: cantidad, respuesta }])
    } catch (cause) {
      if (!solicitud.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo generar el análisis.')
    } finally {
      if (controller.current === solicitud) controller.current = null
      if (!solicitud.signal.aborted) setGenerando(false)
    }
  }
  const nueva = () => { if (!generando) { setConsultas([]); setError('') } }

  return <main className="mx-auto w-full max-w-screen-2xl p-2 sm:p-4">
    <PageMeta title="Análisis asistido | ViviendasLeón" description="Análisis bajo demanda de indicadores institucionales"/>
    <div className="grid min-h-[76dvh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 lg:grid-cols-[minmax(0,1fr)_275px]">
      <section className="flex min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><Bot size={22}/></span><div><h1 className="font-semibold text-gray-900 dark:text-white">Análisis asistido</h1><p className="text-xs text-gray-500">Indicadores institucionales</p></div></div>
          <span className="hidden items-center gap-1 text-xs text-gray-500 sm:inline-flex"><ShieldCheck size={14}/> Generación bajo demanda</span>
        </header>
        <div className="flex-1 space-y-6 px-4 py-6 sm:px-8">
          <div className="max-w-xl rounded-2xl bg-brand-50/60 p-5 dark:bg-brand-500/10"><div className="mb-2 flex items-center gap-2 font-semibold text-gray-800 dark:text-white"><Sparkles size={17} className="text-brand-600"/> ¿Qué período deseas analizar?</div><p className="text-sm leading-6 text-gray-600 dark:text-gray-300">Selecciona un intervalo para generar un resumen de la actividad y sus indicadores. Los resultados se calculan con los datos de ViviendasLeón.</p></div>
          {consultas.map((item) => <div key={item.id} className="space-y-4">
            <div className="flex justify-end"><div className="max-w-[90%] rounded-2xl rounded-tr-sm bg-gray-100 px-5 py-3 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-white">Analizar los {periodoTexto(item.meses)}</div></div>
            <AnalisisResultado datos={item.respuesta}/>
          </div>)}
          {generando && <div role="status" className="flex items-center gap-2 py-5 text-sm text-brand-600"><LoaderCircle className="animate-spin" size={18}/> Elaborando análisis…</div>}
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</div>}
          <div ref={final}/>
        </div>
        <footer className="sticky bottom-0 border-t border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900 sm:px-8">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 p-2 dark:border-gray-700">
            <label className="flex-1 text-sm text-gray-700 dark:text-gray-300"><span className="sr-only">Período del análisis</span><select value={meses} onChange={(e) => setMeses(Number(e.target.value) as MesesAnalisis)} className="w-full rounded-lg bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-brand-200"><option value={3}>Últimos 3 meses</option><option value={6}>Últimos 6 meses</option><option value={12}>Últimos 12 meses</option></select></label>
            <button type="button" onClick={() => void generar()} disabled={generando || !online} aria-label="Generar análisis del período seleccionado" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">{generando ? <LoaderCircle size={17} className="animate-spin"/> : <Send size={17}/>} Generar</button>
          </div>
          <p className="mt-2 text-xs text-gray-400">Análisis orientativo; no admite preguntas de texto libre. Verifica los hallazgos antes de tomar decisiones.</p>
        </footer>
      </section>
      <aside className="hidden border-l border-gray-100 bg-gray-50/50 p-5 dark:border-gray-800 dark:bg-gray-800/20 lg:block">
        <button type="button" onClick={nueva} disabled={generando} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"><Plus size={17}/> Nuevo análisis</button>
        <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400"><MessageSquareText size={15}/> Consultas rápidas</div>
        <div className="mt-3 space-y-2">{([3,6,12] as const).map((cantidad) => <button key={cantidad} type="button" onClick={() => void generar(cantidad)} disabled={generando || !online} className="w-full rounded-lg p-3 text-left text-sm text-gray-700 transition-colors hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-700">Resumen de los últimos {cantidad} meses</button>)}</div>
        <div className="mt-8 border-t border-gray-200 pt-5 text-xs leading-6 text-gray-500 dark:border-gray-700">Las consultas son visibles únicamente en esta sesión de pantalla. El análisis no modifica registros agrícolas.</div>
      </aside>
    </div>
  </main>
}
