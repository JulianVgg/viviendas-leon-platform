import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarAccionIA } from '../dist/modules/ai/assistant.actions.js'
import { contextoConversacion } from '../dist/modules/ai/assistant.history.js'
import { validarPreguntaChat, validarHistorialChat, validarRespuestaChat } from '../dist/modules/ai/analysis.chat.rules.js'
import { consultarChatGemini } from '../dist/modules/ai/analysis.chat.client.js'
import { responderChatInstitucional } from '../dist/modules/ai/analysis.chat.service.js'
const actor={id:1,roles:['Dirección general'],permisos:[]}
const contexto={hoyGuatemala:'2026-11-26',familias:[{id:10,estado:'ACTIVA'},{id:11,estado:'INACTIVA'}],tecnicos:[{id:2}],participantes:[{id:2},{id:3}],visitas:[{id:50}],compromisos:[{id:'propio',editable:true},{id:'ajeno',editable:false}]}
const propuesta={tipo:'agendar_visita',familiaId:10,responsableId:2,fecha:'2026-11-27',turno:'MANANA'}
const validar=(v,u=actor)=>validarAccionIA(JSON.stringify(v),contexto,u)
test('Solo se aceptan acciones, identificadores, fechas y roles válidos',()=>{
  assert.deepEqual(validar(propuesta),propuesta)
  for(const valor of [{...propuesta,fecha:'2026-11-25'},{...propuesta,fecha:'2026-02-30'},{...propuesta,familiaId:11},{...propuesta,responsableId:999},{...propuesta,url:'https://example.org'},{tipo:'sql',consulta:'SELECT * FROM usuario'},{tipo:'borrar_familia',familiaId:10}])assert.equal(validar(valor),null)
  assert.equal(validar(propuesta,{id:2,roles:['Contador'],permisos:[]}),null)
  assert.equal(validar(propuesta,{id:2,roles:['Técnico agropecuario'],permisos:['VISITAS_WRITE']}),null)
})
test('Eventos, reportes, reprogramaciones y compromisos respetan catálogo y permisos',()=>{
  for(const a of [{tipo:'reprogramar_visita',visitaId:50,fecha:'2026-11-28',motivo:'Cambio de agenda'},{tipo:'reporte_semestral',anio:2026,semestre:2},{tipo:'actualizar_compromiso',compromisoId:'propio',estado:'CUMPLIDO'},{tipo:'crear_evento',titulo:'Reunión',fecha:'2026-11-27',inicio:'10:00',fin:'11:00',participantesIds:[2,3]}])assert.deepEqual(validar(a),a)
  assert.equal(validar({tipo:'actualizar_compromiso',compromisoId:'ajeno',estado:'CUMPLIDO'}),null)
  assert.equal(validar({tipo:'reporte_semestral',anio:2026,semestre:2},{id:2,roles:['Coordinación'],permisos:[]}),null)
  assert.equal(validar({tipo:'crear_evento',titulo:'Reunión',fecha:'2026-11-27',inicio:'12:00',fin:'11:00',participantesIds:[2]}),null)
})
test('Mantiene hasta 20 intercambios recientes completos y controla el tamaño',()=>{
  const base={referencias:[],limitaciones:[]}
  const lista=Array.from({length:25},(_,i)=>({...base,pregunta:`Pregunta ${i}`,respuesta:`Respuesta ${i}`}))
  const historia=contextoConversacion(lista)
  assert.equal(historia.length,40);assert.equal(historia[0].texto,'Pregunta 5');assert.equal(historia.at(-1).texto,'Respuesta 24')
  assert.deepEqual(validarHistorialChat(historia),historia)
  const larga=contextoConversacion(Array.from({length:20},()=>({...base,pregunta:'p'.repeat(4000),respuesta:'r'.repeat(8000)})))
  assert.equal(larga.length,20);assert.doesNotThrow(()=>validarHistorialChat(larga))
  assert.equal(validarPreguntaChat('p'.repeat(4000)).length,4000)
  assert.equal(validarRespuestaChat({respuesta:'r'.repeat(8000),referencias:[],limitaciones:[],accion:''}).respuesta.length,8000)
})
test('Gemini entrega propuesta estructurada y descarta partes de pensamiento',async()=>{
  const salida={respuesta:'Puedo preparar la visita.',referencias:[],limitaciones:[],accion:JSON.stringify(propuesta)}
  let body
  const r=await consultarChatGemini(contexto,'Agenda visita 10',[],{modelo:'gemini-3.5-flash-lite',apiKey:'ficticia',fetcher:async(_url,opts)=>{
    body=JSON.parse(opts.body)
    return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'no mostrar'},{text:JSON.stringify(salida)}]}}]}),{status:200})
  }})
  assert.equal(body.generationConfig.maxOutputTokens,8192);assert.ok(body.generationConfig.responseJsonSchema.required.includes('accion'))
  assert.deepEqual(validarAccionIA(r.chat.accion,contexto,actor),propuesta)
})
test('Los límites predeterminados son 20/60 y se conservan las variables Railway',async()=>{
  let limites
  const deps={consolidar:async()=>({generadoEn:'2026-11-26',periodos:{},filtros:{},fuentes:[]}),reservar:async(_u,_m,l)=>{limites=l;return{id:'x'}},finalizar:async()=>{},consultarGemini:async()=>({chat:{respuesta:'Respuesta válida',referencias:[],limitaciones:[]},tokens:{entrada:0,salida:0},proveedorId:null}),consultarOpenAI:async()=>{throw Error('No debe usarse')}}
  const env={AI_PROVIDER:'gemini',GEMINI_API_KEY:'ficticia'}
  await responderChatInstitucional(actor,6,'Consulta válida',[],{}, {deps,env});assert.deepEqual(limites,{usuario:20,global:60})
  await responderChatInstitucional(actor,6,'Consulta válida',[],{}, {deps,env:{...env,AI_DAILY_USER_LIMIT:'25',AI_DAILY_GLOBAL_LIMIT:'80'}});assert.deepEqual(limites,{usuario:25,global:80})
})
