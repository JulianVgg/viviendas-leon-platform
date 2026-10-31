import { getPrismaClient } from '../../config/prisma.js'
import type { AuthenticatedUser } from '../auth/auth.service.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import { limitesMon03, resumirActividadOperativa } from './visits-training.rules.js'
import { filtroVisita, filtroCapacitacion, type FiltrosMon05 } from './mon05-filters.js'

// MON-03: una misma definición de fechas y permisos para las estadísticas y su desglose.
export async function obtenerIndicadoresVisitasCapacitaciones(
  usuario: AuthenticatedUser,
  meses: number,
  db = getPrismaClient(),
  ahora = new Date(),
  filtros: FiltrosMon05 = {},
) {
  const { desde, hasta, hoy } = limitesMon03(ahora, meses)
  const institucional = puedeEditarPerfilCompleto(usuario.roles)
  const fechas = { gte: new Date(`${desde}T00:00:00Z`), lte: new Date(`${hasta}T00:00:00Z`) }
  const [visitas, capacitaciones] = await Promise.all([
    db.visita.findMany({
      where: { ...filtroVisita(institucional ? filtros : {}), ...(!institucional ? { usuarioResponsableId: usuario.id } : {}), fecha: fechas },
      select: { id: true, fecha: true, estado: true, usuarioResponsableId: true,
        usuarioResponsable: { select: { nombre: true, apellido: true } }, reprogramaciones: { select: { id: true }, take: 1 } },
    }),
    db.capacitacion.findMany({
      where: { ...filtroCapacitacion(institucional ? filtros : {}), ...(!institucional ? { usuarioResponsableId: usuario.id } : {}), fecha: fechas },
      select: { id: true, fecha: true, estado: true, usuarioResponsableId: true,
        usuarioResponsable: { select: { nombre: true, apellido: true } } },
    }),
  ])
  return { alcance: institucional ? 'INSTITUCIONAL' : 'PERSONAL', periodo: { meses, desde, hasta },
    ...resumirActividadOperativa(visitas, capacitaciones, hoy), }
}
