import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import { generarAnalisisIA } from './analysis.service.js'
import { AnalysisError } from './analysis.errors.js'
import { esEnfoqueAnalisis } from './analysis.focus.js'
import { responderChatInstitucional } from './analysis.chat.service.js'
import { diaGuatemala, limiteEntero } from './analysis.quota.js'
import { contextoOperativo } from './assistant.context.js'
import { validarAccionIA } from './assistant.actions.js'
import { listarConversaciones, leerConversacion, eliminarConversacion, contextoConversacion, guardarIntercambio } from './assistant.history.js'
import { validarPreguntaChat } from './analysis.chat.rules.js'
import { getPrismaClient } from '../../config/prisma.js'

export const analysisRouter = Router()
analysisRouter.use(requireAuth)

/** Cuota compartida del chat y análisis. Consultarla no gasta solicitudes. */
analysisRouter.get('/cuota', async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store')
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sesión inválida.' } }); return }
    if (!puedeEditarPerfilCompleto(usuario.roles)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No autorizado.' } }); return
    }
    const limiteUsuario = limiteEntero(process.env.AI_DAILY_USER_LIMIT, 20, 200)
    const limiteGlobal = limiteEntero(process.env.AI_DAILY_GLOBAL_LIMIT, 60, 2000)
    const dia = diaGuatemala(new Date())
    const where = { creadoEn: { gte: dia.desde, lt: dia.hasta }, estado: { in: ['RESERVADA', 'COMPLETADA'] as ('RESERVADA' | 'COMPLETADA')[] } }
    const db = getPrismaClient()
    const [utilizadas, globales] = await Promise.all([
      db.analisisIaSolicitud.count({ where: { ...where, usuarioId: usuario.id } }),
      db.analisisIaSolicitud.count({ where }),
    ])
    res.json({ limite: limiteUsuario, utilizadas, disponibles: Math.max(0,
      Math.min(limiteUsuario - utilizadas, limiteGlobal - globales)), reinicio: dia.hasta.toISOString() })
  } catch (error) {
    if (error instanceof AnalysisError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } }); return
    }
    console.error('[IA/Cuota] Error consultando disponibilidad.')
    res.status(503).json({ error: { code: 'AI_UNAVAILABLE', message: 'No fue posible consultar la cuota.' } })
  }
})

/** AI-01.2: se expone solo al backend autenticado. AI-01.3 consumirá esta ruta. */
analysisRouter.post('/', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, private')
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sesión inválida.' } }); return }
    if (!puedeEditarPerfilCompleto(usuario.roles)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No autorizado.' } }); return
    }
    const body: unknown = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Solicitud inválida.' } }); return
    }
    const datos = body as Record<string, unknown>
    if (Object.keys(datos).some(k => !['meses', 'comunidadId', 'responsableId', 'enfoque'].includes(k)) ||
        typeof datos.meses !== 'number') {
      res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Filtros inválidos.' } }); return
    }
    const opcionId = (valor: unknown) => {
      if (valor === undefined) return undefined
      if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 1 || valor > 999_999_999) {
        throw new AnalysisError('INVALID_FILTERS', 400, 'Filtro inválido.')
      }
      return valor
    }
    if (datos.enfoque !== undefined && !esEnfoqueAnalisis(datos.enfoque)) {
      res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Consulta no válida.' } }); return
    }
    const filtros = { comunidadId: opcionId(datos.comunidadId), responsableId: opcionId(datos.responsableId) }
    const datosAnalisis = await generarAnalisisIA(usuario, datos.meses, filtros, { enfoque: datos.enfoque ?? 'resumen' })
    res.status(200).json(datosAnalisis)
  } catch (error) {
    if (error instanceof AnalysisError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } })
      return
    }
    console.error('[AI-01.2] Error interno al generar el análisis.')
    res.status(503).json({ error: { code: 'AI_UNAVAILABLE', message: 'No fue posible generar el análisis.' } })
  }
})


async function usuarioAsistente(req: import('express').Request) {
  const usuario = await getAuthenticatedUser(req.session.userId!)
  if (!usuario) throw new AnalysisError('UNAUTHORIZED',401,'Sesión inválida.')
  if (!puedeEditarPerfilCompleto(usuario.roles)) throw new AnalysisError('FORBIDDEN',403,'No autorizado.')
  return usuario
}
function errorAsistente(res: import('express').Response, error: unknown) {
  if (error instanceof AnalysisError) { res.status(error.status).json({ error: {code:error.code,message:error.message} }); return }
  console.error('[IA/Historial] Error procesando la conversación.')
  res.status(503).json({error:{code:'AI_UNAVAILABLE',message:'No fue posible consultar el asistente.'}})
}
analysisRouter.get('/catalogo', async (req,res) => {
  res.setHeader('Cache-Control','private, no-store')
  try {
    const u=await usuarioAsistente(req)
    const operativo=await contextoOperativo(u,6)
    const db=getPrismaClient()
    const [familias,usuarios,compromisos,huertos]=await Promise.all([
      db.familia.findMany({where:{id:{in:operativo.familias.map(x=>x.id)}},select:{id:true,nombreReferencia:true},orderBy:{nombreReferencia:'asc'}}),
      db.usuario.findMany({where:{id:{in:[...new Set([...operativo.tecnicos,...operativo.participantes].map(x=>x.id))]}},select:{id:true,nombre:true,apellido:true},orderBy:{nombre:'asc'}}),
      db.seguimientoVisita.findMany({where:{id:{in:operativo.compromisos.map(x=>x.id)}},select:{id:true,texto:true,visitaOrigen:{select:{familiaId:true}}}}),
      db.huerto.findMany({where:{id:{in:operativo.huertos.map(x=>x.id)}},select:{id:true,nombre:true,familiaId:true}}),
    ])
    // Este catálogo nominativo se devuelve únicamente al navegador autenticado, no a Gemini.
    const personas=usuarios.map(t=>({id:t.id,nombre:[t.nombre,t.apellido].filter(Boolean).join(' ')}))
    res.json({data:{familias,tecnicos:personas.filter(t=>operativo.tecnicos.some(x=>x.id===t.id)),participantes:personas.filter(t=>operativo.participantes.some(x=>x.id===t.id)),visitas:operativo.visitas,compromisos,huertos}})
  } catch(e) {errorAsistente(res,e)}
})
analysisRouter.get('/conversaciones', async (req,res) => {
  res.setHeader('Cache-Control','private, no-store')
  try { const u=await usuarioAsistente(req); res.json({data:await listarConversaciones(u.id)}) } catch(e) {errorAsistente(res,e)}
})
analysisRouter.get('/conversaciones/:id', async (req,res) => {
  res.setHeader('Cache-Control','private, no-store')
  try { const u=await usuarioAsistente(req); res.json({data:await leerConversacion(u.id,req.params.id)}) } catch(e) {errorAsistente(res,e)}
})
analysisRouter.delete('/conversaciones/:id', async (req,res) => {
  res.setHeader('Cache-Control','private, no-store')
  try { const u=await usuarioAsistente(req); if(req.get('X-Requested-With')!=='XMLHttpRequest') throw new AnalysisError('FORBIDDEN',403,'Solicitud no autorizada.'); await eliminarConversacion(u.id,req.params.id); res.status(204).end() } catch(e) {errorAsistente(res,e)}
})

/** Conversación libre con historial privado y propuestas validadas. */
analysisRouter.post('/chat', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, private')
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Sesión inválida.' } }); return }
    if (!puedeEditarPerfilCompleto(usuario.roles)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No autorizado.' } }); return
    }
    const body: unknown = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Solicitud inválida.' } }); return
    }
    const datos = body as Record<string, unknown>
    if (Object.keys(datos).some(k => !['meses', 'pregunta', 'conversacionId', 'comunidadId', 'responsableId'].includes(k)) ||
        typeof datos.meses !== 'number') {
      res.status(400).json({ error: { code: 'INVALID_BODY', message: 'Solicitud inválida.' } }); return
    }
    const filtroId = (valor: unknown) => {
      if (valor === undefined) return undefined
      if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 1 || valor > 999_999_999) {
        throw new AnalysisError('INVALID_FILTERS', 400, 'Filtro inválido.')
      }
      return valor
    }
    if (req.get('X-Requested-With') !== 'XMLHttpRequest') throw new AnalysisError('FORBIDDEN',403,'Solicitud no autorizada.')
    const pregunta = validarPreguntaChat(datos.pregunta)
    if (![3,6,12].includes(datos.meses)) throw new AnalysisError('INVALID_FILTERS',400,'Período inválido.')
    const conversacion = datos.conversacionId == null ? null : await leerConversacion(usuario.id, datos.conversacionId)
    const operativo = await contextoOperativo(usuario, datos.meses)
    const resultado = await responderChatInstitucional(usuario, datos.meses, pregunta, contextoConversacion(conversacion?.intercambios ?? []), {
      comunidadId: filtroId(datos.comunidadId), responsableId: filtroId(datos.responsableId),
    }, { operativo })
    const accion = validarAccionIA(resultado.resultado.accion, operativo, usuario)
    const { respuesta, referencias, limitaciones } = resultado.resultado
    const limitacionesFinales = resultado.resultado.accion && !accion ? [...limitaciones.slice(0,2),'No se pudo preparar la acción con los datos o permisos actuales.'] : limitaciones
    const guardada = await guardarIntercambio(usuario.id, conversacion, pregunta, {respuesta, referencias, limitaciones:limitacionesFinales})
    res.status(200).json({ ...resultado, resultado: { respuesta, referencias, limitaciones:limitacionesFinales }, conversacionId:guardada.id, intercambios:guardada.intercambios, accion })
  } catch (error) {
    if (error instanceof AnalysisError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } }); return
    }
    console.error('[IA/Chat] Error al procesar solicitud.')
    res.status(503).json({ error: { code: 'AI_UNAVAILABLE', message: 'El asistente no está disponible.' } })
  }
})
