import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertCircle, ArrowUp, Bot, LoaderCircle, MessageCircle, ShieldCheck, Plus, Trash2 } from 'lucide-react'
import { nombreIndicadorIA } from '@/features/dashboard/lib/aiIndicatorLabels'
import { preguntarAlAsistenteIA, listarConversacionesIA, leerConversacionIA, eliminarConversacionIA, catalogoAsistenteIA, ejecutarAccionIA, type AccionIA, type CatalogoIA, type ConversacionIA, type IntercambioIA, type CuotaIA, type MesesAnalisis } from '@/features/dashboard/services/aiAnalysisService'

type Propuesta = { accion: AccionIA; operacionId: string }
const buttonClass='rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
const nombreFamilia=(c:CatalogoIA|null,id:number)=>c?.familias.find(x=>x.id===id)?.nombreReferencia ?? `Familia #${id}`
const nombreTecnico=(c:CatalogoIA|null,id:number)=>c?.tecnicos.find(x=>x.id===id)?.nombre ?? c?.participantes.find(x=>x.id===id)?.nombre ?? `Usuario #${id}`
function detalleAccion(a:AccionIA,c:CatalogoIA|null):string[] {
  switch(a.tipo){
    case 'agendar_visita':return ['Programar visita técnica',`Familia: ${nombreFamilia(c,a.familiaId)} (#${a.familiaId})`,`Técnico: ${nombreTecnico(c,a.responsableId)} (#${a.responsableId})`,`Fecha: ${a.fecha} · ${a.turno==='MANANA'?'Mañana':'Tarde'}`,'La programación aplica el ciclo semanal existente.']
    case 'reprogramar_visita':{const v=c?.visitas.find(x=>x.id===a.visitaId);return ['Reprogramar visita',`Visita #${a.visitaId}${v?` · ${nombreFamilia(c,v.familiaId)} · ${v.fecha.slice(0,10)}`:''}`,`Nueva fecha: ${a.fecha}`,`Motivo: ${a.motivo}`]}
    case 'crear_evento':return ['Crear actividad institucional',a.titulo,`${a.fecha} · ${a.inicio} – ${a.fin}`,`Participantes: ${a.participantesIds.map(id=>nombreTecnico(c,id)).join(', ')||'Ninguno'}`]
    case 'actualizar_compromiso':return ['Actualizar compromiso',c?.compromisos.find(x=>x.id===a.compromisoId)?.texto ?? a.compromisoId,`Estado: ${a.estado==='CUMPLIDO'?'Cumplido':'No cumplido'}`]
    case 'reporte_semestral':return ['Descargar reporte semestral Excel',`Año ${a.anio} · Semestre ${a.semestre}`]
  }
}
export default function ChatInstitucional({ meses, online, cuota, alConsultar, preguntaRapida }: { meses: MesesAnalisis; online: boolean; cuota: CuotaIA | null; alConsultar: () => void; preguntaRapida?: { texto:string; clave:number; nueva?:boolean } }) {
  const [pregunta,setPregunta]=useState('')
  const [intercambios,setIntercambios]=useState<IntercambioIA[]>([])
  const [conversaciones,setConversaciones]=useState<Omit<ConversacionIA,'intercambios'>[]>([])
  const [id,setId]=useState<string|null>(null)
  const [catalogo,setCatalogo]=useState<CatalogoIA|null>(null)
  const [cargando,setCargando]=useState(true)
  const [generando,setGenerando]=useState(false)
  const [ejecutando,setEjecutando]=useState(false)
  const [propuesta,setPropuesta]=useState<Propuesta|null>(null)
  const [resultadoAccion,setResultadoAccion]=useState('')
  const [error,setError]=useState('')
  const actual=useRef<AbortController|null>(null)
  const accionEnCurso=useRef(false)
  const final=useRef<HTMLDivElement>(null)
  const inicializado=useRef(false)
  const ultimaRapida=useRef<number|undefined>(undefined)
  useEffect(()=>()=>actual.current?.abort(),[])
  useEffect(()=>{if(intercambios.length)final.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[intercambios.length])
  useEffect(()=>{
    if(!online){setCargando(false);return}
    const ctrl=new AbortController()
    if(!inicializado.current){
      setCargando(true)
      void listarConversacionesIA(ctrl.signal).then(async lista=>{
        if(ctrl.signal.aborted)return
        setConversaciones(lista)
        if(lista.length){const c=await leerConversacionIA(lista[0].id,ctrl.signal);if(!ctrl.signal.aborted){setId(c.id);setIntercambios(c.intercambios)}}
        if(!ctrl.signal.aborted)inicializado.current=true
      }).catch(e=>{if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:'No se pudo abrir el historial.')}).finally(()=>{if(!ctrl.signal.aborted)setCargando(false)})
    }
    void catalogoAsistenteIA(ctrl.signal).then(c=>{if(!ctrl.signal.aborted)setCatalogo(c)}).catch(()=>{})
    return ()=>ctrl.abort()
  },[online])
  const ocupado=cargando||generando||ejecutando
  const abrir=async(next:string)=>{
    if(ocupado||!online)return
    setCargando(true);setError('');setPropuesta(null);setResultadoAccion('')
    try{const c=await leerConversacionIA(next);setId(c.id);setIntercambios(c.intercambios);setPregunta('')}
    catch(e){setError(e instanceof Error?e.message:'No se pudo abrir la conversación.')}finally{setCargando(false)}
  }
  const nueva=()=>{if(!ocupado){setId(null);setIntercambios([]);setPregunta('');setError('');setPropuesta(null);setResultadoAccion('')}}
  const eliminar=async()=>{
    if(!id||ocupado||!online||!window.confirm('¿Eliminar esta conversación de forma permanente?'))return
    setCargando(true);setError('')
    try{await eliminarConversacionIA(id);setConversaciones(prev=>prev.filter(c=>c.id!==id));setId(null);setIntercambios([]);setPregunta('');setPropuesta(null);setResultadoAccion('')}
    catch(e){setError(e instanceof Error?e.message:'No se pudo eliminar la conversación.')}finally{setCargando(false)}
  }
  const enviar=async(texto:string)=>{
    texto=texto.trim()
    if(!online||cuota?.disponibles===0||ocupado||actual.current||texto.length<3||texto.length>4000)return
    const controller=new AbortController();actual.current=controller
    setError('');setGenerando(true);setPropuesta(null);setResultadoAccion('')
    try{
      const r=await preguntarAlAsistenteIA(meses,texto,id,controller.signal)
      if(!controller.signal.aborted){
        setId(r.conversacionId);setIntercambios(r.intercambios);setPregunta('')
        if(r.accion)setPropuesta({accion:r.accion,operacionId:crypto.randomUUID()})
        void listarConversacionesIA(controller.signal).then(lista=>{if(!controller.signal.aborted)setConversaciones(lista)}).catch(()=>{})
      }
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'No fue posible responder.')}
    finally{if(actual.current===controller)actual.current=null;if(!controller.signal.aborted){setGenerando(false);alConsultar()}}
  }
  useEffect(()=>{
    if(preguntaRapida&&preguntaRapida.clave!==ultimaRapida.current&&!ocupado){
      ultimaRapida.current=preguntaRapida.clave
      if(preguntaRapida.nueva){nueva();return}
      setPregunta(preguntaRapida.texto)
      if(online&&cuota?.disponibles!==0)void enviar(preguntaRapida.texto)
    }
  },[preguntaRapida,ocupado,online,cuota?.disponibles])
  const confirmar=async()=>{
    if(!propuesta||ocupado||!online||accionEnCurso.current)return
    accionEnCurso.current=true;setEjecutando(true);setError('')
    try{const mensaje=await ejecutarAccionIA(propuesta.accion,propuesta.operacionId);setResultadoAccion(mensaje);setPropuesta(null);void catalogoAsistenteIA().then(setCatalogo).catch(()=>{})}
    catch(e){setError(e instanceof Error?e.message:'No se pudo completar la acción.')}
    finally{accionEnCurso.current=false;setEjecutando(false)}
  }
  const insertar=(value:string)=>{if(value)setPregunta(p=>`${p}${p?' ':''}${value} `.slice(0,4000))}
  const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();void enviar(pregunta)}
  return <section aria-label="Preguntar al asistente" className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><MessageCircle size={20}/></span><h2 className="font-semibold text-gray-900 dark:text-white">Conversación</h2></div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Historial de conversaciones" value={id??''} disabled={ocupado||!online} onChange={e=>{if(e.target.value)void abrir(e.target.value);else nueva()}} className={`${buttonClass} max-w-[220px] bg-white dark:bg-gray-900`}><option value="">Nueva conversación</option>{conversaciones.map(c=><option key={c.id} value={c.id}>{c.titulo}</option>)}</select>
        <button type="button" className={buttonClass} disabled={ocupado} onClick={nueva} aria-label="Nueva conversación"><Plus size={16}/></button>
        <button type="button" className={buttonClass} disabled={!id||ocupado||!online} onClick={()=>void eliminar()} aria-label="Eliminar conversación"><Trash2 size={16}/></button>
      </div>
    </header>
    {cargando&&<p className="text-xs text-gray-500">Cargando conversación…</p>}
    {intercambios.length>0&&<div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1" role="log" aria-label="Conversación con el asistente" aria-live="polite">
      {intercambios.map((item,index)=><div key={index} className="space-y-3">
        <div className="flex justify-end"><p className="max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-brand-50 px-4 py-3 text-sm text-gray-800 dark:bg-brand-500/10 dark:text-gray-100">{item.pregunta}</p></div>
        <div className="flex items-start gap-2.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-brand-600 dark:bg-gray-800"><Bot size={17}/></span><div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-gray-50 px-4 py-3 dark:bg-gray-800/60">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700 dark:text-gray-200">{item.respuesta}</p>
          {item.referencias.length>0&&<div className="mt-3 flex flex-wrap gap-1.5">{item.referencias.map(ref=><span key={ref} className="rounded-full border border-gray-200 px-2 py-1 text-[11px] text-gray-600 dark:border-gray-700 dark:text-gray-300">{nombreIndicadorIA(ref)}</span>)}</div>}
          {item.limitaciones.length>0&&<p className="mt-3 border-t border-gray-200 pt-2 text-xs text-gray-500 dark:border-gray-700">{item.limitaciones.join(' · ')}</p>}
        </div></div>
      </div>)}<div ref={final}/>
    </div>}
    {propuesta&&<div className="rounded-xl border border-brand-200 p-4 dark:border-gray-700"><h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{detalleAccion(propuesta.accion,catalogo)[0]}</h3>{detalleAccion(propuesta.accion,catalogo).slice(1).map((line,i)=><p key={i} className="break-words text-sm text-gray-600 dark:text-gray-300">{line}</p>)}<div className="mt-3 flex gap-2"><button type="button" disabled={ejecutando} className={buttonClass} onClick={()=>setPropuesta(null)}>Cancelar</button><button type="button" disabled={ocupado||!online} onClick={()=>void confirmar()} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{ejecutando?'Procesando…':'Confirmar'}</button></div></div>}
    {resultadoAccion&&<p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300">{resultadoAccion}</p>}
    {generando&&<div role="status" className="flex items-center gap-2 text-sm text-brand-600"><LoaderCircle className="animate-spin" size={16}/> Preparando respuesta…</div>}
    {error&&<div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"><AlertCircle size={16} className="shrink-0"/>{error}</div>}
    {cuota?.disponibles===0&&<p className="text-sm text-amber-700 dark:text-amber-300">Has alcanzado el cupo de hoy.</p>}
    {catalogo&&<div className="flex flex-wrap gap-2"><select aria-label="Insertar familia" value="" onChange={e=>insertar(e.target.value)} disabled={ocupado} className={`${buttonClass} max-w-[230px] bg-white dark:bg-gray-900`}><option value="">+ Familia</option>{catalogo.familias.map(f=><option key={f.id} value={`familia #${f.id}`}>{f.nombreReferencia}</option>)}</select><select aria-label="Insertar técnico" value="" onChange={e=>insertar(e.target.value)} disabled={ocupado} className={`${buttonClass} max-w-[200px] bg-white dark:bg-gray-900`}><option value="">+ Técnico</option>{catalogo.tecnicos.map(t=><option key={t.id} value={`técnico #${t.id}`}>{t.nombre}</option>)}</select><select aria-label="Insertar visita" value="" onChange={e=>insertar(e.target.value)} disabled={ocupado} className={`${buttonClass} max-w-[230px] bg-white dark:bg-gray-900`}><option value="">+ Visita</option>{catalogo.visitas.map(v=><option key={v.id} value={`visita #${v.id}`}>{nombreFamilia(catalogo,v.familiaId)} · {v.fecha.slice(0,10)} · #{v.id}</option>)}</select><select aria-label="Insertar compromiso" value="" onChange={e=>insertar(e.target.value)} disabled={ocupado} className={`${buttonClass} max-w-[230px] bg-white dark:bg-gray-900`}><option value="">+ Compromiso</option>{catalogo.compromisos.map(c=><option key={c.id} value={`compromiso ${c.id}`}>{c.texto.slice(0,60)} · {nombreFamilia(catalogo,c.visitaOrigen.familiaId)}</option>)}</select><select aria-label="Insertar huerto" value="" onChange={e=>insertar(e.target.value)} disabled={ocupado} className={`${buttonClass} max-w-[230px] bg-white dark:bg-gray-900`}><option value="">+ Huerto</option>{catalogo.huertos.map(h=><option key={h.id} value={`huerto #${h.id}`}>{h.nombre??`Huerto #${h.id}`} · {nombreFamilia(catalogo,h.familiaId)}</option>)}</select><select aria-label="Insertar participante" value="" onChange={e=>insertar(e.target.value)} disabled={ocupado} className={`${buttonClass} max-w-[200px] bg-white dark:bg-gray-900`}><option value="">+ Participante</option>{catalogo.participantes.map(t=><option key={t.id} value={`participante #${t.id}`}>{t.nombre}</option>)}</select></div>}
    <form onSubmit={submit} className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/40"><label className="min-w-0 flex-1"><span className="sr-only">Escribe tu pregunta</span><textarea value={pregunta} onChange={e=>setPregunta(e.target.value)} maxLength={4000} rows={3} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit()}}} placeholder="Pregúntame lo que necesites…" className="min-h-11 w-full resize-y bg-transparent px-2 py-2 text-sm text-gray-800 outline-none dark:text-gray-100"/></label><button type="submit" disabled={!online||cuota?.disponibles===0||ocupado||pregunta.trim().length<3} aria-label="Enviar pregunta" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white disabled:opacity-40">{generando?<LoaderCircle size={17} className="animate-spin"/>:<ArrowUp size={19}/>}</button></form>
    <p className="flex items-start gap-1.5 text-[11px] text-gray-400"><ShieldCheck size={14}/> No ingreses información personal. Las consultas se envían al proveedor de IA y el historial se guarda en tu cuenta.</p>
  </section>
}
