import { getPrismaClient } from '../../config/prisma.js'
import { fechaLocalGuatemala } from './dashboard-summary.rules.js'
import { construirIndicadoresFamilias } from './families-programs.rules.js'
import { filtroFamilia, type FiltrosMon05 } from './mon05-filters.js'

export async function obtenerIndicadoresFamiliasProgramas(db = getPrismaClient(), ahora = new Date(), filtros: FiltrosMon05 = {}) {
  const [familias, programas] = await Promise.all([
    db.familia.findMany({
      where: filtroFamilia(filtros),
      select: { id: true, comunidad: { select: { nombre: true } },
        programas: { select: { programaId: true, estado: true, fechaIngreso: true, fechaSalida: true } } },
      orderBy: { id: 'asc' },
    }),
    db.programa.findMany({ select: { id: true, nombre: true, estado: true }, orderBy: { nombre: 'asc' } }),
  ])
  return construirIndicadoresFamilias(familias, programas, fechaLocalGuatemala(ahora))
}
