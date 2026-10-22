import { getPrismaClient } from '../../config/prisma.js'
import { esDireccionGeneral } from '../auth/require-permission.middleware.js'
import type { AuthenticatedUser } from '../auth/auth.service.js'

export type ActividadMiAgenda = {
  id: string
  origenId: number | string
  tipo: 'EVENTO' | 'VISITA' | 'COMPROMISO'
  titulo: string
  detalle: string
  fecha: string | null
  fechaFin?: string
  estado: 'PROGRAMADA' | 'PENDIENTE' | 'VENCIDA'
  destino: '/calendario' | '/visitas/agenda'
}

export const FECHA_LIMITE_DIAS = 30

// Los campos @db.Date se convierten en YYYY-MM-DD sin cambios de huso.
export function fechaGuatemala(now: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

export function sumarDiasISO(fecha: string, dias: number): string {
  const valor = new Date(`${fecha}T12:00:00Z`)
  valor.setUTCDate(valor.getUTCDate() + dias)
  return valor.toISOString().slice(0, 10)
}

export function puedeConsultarAgendaModulo(user: Pick<AuthenticatedUser, 'roles' | 'permisos'>, modulo: 'CALENDARIO' | 'VISITAS'): boolean {
  if (esDireccionGeneral(user.roles)) return true
  if (modulo === 'CALENDARIO') return user.permisos.includes('PANTALLA_CALENDARIO')
  const coordinador = user.roles.some(rol => rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'coordinadora del programa agroforestal')
  return (user.permisos.includes('PANTALLA_VISITAS_AGENDA') || coordinador) &&
    (coordinador || ['VISITAS_READ', 'VISITAS_WRITE', 'SYN-VISITAS-WRITE'].some(p => user.permisos.includes(p)))
}

export function ordenarActividades(items: ActividadMiAgenda[]): ActividadMiAgenda[] {
  // La combinación no replica visitas institucionales: son dos tablas independientes.
  return [...new Map(items.map(item => [item.id, item])).values()].sort((a, b) =>
    (a.fecha ?? '9999-12-31').localeCompare(b.fecha ?? '9999-12-31') ||
    a.tipo.localeCompare(b.tipo) || a.id.localeCompare(b.id))
}

export async function obtenerMiAgenda(user: AuthenticatedUser, ahora = new Date(), db = getPrismaClient()) {
  const hoy = fechaGuatemala(ahora)
  const fin = sumarDiasISO(hoy, FECHA_LIMITE_DIAS)
  const desde = new Date(`${hoy}T12:00:00Z`)
  const hasta = new Date(`${fin}T12:00:00Z`)
  const veCalendario = puedeConsultarAgendaModulo(user, 'CALENDARIO')
  const veVisitas = puedeConsultarAgendaModulo(user, 'VISITAS')

  const [eventos, visitas, vencidas, compromisos, totalVisitas, totalCompromisos] = await Promise.all([
    veCalendario ? db.eventoInstitucional.findMany({
      where: {
        fechaInicio: { lte: hasta }, fechaFin: { gte: desde },
        OR: [{ responsableId: user.id }, { participantes: { some: { usuarioId: user.id } } }],
      },
      select: { id: true, titulo: true, categoria: true, fechaInicio: true, fechaFin: true },
      orderBy: [{ fechaInicio: 'asc' }, { id: 'asc' }], take: 300,
    }) : Promise.resolve([]),
    veVisitas ? db.visita.findMany({
      where: { usuarioResponsableId: user.id, estado: 'PROGRAMADA', fecha: { gte: desde, lte: hasta } },
      select: { id: true, fecha: true, familia: { select: { nombreReferencia: true, comunidad: { select: { nombre: true } } } } },
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }], take: 300,
    }) : Promise.resolve([]),
    veVisitas ? db.visita.findMany({
      where: { usuarioResponsableId: user.id, estado: 'PROGRAMADA', fecha: { lt: desde } },
      select: { id: true, fecha: true, familia: { select: { nombreReferencia: true, comunidad: { select: { nombre: true } } } } },
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }], take: 8,
    }) : Promise.resolve([]),
    veVisitas ? db.seguimientoVisita.findMany({
      where: { estado: 'PENDIENTE', visitaOrigen: { usuarioResponsableId: user.id } },
      select: { id: true, texto: true, fechaLimite: true, responsable: true,
        visitaOrigen: { select: { familia: { select: { nombreReferencia: true } } } } },
      orderBy: [{ fechaLimite: 'asc' }, { creadoEn: 'desc' }], take: 50,
    }) : Promise.resolve([]),
    veVisitas ? db.visita.count({ where: { usuarioResponsableId: user.id, estado: 'PROGRAMADA' } }) : Promise.resolve(0),
    veVisitas ? db.seguimientoVisita.count({ where: { estado: 'PENDIENTE', visitaOrigen: { usuarioResponsableId: user.id } } }) : Promise.resolve(0),
  ])

  const actividades: ActividadMiAgenda[] = [
    ...eventos.map(e => ({
      id: `EVENTO:${e.id}`, origenId: e.id, tipo: 'EVENTO' as const, titulo: e.titulo,
      detalle: e.categoria === 'OTRO' ? 'Actividad institucional' : 'Calendario institucional',
      fecha: e.fechaInicio.toISOString().slice(0, 10) < hoy ? hoy : e.fechaInicio.toISOString().slice(0, 10),
      fechaFin: e.fechaFin.toISOString().slice(0, 10), estado: 'PROGRAMADA' as const, destino: '/calendario' as const,
    })),
    ...visitas.map(v => ({
      id: `VISITA:${v.id}`, origenId: v.id, tipo: 'VISITA' as const,
      titulo: `Visita a ${v.familia.nombreReferencia}`, detalle: v.familia.comunidad.nombre,
      fecha: v.fecha.toISOString().slice(0, 10), estado: 'PROGRAMADA' as const, destino: '/visitas/agenda' as const,
    })),
  ]
  const ordenadas = ordenarActividades(actividades)
  const pendientes: ActividadMiAgenda[] = ordenarActividades([
    ...vencidas.map(v => ({
      id: `VISITA:${v.id}`, origenId: v.id, tipo: 'VISITA' as const,
      titulo: `Visita vencida: ${v.familia.nombreReferencia}`, detalle: v.familia.comunidad.nombre,
      fecha: v.fecha.toISOString().slice(0, 10), estado: 'VENCIDA' as const, destino: '/visitas/agenda' as const,
    })),
    ...compromisos.map(s => ({
      id: `COMPROMISO:${s.id}`, origenId: s.id, tipo: 'COMPROMISO' as const,
      titulo: s.texto, detalle: `${s.visitaOrigen.familia.nombreReferencia} · ${s.responsable}`,
      fecha: s.fechaLimite?.toISOString().slice(0, 10) ?? null,
      estado: s.fechaLimite && s.fechaLimite.toISOString().slice(0, 10) < hoy ? 'VENCIDA' as const : 'PENDIENTE' as const,
      destino: '/visitas/agenda' as const,
    })),
  ])
  const hoyItems = ordenadas.filter(item => item.fecha === hoy)
  return {
    fechaHoy: hoy, horizonte: fin,
    indicadores: {
      actividadesHoy: hoyItems.length,
      proximasActividades: ordenadas.filter(item => item.fecha !== hoy).length,
      visitasProgramadas: totalVisitas,
      compromisosPendientes: totalCompromisos,
    },
    hoy: hoyItems.slice(0, 12), proximas: ordenadas.filter(item => item.fecha !== hoy).slice(0, 12),
    pendientes: pendientes.slice(0, 12),
    modulos: { calendario: veCalendario, visitas: veVisitas },
  }
}
