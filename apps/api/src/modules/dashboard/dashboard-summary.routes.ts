import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { obtenerResumenDashboard } from './dashboard-summary.service.js'
import { obtenerIndicadoresFamiliasProgramas } from './families-programs.service.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import { obtenerDetalleIndicador, TIPOS_DETALLE } from './dashboard-detail.service.js'
import { obtenerIndicadoresVisitasCapacitaciones } from './visits-training.service.js'

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
    res.json(await obtenerResumenDashboard(usuario, meses))
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
    res.json(await obtenerIndicadoresFamiliasProgramas())
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
    res.json(await obtenerIndicadoresVisitasCapacitaciones(usuario, meses))
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
    const resultado = await obtenerDetalleIndicador(usuario, tipo as typeof TIPOS_DETALLE[number], meses, pagina, limite)
    if (!resultado) { res.status(403).json({ error: 'No autorizado.' }); return }
    res.setHeader('Cache-Control', 'private, no-store')
    res.json(resultado)
  } catch (error) {
    console.error('[MON-03] Error consultando detalle:', error)
    res.status(503).json({ error: 'No fue posible consultar el detalle.' })
  }
})
