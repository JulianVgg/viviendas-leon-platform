import { Router } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../auth/require-permission.middleware.js'
import { obtenerProduccionSemestral } from './semester.service.js'
import { validarFiltrosSemestrales } from './semester.rules.js'
import { construirExcelSemestral } from './semester.excel.js'
import { nombreArchivoProduccionExcel } from './semester.excel-data.js'

export const semesterReportsRouter = Router()
semesterReportsRouter.use(requireAuth)

// CIR-14: filtros protegidos por el mismo permiso que el informe.
// No exponemos coordenadas ni otros datos del expediente familiar.
semesterReportsRouter.get('/produccion-semestral/filtros', requirePermission('PANTALLA_REPORTES_LISTA'), async (_req, res, next) => {
  try {
    const db = getPrismaClient()
    const [comunidades, familias] = await Promise.all([
      db.comunidad.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } }),
      db.familia.findMany({ select: { id: true, nombreReferencia: true, comunidadId: true },
        orderBy: { nombreReferencia: 'asc' } }),
    ])
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: { comunidades, familias } })
  } catch (cause) { next(cause) }
})

// Solo Dirección y usuarios con permiso de reportes: nunca se exponen listados
// nominativos ni ingresos por familia mediante el endpoint público del Dashboard.
semesterReportsRouter.get('/produccion-semestral', requirePermission('PANTALLA_REPORTES_LISTA'), async (req, res, next) => {
  let filtros
  try { filtros = validarFiltrosSemestrales(req.query) }
  catch (cause) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: cause instanceof Error ? cause.message : 'Filtros inválidos.' } })
    return
  }
  try {
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: await obtenerProduccionSemestral(filtros) })
  } catch (cause) { next(cause) }
})

// CIR-12: descarga del mismo snapshot y filtros de CIR-11, protegida por los mismos permisos.
semesterReportsRouter.get('/produccion-semestral.xlsx', requirePermission('PANTALLA_REPORTES_LISTA'), async (req, res, next) => {
  let filtros
  try { filtros = validarFiltrosSemestrales(req.query) }
  catch (cause) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: cause instanceof Error ? cause.message : 'Filtros inválidos.' } })
    return
  }
  try {
    const informe = await obtenerProduccionSemestral(filtros)
    const contenido = await construirExcelSemestral(informe)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivoProduccionExcel(informe)}"`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Length', String(contenido.length))
    res.end(contenido)
  } catch (cause) { next(cause) }
})
