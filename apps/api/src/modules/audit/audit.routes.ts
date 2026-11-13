import { Router } from 'express'
import { Prisma } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { requireDirectora } from '../auth/require-directora.middleware.js'
import { validarFiltrosSemestrales } from '../reports/semester.rules.js'
import { obtenerProduccionSemestral } from '../reports/semester.service.js'
import { construirExcelControlFinanciero } from '../reports/semester.excel-views.js'

export const auditRouter = Router()
// La bitácora operativa es exclusiva de Dirección.
// Contadora interna y Auditor consultan una vista financiera separada y de solo lectura.
auditRouter.get('/control-financiero', requirePermission('PANTALLA_CONTROL_FINANCIERO'), async (req, res, next) => {
  try {
    const filtros = validarFiltrosSemestrales(req.query)
    const informe = await obtenerProduccionSemestral(filtros)
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: {
      periodo: informe.periodo,
      resumen: {
        ventas: informe.resumen.ventas,
        ventasConImporte: informe.resumen.ventasConImporte,
        gtq: informe.resumen.totalVentasOriginalGTQ,
        usd: informe.resumen.totalVentasOriginalUSD,
      },
      cultivos: informe.porCultivo.filter(c => c.ventas > 0).map(c => ({
        nombre: c.cultivo, ventas: c.ventas, gtq: c.totalVentasOriginalGTQ, usd: c.totalVentasOriginalUSD,
      })),
      movimientos: [...informe.detalleVentas].sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')) || Number(b.id) - Number(a.id)).slice(0, 40).map(v => ({
        id: v.id, fecha: v.fecha, cultivo: v.cultivo, moneda: v.moneda, importe: v.importe,
        cantidad: v.cantidad, unidad: v.unidad, visitaId: v.visitaOrigenId,
      })),
    } })
  } catch (error) {
    if (error instanceof Error && /Selecciona|Fecha inválida|Identificador|rango/i.test(error.message)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } }); return
    }
    next(error)
  }
})

auditRouter.get('/control-financiero.xlsx', requirePermission('PANTALLA_CONTROL_FINANCIERO'), async (req, res, next) => {
  try {
    const filtros = validarFiltrosSemestrales(req.query)
    const informe = await obtenerProduccionSemestral(filtros)
    const bytes = await construirExcelControlFinanciero(informe)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="Control_Ventas_Agricolas_${informe.periodo.desde}_${informe.periodo.hasta}.xlsx"`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.end(bytes)
  } catch (error) {
    if (error instanceof Error && /Selecciona|Fecha inválida|Identificador|rango/i.test(error.message)) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } }); return
    }
    next(error)
  }
})

function getString(value: unknown, max: number): string | null {
  if (value === undefined || value === '') return ''
  return typeof value === 'string' && value.length <= max ? value.trim() : null
}
function validDay(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return !Number.isNaN(Date.parse(`${s}T00:00:00-06:00`)) &&
    new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s
}

/** Usuarios con entradas de auditoría para el filtro, sin divulgar roles ni datos sensibles. */
auditRouter.get('/usuarios', requireDirectora, async (_req, res, next) => {
  try {
    const users = await getPrismaClient().usuario.findMany({
      where: { bitacoras: { some: {} } },
      select: { id: true, nombre: true, apellido: true },
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    })
    res.json({ data: users })
  } catch (error) { next(error) }
})

auditRouter.get('/bitacora', requireDirectora, async (req, res, next) => {
  const pageString = getString(req.query.page, 7) || '1'
  const limitString = getString(req.query.limit, 3) || '20'
  const userString = getString(req.query.usuarioId, 15)
  const entity = getString(req.query.entidad, 70)
  const action = getString(req.query.accion, 50)
  const from = getString(req.query.desde, 10)
  const to = getString(req.query.hasta, 10)

  const page = Number(pageString)
  const limit = Number(limitString)
  const userId = userString ? Number(userString) : undefined
  const valid = [pageString, limitString, userString, entity, action, from, to].every(v => v !== null) &&
    /^\d+$/.test(pageString) && /^\d+$/.test(limitString) &&
    Number.isSafeInteger(page) && page > 0 && page <= 100000 &&
    Number.isSafeInteger(limit) && limit > 0 && limit <= 100 &&
    (!userString || (/^[1-9]\d*$/.test(userString) && Number.isSafeInteger(userId))) &&
    (!entity || /^[a-z_]+$/.test(entity)) &&
    (!action || /^[A-Z_]+$/.test(action)) &&
    (!from || validDay(from)) && (!to || validDay(to)) &&
    (!from || !to || from <= to)

  if (!valid) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Los filtros de auditoría no son válidos.' } })
    return
  }

  const where: Prisma.BitacoraWhereInput = {
    ...(userId ? { usuarioId: userId } : {}),
    ...(entity ? { entidad: entity } : {}),
    ...(action ? { accion: action } : {}),
    ...(from || to ? {
      fecha: {
        ...(from ? { gte: new Date(`${from}T00:00:00-06:00`) } : {}),
        ...(to ? { lt: new Date(Date.parse(`${to}T00:00:00-06:00`) + 86400000) } : {}),
      },
    } : {}),
  }

  try {
    const prisma = getPrismaClient()
    const [total, data] = await prisma.$transaction([
      prisma.bitacora.count({ where }),
      prisma.bitacora.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
        include: { usuario: { select: { id: true, nombre: true, apellido: true } } },
      }),
    ])
    res.json({ data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } })
  } catch (error) { next(error) }
})
