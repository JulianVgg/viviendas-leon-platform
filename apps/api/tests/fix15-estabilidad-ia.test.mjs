import { test } from 'node:test'
import assert from 'node:assert/strict'
import { consultarAnalisisGemini } from '../dist/modules/ai/analysis.gemini.client.js'
import { consultarChatGemini } from '../dist/modules/ai/analysis.chat.client.js'
import { GEMINI_ANALYSIS_SCHEMA, validarResultadoAnalisisIA, diagnosticarResultadoAnalisisIA } from '../dist/modules/ai/analysis.schema.js'
import { reservarCupoAnalisis } from '../dist/modules/ai/analysis.quota.js'

const correcto = {
  resumen: 'Se deben revisar las visitas recientes.', hallazgos: [], riesgos: [], recomendaciones: [], limitaciones: [],
}
const salidaGemini = (obj, estado='STOP') => new Response(JSON.stringify({
  candidates: [{ finishReason: estado, content: { parts: [{ text: JSON.stringify(obj) }] } }],
  usageMetadata: { promptTokenCount: 90, candidatesTokenCount: 60 }, responseId: 'test-15',
}), { status: 200 })

test('Gemini recibe límites explícitos y referencias autorizadas; nunca temperatura', async () => {
  assert.equal(GEMINI_ANALYSIS_SCHEMA.properties.hallazgos.maxItems, 4)
  assert.equal(GEMINI_ANALYSIS_SCHEMA.properties.recomendaciones.items.properties.indicadores.maxItems, 4)
  assert.ok(GEMINI_ANALYSIS_SCHEMA.properties.hallazgos.items.properties.indicadores.items.enum.includes('visitas.realizadas'))
  let cuerpo
  const respuesta = await consultarAnalisisGemini({ familias: { registradas: 25 } }, {
    apiKey: 'secreto-del-test', modelo: 'gemini-3.5-flash-lite',
    fetcher: async (_url, init) => { cuerpo=JSON.parse(init.body); return salidaGemini(correcto) },
  })
  assert.equal(Object.hasOwn(cuerpo.generationConfig, 'temperature'), false)
  assert.equal(cuerpo.generationConfig.responseJsonSchema.properties.riesgos.maxItems, 4)
  assert.deepEqual(respuesta.analisis, correcto)
})

test('Reintenta una respuesta con referencias inventadas, sin aceptarlas ni exponer datos', async () => {
  let veces=0
  const originalWarn = console.warn
  const logs=[]
  console.warn=(...args)=>logs.push(args.join(' '))
  try {
    const recibido = await consultarAnalisisGemini({ datos: 'MARCADOR_PRIVADO' }, {
      apiKey: 'CLAVE_PRIVADA_TEST', modelo: 'gemini-3.5-flash-lite',
      fetcher: async () => {
        veces++
        return salidaGemini(veces===1 ? { ...correcto, hallazgos: [{
          titulo: 'Error', descripcion: 'Referencia inválida', indicadores: ['usuarios.passwordHash'],
        }] } : correcto)
      },
    })
    assert.deepEqual(recibido.analisis, correcto)
    assert.equal(veces, 2)
    assert.ok(logs.some(l=>l.includes('hallazgos_referencias')))
    assert.ok(logs.every(l=>!l.includes('MARCADOR_PRIVADO') && !l.includes('CLAVE_PRIVADA_TEST')))
  } finally { console.warn=originalWarn }
})

test('Dos respuestas inválidas se rechazan; nunca se fabrican cifras ni referencias', async () => {
  let veces=0
  await assert.rejects(consultarAnalisisGemini({}, { apiKey: 'test', modelo: 'gemini-3.5-flash-lite',
    fetcher: async () => { veces++; return salidaGemini({ ...correcto, recomendaciones: Array(5).fill({
      accion: 'Revisar', justificacion: 'Comprobar', indicadores: ['visitas.realizadas'],
    }) }) },
  }), { code: 'AI_INVALID_RESPONSE' })
  assert.equal(veces, 2)
  assert.equal(diagnosticarResultadoAnalisisIA({ ...correcto, riesgos: [{ titulo: 'x', descripcion: 'y',
    indicadores: ['registro.secreto'] }] }), 'riesgos_referencias')
  assert.throws(()=>validarResultadoAnalisisIA({ ...correcto, extra: true }))
})

test('Reintenta HTTP 503 solo una vez; no repite HTTP 429 ni 400', async () => {
  let veces=0
  const ok=await consultarAnalisisGemini({}, {apiKey:'test',modelo:'gemini',fetcher:async()=>{
    veces++; return veces===1?new Response('{}',{status:503}):salidaGemini(correcto)
  }})
  assert.equal(veces,2)
  assert.deepEqual(ok.analisis, correcto)
  for (const [status, code] of [[429,'AI_LIMIT'],[400,'AI_INVALID_REQUEST']]) {
    let llamadas=0
    await assert.rejects(consultarAnalisisGemini({}, {apiKey:'test',modelo:'gemini',fetcher:async()=>{
      llamadas++;return new Response('{}',{status})
    }}),{code})
    assert.equal(llamadas,1)
  }
})

test('Chat también reintenta JSON inválido sin perder el contexto seguro', async () => {
  let llamadas=0
  const valido={respuesta:'Revisar los compromisos registrados.',referencias:['alertas.compromisosPendientes'],limitaciones:[]}
  const result=await consultarChatGemini({alertas:{compromisosPendientes:2}},'¿Qué hacer?',[],{
    apiKey:'test',modelo:'gemini',fetcher:async()=>{
      llamadas++
      return salidaGemini(llamadas===1?{...valido,referencias:['otros.usuarios']} : valido)
    },
  })
  assert.deepEqual(result.chat,valido)
  assert.equal(llamadas,2)
})

function dbFalso(registros, ahora) {
  const tx={
    $queryRaw:async()=>[{adquirido:1}],
    analisisIaSolicitud:{
      count: async ({where})=>registros.filter(r=>{
        if(where.usuarioId!==undefined && r.usuarioId!==where.usuarioId)return false
        if(where.estado?.in && !where.estado.in.includes(r.estado))return false
        const created=r.creadoEn.getTime()
        if(created<where.creadoEn.gte.getTime())return false
        if(where.creadoEn.lt && created>=where.creadoEn.lt.getTime())return false
        return true
      }).length,
      create: async ({data})=>({id:'reservada-nueva',...data}),
    },
  }
  return {$transaction:async(cb)=>cb(tx)}
}

test('Fallidas no gastan el cupo diario, pero las reservas y completadas sí',async()=>{
  const ahora=new Date('2026-11-13T12:00:00Z')
  const ayer=new Date(ahora.getTime()-24*60*60_000)
  const haceHora=new Date(ahora.getTime()-60*60_000)
  const filas=[
    {usuarioId:10,estado:'FALLIDA',creadoEn:haceHora},
    {usuarioId:10,estado:'FALLIDA',creadoEn:haceHora},
    {usuarioId:10,estado:'COMPLETADA',creadoEn:haceHora},
    {usuarioId:10,estado:'FALLIDA',creadoEn:ayer},
  ]
  const db=dbFalso(filas,ahora)
  await reservarCupoAnalisis(10,'modelo',{usuario:2,global:3},db,ahora)
  filas.push({usuarioId:10,estado:'RESERVADA',creadoEn:haceHora})
  await assert.rejects(reservarCupoAnalisis(10,'modelo',{usuario:2,global:3},db,ahora),{code:'AI_DAILY_LIMIT'})
})

test('Ventana antiabuso controla también fallidas sin bloquear todo el día',async()=>{
  const ahora=new Date('2026-11-13T12:00:00Z')
  const filas=Array.from({length:6},()=>({usuarioId:10,estado:'FALLIDA',creadoEn:new Date(ahora.getTime()-60_000)}))
  const db=dbFalso(filas,ahora)
  await assert.rejects(reservarCupoAnalisis(10,'modelo',{usuario:3,global:30},db,ahora),{code:'AI_RATE_LIMIT'})
  // Tras 15 minutos, la cuota diaria de completados sigue disponible.
  await reservarCupoAnalisis(10,'modelo',{usuario:3,global:30},db,new Date(ahora.getTime()+16*60_000))
})
