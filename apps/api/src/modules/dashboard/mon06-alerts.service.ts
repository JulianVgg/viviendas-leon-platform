import { getPrismaClient } from '../../config/prisma.js'
import type { AuthenticatedUser } from '../auth/auth.service.js'
import { puedeEditarPerfilCompleto } from '../profile/profile.permissions.js'
import { puedeConsultarAgendaModulo } from './my-agenda.service.js'
import { fechaLocalGuatemala } from './dashboard-summary.rules.js'
import { filtroVisita, type FiltrosMon05 } from './mon05-filters.js'

export type TipoAlertaMon06 = 'visitas' | 'compromisos'
export type SituacionAlertaMon06 = 'todas' | 'vencidas'

// Los campos @db.Date representan días de calendario, no instantes locales.
export const inicioDiaMon06 = (ahora: Date) => new Date(`${fechaLocalGuatemala(ahora)}T00:00:00.000Z`)
export function puedeConsultarAlertasMon06(user: Pick<AuthenticatedUser, 'roles' | 'permisos'>) {
  return puedeEditarPerfilCompleto(user.roles) || puedeConsultarAgendaModulo(user, 'VISITAS')
}

export function filtrosAlertaMon06(user: AuthenticatedUser, filtros: FiltrosMon05 = {}, ahora = new Date()) {
  const supervisor = puedeEditarPerfilCompleto(user.roles)
  const whereVisita = {
    ...filtroVisita(supervisor ? filtros : {}),
    ...(!supervisor ? { usuarioResponsableId: user.id } : {}),
  }
  return {
    supervisor,
    hoy: fechaLocalGuatemala(ahora),
    limiteHoy: inicioDiaMon06(ahora),
    visita: { ...whereVisita, estado: 'PROGRAMADA' },
    compromiso: { estado: 'PENDIENTE', visitaOrigen: whereVisita },
  }
}

function destinoVisita(supervisor: boolean, id: number) {
  return supervisor ? `/calendario?visitId=${id}` : `/visitas/agenda?visitId=${id}`
}
function destinoCompromiso(supervisor: boolean, visitaId: number, seguimientoId: string) {
  return supervisor ? destinoVisita(true, visitaId) : `/visitas/agenda?seguimiento=${encodeURIComponent(seguimientoId)}`
}

const usuarioLabel = (usuario: { nombre: string; apellido: string | null }) =>
  [usuario.nombre, usuario.apellido].filter(Boolean).join(' ')

export async function obtenerResumenAlertasMon06(
  user: AuthenticatedUser, filtros: FiltrosMon05 = {}, db = getPrismaClient(), ahora = new Date(),
) {
  if (!puedeConsultarAlertasMon06(user)) return null
  const { visita, compromiso, supervisor, hoy, limiteHoy } = filtrosAlertaMon06(user, filtros, ahora)
  const [visitasVencidas, compromisosPendientes, compromisosVencidos, visitas, compromisos] = await Promise.all([
    db.visita.count({ where: { ...visita, fecha: { lt: limiteHoy } } }),
    db.seguimientoVisita.count({ where: compromiso }),
    db.seguimientoVisita.count({ where: { ...compromiso, fechaLimite: { lt: limiteHoy } } }),
    db.visita.findMany({ where: { ...visita, fecha: { lt: limiteHoy } }, take: 4,
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }], select: {
        id: true, fecha: true, usuarioResponsable: { select: { nombre: true, apellido: true } },
        familia: { select: { nombreReferencia: true, comunidad: { select: { nombre: true } } } },
      } }),
    db.seguimientoVisita.findMany({ where: compromiso, take: 4,
      orderBy: [{ fechaLimite: 'asc' }, { creadoEn: 'asc' }], select: {
        id: true, texto: true, fechaLimite: true, revisionProximaVisita: true,
        visitaOrigen: { select: { id: true, usuarioResponsable: { select: { nombre: true, apellido: true } },
          familia: { select: { nombreReferencia: true, comunidad: { select: { nombre: true } } } } } },
      } }),
  ])
  return {
    fechaHoy: hoy,
    indicadores: { visitasVencidas, compromisosPendientes, compromisosVencidos },
    visitas: visitas.map(v => ({ id: String(v.id), tipo: 'VISITA' as const, titulo: v.familia.nombreReferencia,
      fecha: v.fecha.toISOString().slice(0, 10), estado: 'VENCIDA' as const,
      comunidad: v.familia.comunidad.nombre, responsable: usuarioLabel(v.usuarioResponsable),
      destino: destinoVisita(supervisor, v.id) })),
    compromisos: compromisos.map(s => ({ id: s.id, tipo: 'COMPROMISO' as const, titulo: s.texto,
      fecha: s.fechaLimite?.toISOString().slice(0, 10) ?? null,
      estado: s.fechaLimite && s.fechaLimite < limiteHoy ? 'VENCIDA' as const : 'PENDIENTE' as const,
      comunidad: s.visitaOrigen.familia.comunidad.nombre,
      familia: s.visitaOrigen.familia.nombreReferencia,
      responsable: usuarioLabel(s.visitaOrigen.usuarioResponsable),
      revisionProximaVisita: s.revisionProximaVisita,
      destino: destinoCompromiso(supervisor, s.visitaOrigen.id, s.id) })),
  }
}

export async function obtenerDetalleAlertasMon06(
  user: AuthenticatedUser, tipo: TipoAlertaMon06, situacion: SituacionAlertaMon06,
  pagina: number, limite: number, filtros: FiltrosMon05 = {}, db = getPrismaClient(), ahora = new Date(),
) {
  if (!puedeConsultarAlertasMon06(user)) return null
  const { visita, compromiso, supervisor, limiteHoy } = filtrosAlertaMon06(user, filtros, ahora)
  const skip = (pagina - 1) * limite
  if (tipo === 'visitas') {
    const where = { ...visita, fecha: { lt: limiteHoy } }
    const [total, filas] = await Promise.all([
      db.visita.count({ where }),
      db.visita.findMany({ where, skip, take: limite, orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
        select: { id: true, fecha: true, usuarioResponsable: { select: { nombre: true, apellido: true } },
          familia: { select: { nombreReferencia: true, comunidad: { select: { nombre: true } } } } } }),
    ])
    return { tipo, situacion, pagina, limite, total, totalPaginas: Math.max(1, Math.ceil(total / limite)),
      registros: filas.map(v => ({ id: String(v.id), tipo: 'VISITA' as const, titulo: v.familia.nombreReferencia,
        fecha: v.fecha.toISOString().slice(0, 10), estado: 'VENCIDA' as const,
        comunidad: v.familia.comunidad.nombre, responsable: usuarioLabel(v.usuarioResponsable),
        destino: destinoVisita(supervisor, v.id) })) }
  }
  const where = situacion === 'vencidas' ? { ...compromiso, fechaLimite: { lt: limiteHoy } } : compromiso
  const [total, filas] = await Promise.all([
    db.seguimientoVisita.count({ where }),
    db.seguimientoVisita.findMany({ where, skip, take: limite,
      orderBy: [{ fechaLimite: 'asc' }, { creadoEn: 'asc' }], select: {
        id: true, texto: true, fechaLimite: true, revisionProximaVisita: true,
        visitaOrigen: { select: { id: true, usuarioResponsable: { select: { nombre: true, apellido: true } },
          familia: { select: { nombreReferencia: true, comunidad: { select: { nombre: true } } } } } },
      } }),
  ])
  return { tipo, situacion, pagina, limite, total, totalPaginas: Math.max(1, Math.ceil(total / limite)),
    registros: filas.map(s => ({ id: s.id, tipo: 'COMPROMISO' as const, titulo: s.texto,
      fecha: s.fechaLimite?.toISOString().slice(0, 10) ?? null,
      estado: s.fechaLimite && s.fechaLimite < limiteHoy ? 'VENCIDA' as const : 'PENDIENTE' as const,
      familia: s.visitaOrigen.familia.nombreReferencia, comunidad: s.visitaOrigen.familia.comunidad.nombre,
      responsable: usuarioLabel(s.visitaOrigen.usuarioResponsable),
      revisionProximaVisita: s.revisionProximaVisita,
      destino: destinoCompromiso(supervisor, s.visitaOrigen.id, s.id) })) }
}
