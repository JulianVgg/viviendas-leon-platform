import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowUp, Bot, LoaderCircle, MessageCircle, ShieldCheck } from 'lucide-react'
import { nombreIndicadorIA } from '@/features/dashboard/lib/aiIndicatorLabels'
import { preguntarAlAsistenteIA, type MensajeHistorialIA, type MesesAnalisis } from '@/features/dashboard/services/aiAnalysisService'

type Intercambio = { pregunta: string; respuesta: string; referencias: string[]; limitaciones: string[] }

/** El historial vive solo en la memoria de esta pantalla; nunca se guarda en PostgreSQL ni localStorage. */
export default function ChatInstitucional({ meses, online }: { meses: MesesAnalisis; online: boolean }) {
  const [pregunta, setPregunta] = useState('')
  const [intercambios, setIntercambios] = useState<Intercambio[]>([])
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const actual = useRef<AbortController | null>(null)
  const final = useRef<HTMLDivElement>(null)
  useEffect(() => () => actual.current?.abort(), [])
  useEffect(() => { final.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [intercambios.length])

  const preguntar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const texto = pregunta.trim()
    if (!online || generando || actual.current || texto.length < 3 || texto.length > 600) return
    const controller = new AbortController()
    actual.current = controller
    setError('')
    setGenerando(true)
    const historial: MensajeHistorialIA[] = intercambios.slice(-4).flatMap(x => [
      { rol: 'usuario', texto: x.pregunta }, { rol: 'asistente', texto: x.respuesta },
    ] as MensajeHistorialIA[])
    try {
      const resultado = await preguntarAlAsistenteIA(meses, texto, historial, controller.signal)
      if (!controller.signal.aborted) {
        setIntercambios(prev => [...prev, { pregunta: texto, respuesta: resultado.resultado.respuesta,
          referencias: resultado.resultado.referencias, limitaciones: resultado.resultado.limitaciones }])
        setPregunta('')
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible responder.')
    } finally {
      if (actual.current === controller) actual.current = null
      if (!controller.signal.aborted) setGenerando(false)
    }
  }

  return <section aria-label="Preguntar al asistente" className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
    <header className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"><MessageCircle size={20}/></span>
        <div><h2 className="font-semibold text-gray-900 dark:text-white">Preguntar al asistente</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Consulta los indicadores y continúa la conversación.</p></div>
      </div>
      {intercambios.length > 0 && <button type="button" onClick={() => { setIntercambios([]); setPregunta(''); setError('') }}
        disabled={generando} className="rounded-lg px-3 py-2 text-xs font-medium text-brand-600 transition hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-gray-800">Nueva conversación</button>}
    </header>

    {intercambios.length > 0 && <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1" role="log" aria-label="Conversación con el asistente" aria-live="polite">
      {intercambios.map((item, index) => <div key={index} className="space-y-3">
        <div className="flex justify-end"><p className="max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-brand-50 px-4 py-3 text-sm text-gray-800 dark:bg-brand-500/10 dark:text-gray-100">{item.pregunta}</p></div>
        <div className="flex items-start gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-brand-600 dark:bg-gray-800"><Bot size={17}/></span>
          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-gray-200">{item.respuesta}</p>
            {item.referencias.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{item.referencias.map(ref => <span key={ref} title={ref} className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">{nombreIndicadorIA(ref)}</span>)}</div>}
            {item.limitaciones.length > 0 && <p className="mt-3 border-t border-gray-200 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">{item.limitaciones.join(' · ')}</p>}
          </div>
        </div>
      </div>)}
      <div ref={final}/>
    </div>}

    {generando && <div role="status" className="flex items-center gap-2 text-sm text-brand-600"><LoaderCircle className="animate-spin" size={16}/> Preparando respuesta…</div>}
    {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"><AlertCircle size={16} className="shrink-0"/>{error}</div>}

    <form onSubmit={event => { void preguntar(event) }} className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 focus-within:border-brand-300 dark:border-gray-700 dark:bg-gray-800/40">
      <label className="min-w-0 flex-1"><span className="sr-only">Escribe tu pregunta</span>
        <textarea value={pregunta} onChange={event => setPregunta(event.target.value)} maxLength={600} rows={2}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }}
          placeholder="Pregunta sobre visitas, familias, cultivos o prioridades…"
          className="min-h-11 w-full resize-none bg-transparent px-2 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100"/>
      </label>
      <button type="submit" disabled={!online || generando || pregunta.trim().length < 3}
        aria-label="Enviar pregunta" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40">
        {generando ? <LoaderCircle size={17} className="animate-spin"/> : <ArrowUp size={19}/>}
      </button>
    </form>
    <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-400 dark:text-gray-500"><ShieldCheck size={14} className="shrink-0"/>
      No ingreses información personal.</p>
  </section>
}
