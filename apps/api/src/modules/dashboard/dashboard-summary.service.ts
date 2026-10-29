import { getPrismaClient } from '../../config/prisma.js'
import type { AuthenticatedUser } from '../auth/auth.service.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import { agruparPorMes, periodoDashboard } from './dashboard-summary.rules.js'

export async function obtenerResumenDashboard(user: AuthenticatedUser, meses: number, db = getPrismaClient()) {
  const { desde, hoy, claves } = periodoDashboard(new Date(), meses)
  const institucional = puedeEditarPerfilCompleto(user.roles)
  const filtroVisitas = institucional ? {} : { usuarioResponsableId: user.id }
  const filtroCapacitaciones = institucional ? {} : { usuarioResponsableId: user.id }
  // @db.Date se materializa a medianoche UTC; no excluir el primer día del período.
  const inicio = new Date(`${desde}T00:00:00Z`)
  const fin = new Date(`${hoy}T00:00:00Z`)
  const [visitas, capacitaciones, vencidas, familias, huertos, ciclos, programas] = await Promise.all([
    db.visita.findMany({ where: { ...filtroVisitas, fecha: { gte: inicio, lte: fin } }, select: { fecha: true, estado: true } }),
    db.capacitacion.findMany({ where: { ...filtroCapacitaciones, fecha: { gte: inicio, lte: fin } }, select: { fecha: true } }),
    db.visita.count({ where: { ...filtroVisitas, estado: 'PROGRAMADA', fecha: { lt: fin } } }),
    institucional ? db.familia.count() : Promise.resolve(null),
    institucional ? db.huerto.count({ where: { estado: { in: ['ACTIVO', 'Activo', 'activo'] } } }) : Promise.resolve(null),
    institucional ? db.cicloCultivo.count({ where: { estado: { in: ['ACTIVO', 'Activo', 'activo', 'EN_CURSO', 'En curso'] } } }) : Promise.resolve(null),
    institucional ? db.programa.findMany({ select: { id: true, nombre: true, _count: { select: { familias: true } } }, orderBy: { nombre: 'asc' } }) : Promise.resolve([]),
  ])
  return {
    alcance: institucional ? 'INSTITUCIONAL' : 'PERSONAL',
    periodo: { meses, desde, hasta: hoy },
    indicadores: {
      familias,
      huertosActivos: huertos,
      ciclosActivos: ciclos,
      visitasRealizadas: visitas.filter(v => v.estado === 'REALIZADA').length,
      capacitaciones: capacitaciones.length,
      visitasVencidas: vencidas,
    },
    actividadMensual: agruparPorMes(claves, visitas, capacitaciones),
    programas: programas.map(programa => ({ id: programa.id, nombre: programa.nombre, familias: programa._count.familias })),
  }
}
