import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import { generarAnalisisIA } from './analysis.service.js'
import { AnalysisError } from './analysis.errors.js'
import { esEnfoqueAnalisis } from './analysis.focus.js'
import { responderChatInstitucional } from './analysis.chat.service.js'

export const analysisRouter = Router()
analysisRouter.use(requireAuth)

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

/** Conversación libre, de solo lectura y limitada a los mismos indicadores agregados. */
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
    if (Object.keys(datos).some(k => !['meses', 'pregunta', 'historial', 'comunidadId', 'responsableId'].includes(k)) ||
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
    const resultado = await responderChatInstitucional(usuario, datos.meses, datos.pregunta, datos.historial, {
      comunidadId: filtroId(datos.comunidadId), responsableId: filtroId(datos.responsableId),
    })
    res.status(200).json(resultado)
  } catch (error) {
    if (error instanceof AnalysisError) {
      res.status(error.status).json({ error: { code: error.code, message: error.message } }); return
    }
    console.error('[IA/Chat] Error al procesar solicitud.')
    res.status(503).json({ error: { code: 'AI_UNAVAILABLE', message: 'El asistente no está disponible.' } })
  }
})
