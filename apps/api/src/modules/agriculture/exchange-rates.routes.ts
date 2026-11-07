import { Router } from 'express'
import { Prisma } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { requireProductionRead } from './production.access.js'
import { guatemalaToday } from './sales.rules.js'
import { validateExchangeRateInput } from './exchange-rates.rules.js'

export const exchangeRatesRouter = Router()
const iso = (value: Date) => value.toISOString().slice(0, 10)
const errorBody = (code: string, message: string, details?: unknown) => ({ error: { code, message, ...(details ? { details } : {}) } })

exchangeRatesRouter.get('/', requireProductionRead, async (_req, res, next) => {
  try {
    const rates = await getPrismaClient().tipoCambio.findMany({
      orderBy: { fecha: 'desc' }, take: 500,
      select: { id: true, fecha: true, quetzalesPorDolar: true, fuente: true, referencia: true, creadoEn: true },
    })
    res.json({ data: rates.map(row => ({ id: row.id, fecha: iso(row.fecha),
      quetzalesPorDolar: row.quetzalesPorDolar.toString(), fuente: row.fuente,
      referencia: row.referencia, creadoEn: row.creadoEn.toISOString() })) })
  } catch (cause) { next(cause) }
})

// Tasa por día, inmutable. No existe PATCH ni DELETE; cambios requieren revisión institucional.
exchangeRatesRouter.post('/', requirePermission('TIPO_CAMBIO_WRITE'), async (req, res, next) => {
  const checked = validateExchangeRateInput(req.body, guatemalaToday())
  if (!checked.data) {
    res.status(400).json(errorBody('VALIDATION_ERROR', 'Revisa los datos de la tasa.', checked.details))
    return
  }
  const { fecha, quetzalesPorDolar, fuente, referencia } = checked.data
  try {
    const created = await getPrismaClient().$transaction(async tx => {
      const row = await tx.tipoCambio.create({ data: {
        fecha: new Date(`${fecha}T00:00:00.000Z`), quetzalesPorDolar: new Prisma.Decimal(quetzalesPorDolar),
        fuente, referencia, usuarioRegistroId: req.session.userId!,
      } })
      await tx.bitacora.create({ data: {
        usuarioId: req.session.userId!, entidad: 'tipo_cambio', registroId: String(row.id),
        accion: 'CREATE', fecha: new Date(),
        descripcion: `CIR-10: tasa GTQ/USD documentada para ${fecha} (${fuente}).`,
      } })
      return row
    })
    res.status(201).json({ data: { id: created.id, fecha: iso(created.fecha),
      quetzalesPorDolar: created.quetzalesPorDolar.toString(), fuente: created.fuente,
      referencia: created.referencia, creadoEn: created.creadoEn.toISOString() } })
  } catch (cause) {
    if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
      res.status(409).json(errorBody('RATE_EXISTS', 'Ya existe una tasa para esta fecha; no se sobrescriben tasas históricas.'))
    } else next(cause)
  }
})
