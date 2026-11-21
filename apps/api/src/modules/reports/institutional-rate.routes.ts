import { Router } from 'express'
import { Prisma } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { validateInstitutionalRate } from './institutional-rate.rules.js'

export const institutionalRateRouter = Router()
institutionalRateRouter.use(requireAuth)

type RateRow = { quetzales_por_dolar: Prisma.Decimal; actualizado_en: Date }
const projectRate = (row: RateRow) => ({
  quetzalesPorDolar: row.quetzales_por_dolar.toString(),
  actualizadoEn: row.actualizado_en.toISOString(),
})

institutionalRateRouter.get('/', requirePermission('PANTALLA_TIPO_CAMBIO'), async (_req, res, next) => {
  try {
    const rows = await getPrismaClient().$queryRaw<RateRow[]>`
      SELECT quetzales_por_dolar, actualizado_en FROM configuracion_tipo_cambio WHERE id = 1
    `
    if (!rows[0]) { res.status(503).json({ error: { code: 'RATE_UNAVAILABLE', message: 'La tasa no está configurada.' } }); return }
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: projectRate(rows[0]) })
  } catch (error) { next(error) }
})

institutionalRateRouter.put('/', requirePermission('TIPO_CAMBIO_WRITE'), async (req, res, next) => {
  const value = validateInstitutionalRate(req.body?.quetzalesPorDolar)
  if (!value || !req.body || Object.keys(req.body).length !== 1) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Ingresa una tasa válida entre Q0.01 y Q100, con hasta 6 decimales.' } })
    return
  }
  try {
    const updated = await getPrismaClient().$transaction(async tx => {
      const previous = await tx.$queryRaw<RateRow[]>`
        SELECT quetzales_por_dolar, actualizado_en FROM configuracion_tipo_cambio WHERE id = 1 FOR UPDATE
      `
      if (!previous[0]) return null
      const rows = await tx.$queryRaw<RateRow[]>`
        UPDATE configuracion_tipo_cambio
        SET quetzales_por_dolar = ${new Prisma.Decimal(value)}, actualizado_en = now(), usuario_id = ${req.session.userId!}
        WHERE id = 1 RETURNING quetzales_por_dolar, actualizado_en
      `
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'configuracion_tipo_cambio', registroId: '1',
        accion: 'UPDATE', fecha: new Date(),
        datosAnteriores: JSON.stringify({ quetzalesPorDolar: previous[0].quetzales_por_dolar.toString() }),
        datosNuevos: JSON.stringify({ quetzalesPorDolar: value }),
        descripcion: 'Tipo de cambio institucional actualizado.',
      } })
      return rows[0]
    })
    if (!updated) { res.status(503).json({ error: { code: 'RATE_UNAVAILABLE', message: 'La tasa no está configurada.' } }); return }
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: projectRate(updated) })
  } catch (error) { next(error) }
})
