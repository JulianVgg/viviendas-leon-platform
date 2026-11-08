import { getPrismaClient } from '../../config/prisma.js'
import {
  aplicarConsolidadoInstitucional, contarVisitasConProduccion, limitesAgricultura, resumirAgricultura,
} from './agriculture-production.rules.js'
import { filtroCiclo, filtroProduccion, filtroVisita, type FiltrosMon05 } from './mon05-filters.js'
import { convertirCosecha, cosechaSelect } from '../reports/semester.service.js'
import { consolidarSemestre, definirPeriodo, paginarPorId } from '../reports/semester.rules.js'

// CIR-16: mismos registros, reglas y unidades que el Excel institucional.
// MON-04 conserva sus propios indicadores operativos de ciclos y visitas.
export async function obtenerIndicadoresAgricolas(meses: number, db = getPrismaClient(), ahora = new Date(), filtros: FiltrosMon05 = {}) {
  const { desde, hoy, claves, inicio, fin } = limitesAgricultura(ahora, meses)
  const finExclusivo = new Date(Date.parse(`${hoy}T00:00:00.000Z`) + 86_400_000)
  const [ciclos, producciones, capturas] = await Promise.all([
    db.cicloCultivo.findMany({
      where: filtroCiclo(filtros),
      select: { id: true, estado: true, cantidadPlantas: true,
        cultivo: { select: { id: true, nombre: true } },
        huerto: { select: { familia: { select: { id: true, comunidad: { select: { nombre: true } } } } } } },
    }),
    paginarPorId(cursor => db.registroProduccion.findMany({
      where: {
        fechaInicioPeriodo: { lt: finExclusivo }, fechaFinPeriodo: { gte: inicio },
        ...filtroProduccion(filtros),
      },
      select: cosechaSelect, orderBy: { id: 'asc' }, take: 400,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })),
    db.visitaCaptura.findMany({
      where: { visita: { estado: 'REALIZADA', fecha: { gte: inicio, lte: fin }, ...filtroVisita({ comunidadId: filtros.comunidadId }) } },
      select: { datos: true },
    }),
  ])
  const fechaInicial = Number(desde.slice(5, 7)) <= 6 ? 1 : 2
  const periodo = definirPeriodo({
    anio: Number(desde.slice(0, 4)), semestre: fechaInicial,
    desde, hasta: hoy,
  })
  const consolidado = consolidarSemestre(periodo, producciones.map(convertirCosecha), [])
  const base = resumirAgricultura(ciclos, [], claves)
  return {
    alcance: 'INSTITUCIONAL' as const,
    periodo: { meses, desde, hasta: hoy, criterio: 'MOVIL' as const },
    ...aplicarConsolidadoInstitucional(base, consolidado, claves),
    visitasConProduccion: contarVisitasConProduccion(capturas),
  }
}
