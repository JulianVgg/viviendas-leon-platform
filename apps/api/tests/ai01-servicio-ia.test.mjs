import test from 'node:test'
import assert from 'node:assert/strict'
import { ANALYSIS_SCHEMA, validarResultadoAnalisisIA } from '../dist/modules/ai/analysis.schema.js'
import { consultarAnalisisOpenAI } from '../dist/modules/ai/analysis.client.js'
import { reservarCupoAnalisis, diaGuatemala, limiteEntero } from '../dist/modules/ai/analysis.quota.js'
import { generarAnalisisIA } from '../dist/modules/ai/analysis.service.js'

const valido = () => ({
  resumen: 'El período presenta actividad registrada.',
  hallazgos: [{ titulo: 'Cobertura', descripcion: 'Hay familias participantes.', indicadores: ['familias.conPrograma'] }],
  riesgos: [],
  recomendaciones: [{ accion: 'Revisar visitas vencidas', justificacion: 'Existen pendientes.', indicadores: ['alertas.visitasVencidasActuales'] }],
  limitaciones: ['Los datos agregados no demuestran causalidad.'],
})
const respuesta = (objeto = valido()) => ({ id: 'resp_test', status: 'completed',
  output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(objeto) }] }],
  usage: { input_tokens: 120, output_tokens: 200 } })
const simulador = (contenido, status = 200) => async () => new Response(JSON.stringify(contenido), {
  status, headers: { 'Content-Type': 'application/json' },
})

test('AI-01.2 valida estructura estricta y referencias de indicadores', () => {
  assert.equal(ANALYSIS_SCHEMA.additionalProperties, false)
  assert.equal(validarResultadoAnalisisIA(valido()).hallazgos[0].indicadores[0], 'familias.conPrograma')
  assert.throws(() => validarResultadoAnalisisIA({ ...valido(), privado: true }), /formato/i)
  assert.throws(() => validarResultadoAnalisisIA({ ...valido(), hallazgos: [{ titulo: 'X', descripcion: 'X', indicadores: ['usuario.correo'] }] }), /formato/i)
  assert.throws(() => validarResultadoAnalisisIA({ ...valido(), riesgos: Array(5).fill({ titulo: 'X', descripcion: 'X', indicadores: ['visitas.realizadas'] }) }), /formato/i)
})

test('AI-01.2 envía solo contexto, no almacena respuesta y limita tokens', async () => {
  let envio
  const fetcher = async (url, opts) => {
    envio = { url, ...opts }
    return new Response(JSON.stringify(respuesta()), { status: 200 })
  }
  const result = await consultarAnalisisOpenAI({ familias: { registradas: 10 } }, { apiKey: 'clave_test', modelo: 'gpt-5.6-luna', fetcher })
  const body = JSON.parse(envio.body)
  assert.equal(envio.url, 'https://api.openai.com/v1/responses')
  assert.equal(body.store, false)
  assert.equal(body.max_output_tokens, 2400)
  assert.equal(body.text.format.strict, true)
  assert.equal(body.model, 'gpt-5.6-luna')
  assert.ok(!envio.body.includes('clave_test'))
  assert.equal(result.tokens.entrada, 120)
  assert.equal(result.tokens.salida, 200)
  assert.equal(result.analisis.hallazgos[0].indicadores[0], 'familias.conPrograma')
})

test('AI-01.2 rechaza respuestas incompletas, inválidas y rechazos', async () => {
  const args = { apiKey: 'x', modelo: 'gpt-5.6-luna' }
  await assert.rejects(consultarAnalisisOpenAI({}, { ...args, fetcher: simulador({ ...respuesta(), status: 'incomplete' }) }), /completó/i)
  await assert.rejects(consultarAnalisisOpenAI({}, { ...args, fetcher: simulador(respuesta({ ...valido(), privacidad: 'NO' })) }), /verificable/i)
  await assert.rejects(consultarAnalisisOpenAI({}, { ...args, fetcher: simulador({ status: 'completed', output: [{type:'message', content:[{ type:'refusal', refusal:'No' }]}] }) }), /no pudo/i)
  await assert.rejects(consultarAnalisisOpenAI({}, { ...args, fetcher: simulador({ error: 'indisponible' }, 503) }), /generar/i)
  await assert.rejects(consultarAnalisisOpenAI({}, { ...args, fetcher: async () => { throw new Error('network offline') } }), /disponible/i)
})

test('AI-01.2 calcula fecha de Guatemala y límites de configuración', () => {
  assert.equal(diaGuatemala(new Date('2026-11-05T05:30:00Z')).clave, 20261104)
  assert.equal(diaGuatemala(new Date('2026-11-05T06:01:00Z')).clave, 20261105)
  assert.equal(limiteEntero(undefined, 3, 20), 3)
  assert.throws(() => limiteEntero('0', 3, 20), /configuración/i)
  assert.throws(() => limiteEntero('4000', 3, 20), /configuración/i)
})

test('AI-01.2 reserva cupos bajo transacción y bloquea cuando se supera límite', async () => {
  const solicitudes = []
  const tx = {
    $queryRaw: async () => [{ adquirido: 1 }],
    analisisIaSolicitud: {
      count: async ({ where }) => solicitudes.filter(s => !where.usuarioId || s.usuarioId === where.usuarioId).length,
      create: async ({ data }) => { solicitudes.push(data); return { id: 'uuid-prueba' } },
    },
  }
  const db = { $transaction: async fn => fn(tx) }
  const hora = new Date('2026-11-04T18:00:00Z')
  await reservarCupoAnalisis(7, 'gpt-5.6-luna', { usuario: 1, global: 2 }, db, hora)
  await assert.rejects(reservarCupoAnalisis(7, 'gpt-5.6-luna', { usuario: 1, global: 2 }, db, hora), /límite diario/i)
  await reservarCupoAnalisis(8, 'gpt-5.6-luna', { usuario: 1, global: 2 }, db, hora)
  await assert.rejects(reservarCupoAnalisis(9, 'gpt-5.6-luna', { usuario: 1, global: 2 }, db, hora), /límite diario/i)
  assert.equal(solicitudes.length, 2)
})

test('AI-01.2 no llama al proveedor sin clave o sin permiso', async () => {
  const t = { id: 7, roles: ['Técnico agropecuario'], permisos: [] }
  const d = { id: 2, roles: ['Dirección general'], permisos: [] }
  const deps = new Proxy({}, { get() { throw new Error('NO LLAMAR') } })
  await assert.rejects(generarAnalisisIA(t, 3, {}, { env: { OPENAI_API_KEY: 'x' }, deps }), /no autorizado/i)
  await assert.rejects(generarAnalisisIA(d, 3, {}, { env: {}, deps }), /configurado/i)
  await assert.rejects(generarAnalisisIA(d, 4, {}, { env: { OPENAI_API_KEY: 'x' }, deps }), /filtros/i)
})

test('AI-01.2 confirma consumo y solo retorna análisis y metadatos no personales', async () => {
  const usuario = { id: 1, roles: ['Dirección general'], permisos: [], nombre: 'NO EXPORTAR', correo: 'secreto@ejemplo.gt' }
  const llamados = []
  const deps = {
    consolidar: async () => ({ generadoEn: '2026-11-04T15:00:00.000Z', filtros: { meses: 3 }, periodos: { familias: { corte: '2026-11-04' } }, fuentes: ['MON-01'] }),
    reservar: async () => ({ id: 'abc' }),
    consultar: async () => ({ analisis: valido(), tokens: { entrada: 40, salida: 30 }, proveedorId: 'resp_x' }),
    finalizar: async (...args) => llamados.push(args),
  }
  const x = await generarAnalisisIA(usuario, 3, {}, { deps, env: { OPENAI_API_KEY: 'test' } })
  assert.equal(x.resultado.resumen, valido().resumen)
  assert.equal(llamados[0][1], 'COMPLETADA')
  assert.equal(llamados[0][2].tokensEntrada, 40)
  assert.ok(!JSON.stringify(x).includes('secreto@ejemplo.gt'))
})

test('AI-01.2 registra fallo y no lo disfraza como éxito', async () => {
  const estados = []
  const deps = {
    consolidar: async () => ({ generadoEn: '2026-11-04T15:00:00.000Z', filtros: {}, periodos: {}, fuentes: [] }),
    reservar: async () => ({ id: 'abc' }),
    consultar: async () => { throw new Error('error externo') },
    finalizar: async (_id, estado) => { estados.push(estado) },
  }
  await assert.rejects(generarAnalisisIA({ id: 1, roles: ['Dirección general'] }, 3, {}, {
    deps, env: { OPENAI_API_KEY: 'test' },
  }), /completar el análisis/i)
  assert.deepEqual(estados, ['FALLIDA'])
})
