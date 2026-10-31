import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { obtenerResumenDashboard } from './dashboard-summary.service.js'
import { obtenerIndicadoresFamiliasProgramas } from './families-programs.service.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import { obtenerDetalleIndicador, TIPOS_DETALLE } from './dashboard-detail.service.js'
import { obtenerIndicadoresVisitasCapacitaciones } from './visits-training.service.js'
import { obtenerIndicadoresAgricolas } from './agriculture-production.service.js'
import { validarFiltrosMon05 } from './mon05-filters.js'
import { obtenerResumenAlertasMon06, obtenerDetalleAlertasMon06 } from './mon06-alerts.service.js'
import { getPrismaClient } from '../../config/prisma.js'

function filtrosPara(req: import('express').Request, res: import('express').Response, institucional: boolean) {
  try { return validarFiltrosMon05({ comunidadId: req.query.comunidadId, responsableId: req.query.responsableId }, institucional) }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Filtro inválido.'
    res.status(message === 'Filtro no autorizado.' ? 403 : 400).json({ error: message })
    return null
  }
}

export const dashboardSummaryRouter = Router()
dashboardSummaryRouter.use(requireAuth)

dashboardSummaryRouter.get('/', async (req, res) => {
  const meses = Number(req.query.meses ?? 6)
  if (![3, 6, 12].includes(meses)) {
    res.status(400).json({ error: { message: 'Período inválido.' } })
    return
  }
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: { message: 'Sesión inválida.' } }); return }
    res.setHeader('Cache-Control', 'private, no-store')
    const filtros = filtrosPara(req, res, puedeEditarPerfilCompleto(usuario.roles))
    if (!filtros) return
    res.json(await obtenerResumenDashboard(usuario, meses, undefined, filtros))
  } catch (error) {
    console.error('[MON-01] No se pudo cargar el dashboard:', error)
    res.status(503).json({ error: { message: 'No fue posible consultar los indicadores.' } })
  }
})

// MON-02: métricas institucionales, con verificación explícita de perfil.
dashboardSummaryRouter.get('/familias-programas', async (req, res) => {
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: 'Sesión inválida.' }); return }
    if (!puedeEditarPerfilCompleto(usuario.roles)) {
      res.status(403).json({ error: 'No tienes permiso para consultar los indicadores institucionales.' }); return
    }
    res.setHeader('Cache-Control', 'private, no-store')
    const filtros = filtrosPara(req, res, true)
    if (!filtros) return
    res.json(await obtenerIndicadoresFamiliasProgramas(undefined, undefined, filtros))
  } catch (error) {
    console.error('[MON-02] Error consultando indicadores de familias:', error)
    res.status(503).json({ error: 'No fue posible consultar la participación por programa.' })
  }
})

// MON-03: desglose real, siempre limitado a los registros visibles para la cuenta.
dashboardSummaryRouter.get('/visitas-capacitaciones', async (req, res) => {
  const meses = Number(req.query.meses ?? 6)
  if (![3, 6, 12].includes(meses)) { res.status(400).json({ error: 'Período inválido.' }); return }
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: 'Sesión inválida.' }); return }
    res.setHeader('Cache-Control', 'private, no-store')
    const filtros = filtrosPara(req, res, puedeEditarPerfilCompleto(usuario.roles))
    if (!filtros) return
    res.json(await obtenerIndicadoresVisitasCapacitaciones(usuario, meses, undefined, undefined, filtros))
  } catch (error) {
    console.error('[MON-03] Error consultando actividad técnica:', error)
    res.status(503).json({ error: 'No fue posible consultar las actividades.' })
  }
})

dashboardSummaryRouter.get('/detalle', async (req, res) => {
  const tipo = String(req.query.tipo ?? '')
  const meses = Number(req.query.meses ?? 6)
  const pagina = Number(req.query.pagina ?? 1)
  const limite = Number(req.query.limite ?? 10)
  if (!TIPOS_DETALLE.some(item => item === tipo) || ![3,6,12].includes(meses) ||
      !Number.isInteger(pagina) || pagina < 1 || pagina > 100000 ||
      !Number.isInteger(limite) || ![10,20].includes(limite)) {
    res.status(400).json({ error: 'Filtros inválidos.' }); return
  }
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: 'Sesión inválida.' }); return }
    const filtros = filtrosPara(req, res, puedeEditarPerfilCompleto(usuario.roles))
    if (!filtros) return
    const resultado = await obtenerDetalleIndicador(usuario, tipo as typeof TIPOS_DETALLE[number], meses, pagina, limite, undefined, undefined, filtros)
    if (!resultado) { res.status(403).json({ error: 'No autorizado.' }); return }
    res.setHeader('Cache-Control', 'private, no-store')
    res.json(resultado)
  } catch (error) {
    console.error('[MON-03] Error consultando detalle:', error)
    res.status(503).json({ error: 'No fue posible consultar el detalle.' })
  }
})

// MON-04: indicadores agrícolas y producción real, solo para supervisión autorizada.
dashboardSummaryRouter.get('/agricultura-produccion', async (req, res) => {
  const meses = Number(req.query.meses ?? 6)
  if (![3, 6, 12].includes(meses)) { res.status(400).json({ error: 'Período inválido.' }); return }
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: 'Sesión inválida.' }); return }
    if (!puedeEditarPerfilCompleto(usuario.roles)) {
      res.status(403).json({ error: 'No autorizado.' }); return
    }
    res.setHeader('Cache-Control', 'private, no-store')
    const filtros = filtrosPara(req, res, true)
    if (!filtros) return
    res.json(await obtenerIndicadoresAgricolas(meses, undefined, undefined, filtros))
  } catch (error) {
    console.error('[MON-04] Error consultando producción agrícola:', error)
    res.status(503).json({ error: 'No fue posible consultar los indicadores agrícolas.' })
  }
})

// Las opciones se entregan solo a supervisores; no se exponen usuarios desde sesiones técnicas.
dashboardSummaryRouter.get('/filtros', async (req, res) => {
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: 'Sesión inválida.' }); return }
    if (!puedeEditarPerfilCompleto(usuario.roles)) { res.status(403).json({ error: 'No autorizado.' }); return }
    const db = getPrismaClient()
    const [comunidades, visitas, capacitaciones] = await Promise.all([
      db.comunidad.findMany({ select: { id: true, nombre: true }, orderBy: [{ nombre: 'asc' }, { id: 'asc' }] }),
      db.visita.findMany({ distinct: ['usuarioResponsableId'], select: { usuarioResponsableId: true, usuarioResponsable: { select: { nombre: true, apellido: true } } } }),
      db.capacitacion.findMany({ where: { usuarioResponsableId: { not: null } }, distinct: ['usuarioResponsableId'], select: { usuarioResponsableId: true, usuarioResponsable: { select: { nombre: true, apellido: true } } } }),
    ])
    const responsables = new Map<number, string>()
    for (const fila of [...visitas, ...capacitaciones]) {
      if (fila.usuarioResponsableId && fila.usuarioResponsable) responsables.set(fila.usuarioResponsableId, `${fila.usuarioResponsable.nombre} ${fila.usuarioResponsable.apellido ?? ''}`.trim())
    }
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ comunidades, responsables: [...responsables].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) })
  } catch (error) {
    console.error('[MON-05] Error consultando filtros:', error)
    res.status(503).json({ error: 'No fue posible consultar los filtros.' })
  }
})

// MON-06 — alertas operativas de visitas y compromisos, con alcance por rol.
dashboardSummaryRouter.get('/alertas', async (req, res) => {
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: 'Sesión inválida.' }); return }
    const filtros = filtrosPara(req, res, puedeEditarPerfilCompleto(usuario.roles))
    if (!filtros) return
    const datos = await obtenerResumenAlertasMon06(usuario, filtros)
    if (!datos) { res.status(403).json({ error: 'No autorizado.' }); return }
    res.setHeader('Cache-Control', 'private, no-store')
    res.json(datos)
  } catch (error) {
    console.error('[MON-06] Error consultando alertas:', error)
    res.status(503).json({ error: 'No fue posible consultar las alertas.' })
  }
})

dashboardSummaryRouter.get('/alertas/detalle', async (req, res) => {
  const tipo = String(req.query.tipo ?? '')
  const situacion = String(req.query.situacion ?? 'todas')
  const pagina = Number(req.query.pagina ?? 1)
  const limite = Number(req.query.limite ?? 10)
  if (!['visitas', 'compromisos'].includes(tipo) || !['todas', 'vencidas'].includes(situacion) ||
      !Number.isInteger(pagina) || pagina < 1 || pagina > 100000 || limite !== 10) {
    res.status(400).json({ error: 'Filtros inválidos.' }); return
  }
  try {
    const usuario = await getAuthenticatedUser(req.session.userId!)
    if (!usuario) { res.status(401).json({ error: 'Sesión inválida.' }); return }
    const filtros = filtrosPara(req, res, puedeEditarPerfilCompleto(usuario.roles))
    if (!filtros) return
    const datos = await obtenerDetalleAlertasMon06(usuario, tipo as 'visitas' | 'compromisos',
      situacion as 'todas' | 'vencidas', pagina, limite, filtros)
    if (!datos) { res.status(403).json({ error: 'No autorizado.' }); return }
    res.setHeader('Cache-Control', 'private, no-store')
    res.json(datos)
  } catch (error) {
    console.error('[MON-06] Error consultando alertas detalladas:', error)
    res.status(503).json({ error: 'No fue posible consultar las alertas.' })
  }
})
