import { getPrismaClient } from '../../config/prisma.js'
import { limitesAgricultura, tipoUnidad } from './agriculture-production.rules.js'
import { filtroProduccion, type FiltrosMon05 } from './mon05-filters.js'

/** Detalle verificable de las cosechas de AGR-05, limitado a un período y comunidad. */
export async function obtenerCosechasDashboard(
  meses: number,
  pagina: number,
  limite: number,
  db = getPrismaClient(),
  ahora = new Date(),
  filtros: FiltrosMon05 = {},
) {
  const { desde, hoy, inicio, fin } = limitesAgricultura(ahora, meses)
  const where = { fechaFinPeriodo: { gte: inicio, lte: fin }, ...filtroProduccion(filtros) }
  const [total, filas] = await Promise.all([
    db.registroProduccion.count({ where }),
    db.registroProduccion.findMany({
      where,
      skip: (pagina - 1) * limite,
      take: limite,
      orderBy: [{ fechaFinPeriodo: 'desc' }, { id: 'desc' }],
      select: {
        id: true, fechaInicioPeriodo: true, fechaFinPeriodo: true,
        cicloCultivoId: true,
        cicloCultivo: {
          select: {
            cultivo: { select: { nombre: true } },
            huerto: { select: {
              nombre: true,
              familia: { select: {
                nombreReferencia: true,
                comunidad: { select: { nombre: true } },
              } },
            } },
          },
        },
        detalles: {
          select: {
            cantidadTotal: true,
            unidadMedida: { select: { nombre: true, codigo: true, abreviatura: true } },
          },
        },
      },
    }),
  ])
  return {
    periodo: { meses, desde, hasta: hoy },
    pagina, limite, total, totalPaginas: Math.max(1, Math.ceil(total / limite)),
    registros: filas.map(fila => ({
      id: fila.id,
      cicloCultivoId: fila.cicloCultivoId,
      fecha: fila.fechaFinPeriodo.toISOString().slice(0, 10),
      cultivo: fila.cicloCultivo.cultivo.nombre,
      huerto: fila.cicloCultivo.huerto.nombre,
      familia: fila.cicloCultivo.huerto.familia.nombreReferencia,
      comunidad: fila.cicloCultivo.huerto.familia.comunidad.nombre,
      cantidades: fila.detalles.map(detalle => ({
        cantidad: detalle.cantidadTotal.toString(),
        unidad: detalle.unidadMedida.abreviatura || detalle.unidadMedida.nombre,
        tipo: tipoUnidad(detalle.unidadMedida.codigo, detalle.unidadMedida.abreviatura),
      })),
    })),
  }
}
