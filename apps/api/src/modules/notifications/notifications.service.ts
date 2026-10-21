import { getPrismaClient } from '../../config/prisma.js'
import type { ListarNotificacionesQuery } from './notifications.validation.js'

// Servicio interno: NTF-03 y siguientes podrán generar notificaciones sin
// abrir un endpoint público para suplantar remitentes o enviar spam a usuarios.
export type CrearNotificacionInput = {
  usuarioId: number
  tipo: string
  titulo: string
  mensaje: string
  // Ruta interna de la PWA, por ejemplo /calendario o /visitas/agenda.
  referencia?: string | null
}

export async function crearNotificacion(
  datos: CrearNotificacionInput,
  prisma = getPrismaClient(),
) {
  const { usuarioId, tipo, titulo, mensaje, referencia = null } = datos
  if (!Number.isSafeInteger(usuarioId) || usuarioId <= 0 ||
      !tipo.trim() || tipo.length > 50 || !titulo.trim() || titulo.length > 160 ||
      !mensaje.trim() || mensaje.length > 5_000 ||
      (referencia !== null && (referencia.length > 255 ||
        !/^\/(?!\/)[^\\\r\n]*$/.test(referencia)))) {
    throw new Error('Datos inválidos para crear la notificación.')
  }

  return prisma.notificacion.create({
    data: {
      usuarioId,
      tipo: tipo.trim(),
      titulo: titulo.trim(),
      mensaje: mensaje.trim(),
      referencia,
    },
  })
}

export async function listarNotificaciones(
  usuarioId: number,
  { pagina, limite, estado }: ListarNotificacionesQuery,
  prisma = getPrismaClient(),
) {
  const where = {
    usuarioId,
    ...(estado === 'no_leidas' ? { fechaLectura: null }
      : estado === 'leidas' ? { fechaLectura: { not: null } } : {}),
  }

  const [notificaciones, total, noLeidas] = await prisma.$transaction([
    prisma.notificacion.findMany({
      where,
      select: {
        id: true, tipo: true, titulo: true, mensaje: true, referencia: true,
        fechaCreacion: true, fechaLectura: true,
      },
      orderBy: [{ fechaCreacion: 'desc' }, { id: 'desc' }],
      skip: (pagina - 1) * limite,
      take: limite,
    }),
    prisma.notificacion.count({ where }),
    prisma.notificacion.count({ where: { usuarioId, fechaLectura: null } }),
  ])

  return {
    notificaciones,
    paginacion: { pagina, limite, total, totalPaginas: Math.ceil(total / limite) },
    noLeidas,
  }
}

export async function contarNoLeidas(usuarioId: number, prisma = getPrismaClient()) {
  const noLeidas = await prisma.notificacion.count({
    where: { usuarioId, fechaLectura: null },
  })
  return { noLeidas }
}

export async function marcarComoLeida(
  usuarioId: number, id: number, prisma = getPrismaClient(),
) {
  // El filtro por usuario se aplica en la consulta de escritura, no solo antes.
  // Solo se establece la fecha una vez; repetir la petición no la sobreescribe.
  await prisma.notificacion.updateMany({
    where: { id, usuarioId, fechaLectura: null },
    data: { fechaLectura: new Date() },
  })

  return prisma.notificacion.findFirst({
    where: { id, usuarioId },
    select: { id: true, fechaLectura: true },
  })
}

export async function marcarTodasComoLeidas(usuarioId: number, prisma = getPrismaClient()) {
  const resultado = await prisma.notificacion.updateMany({
    where: { usuarioId, fechaLectura: null },
    data: { fechaLectura: new Date() },
  })
  return { actualizadas: resultado.count }
}
