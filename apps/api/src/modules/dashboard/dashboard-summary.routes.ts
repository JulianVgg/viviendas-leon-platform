import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { obtenerResumenDashboard } from './dashboard-summary.service.js'

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
