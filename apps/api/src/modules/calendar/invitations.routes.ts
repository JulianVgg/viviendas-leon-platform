import { Router, type Request, type Response } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { esDireccionGeneral } from '../auth/require-permission.middleware.js'
import { eventoYaFinalizo } from './event-history.js'

/**
 * NTF-09: el evento institucional sigue siendo la única fuente de datos.
 * Esta API gestiona las respuestas de su tabla de participantes.
 * Las respuestas solo requieren sesión y asignación propia; el seguimiento exige un rol gestor.
 */
export const invitationsRouter = Router()
invitationsRouter.use(requireAuth)

type EstadoRespuesta = 'ACEPTADA' | 'RECHAZADA'
const pendientes = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA']
const nombre = (persona: { nombre: string; apellido: string | null }) =>
  [persona.nombre, persona.apellido].filter(Boolean).join(' ')
const fecha = (valor: Date) => valor.toISOString().slice(0, 10)

function esCoordinacion(roles: string[]) {
  return roles.some(rol => rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase() === 'coordinadora del programa agroforestal')
}

async function puedeAdministrar(req: Request) {
  const user = req.session.userId ? await getAuthenticatedUser(req.session.userId) : null
  return !!user && (esDireccionGeneral(user.roles) || esCoordinacion(user.roles))
}

function esIdValido(id: string): number | null {
  if (!/^[1-9]\d*$/.test(id)) return null
  const valor = Number(id)
  return Number.isSafeInteger(valor) && valor <= 2_147_483_647 ? valor : null
}

const seleccionEvento = {
  id: true, titulo: true, categoria: true, descripcion: true, lugar: true,
  fechaInicio: true, fechaFin: true, horaInicio: true, horaFin: true,
  creadoPor: { select: { id: true, nombre: true, apellido: true } },
} as const

// El usuario solamente ve sus invitaciones, no las respuestas de sus compañeros.
invitationsRouter.get('/mias', async (req: Request, res: Response) => {
  try {
    const rows = await getPrismaClient().eventoInstitucionalParticipante.findMany({
      where: { usuarioId: req.session.userId!, estadoInvitacion: { in: [...pendientes, 'ASIGNADO'] } },
      include: { evento: { select: seleccionEvento } },
      orderBy: { evento: { fechaInicio: 'desc' } },
      take: 200,
    })
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: rows.map(row => ({
      eventoId: row.eventoId, estado: row.estadoInvitacion, respondidaEn: row.respondidaEn,
      titulo: row.evento.titulo, categoria: row.evento.categoria,
      descripcion: row.evento.descripcion ?? '', lugar: row.evento.lugar ?? '',
      fechaInicio: fecha(row.evento.fechaInicio), fechaFin: fecha(row.evento.fechaFin),
      horaInicio: row.evento.horaInicio, horaFin: row.evento.horaFin,
      organizador: nombre(row.evento.creadoPor),
    })) })
  } catch (error) { console.error('Error consultando invitaciones:', error); res.status(503).json({ error: 'No se pudieron consultar las invitaciones.' }) }
})

// Solo Dirección y Coordinación ven las respuestas individuales.
invitationsRouter.get('/resumen', async (req: Request, res: Response) => {
  if (!await puedeAdministrar(req)) { res.status(403).json({ error: 'No tienes permiso para consultar el seguimiento.' }); return }
  try {
    const eventos = await getPrismaClient().eventoInstitucional.findMany({
      where: { participantes: { some: { estadoInvitacion: { in: pendientes } } } },
      select: {
        ...seleccionEvento,
        participantes: { where: { estadoInvitacion: { in: pendientes } },
          select: { estadoInvitacion: true, respondidaEn: true,
            usuario: { select: { id: true, nombre: true, apellido: true } } } },
      },
      orderBy: [{ fechaInicio: 'desc' }, { id: 'desc' }],
      take: 200,
    })
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: eventos.map(evento => ({
      eventoId: evento.id, titulo: evento.titulo, fechaInicio: fecha(evento.fechaInicio),
      invitados: evento.participantes.length,
      aceptaron: evento.participantes.filter(p => p.estadoInvitacion === 'ACEPTADA').length,
      rechazaron: evento.participantes.filter(p => p.estadoInvitacion === 'RECHAZADA').length,
      pendientes: evento.participantes.filter(p => p.estadoInvitacion === 'PENDIENTE').length,
      participantes: evento.participantes.map(p => ({
        usuarioId: p.usuario.id, nombre: nombre(p.usuario),
        estado: p.estadoInvitacion, respondidaEn: p.respondidaEn,
      })),
    })) })
  } catch (error) { console.error('Error consultando seguimiento:', error); res.status(503).json({ error: 'No se pudo consultar el seguimiento.' }) }
})

// Consulta puntual de participantes y sus respuestas desde el detalle del evento.
// Solo Dirección y Coordinación pueden acceder al listado completo.
invitationsRouter.get('/:id/participantes', async (req: Request, res: Response) => {
  if (!await puedeAdministrar(req)) {
    res.status(403).json({ error: 'No tienes permiso para consultar las respuestas.' }); return
  }
  const id = esIdValido(String(req.params.id))
  if (id === null) { res.status(400).json({ error: 'Identificador inválido.' }); return }
  try {
    const evento = await getPrismaClient().eventoInstitucional.findUnique({
      where: { id },
      select: { participantes: {
        select: { usuarioId: true, estadoInvitacion: true, respondidaEn: true,
          usuario: { select: { nombre: true, apellido: true } } },
      } },
    })
    if (!evento) { res.status(404).json({ error: 'Evento no encontrado.' }); return }
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: evento.participantes.map(p => ({
      usuarioId: p.usuarioId, nombre: nombre(p.usuario),
      estado: p.estadoInvitacion, respondidaEn: p.respondidaEn,
    })) })
  } catch (error) {
    console.error('Error consultando participantes del evento:', error)
    res.status(503).json({ error: 'No se pudieron consultar los estados de los participantes.' })
  }
})

// Un destinatario puede consultar el resumen de su invitación desde una notificación.
invitationsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = esIdValido(String(req.params.id))
  if (id === null) { res.status(400).json({ error: 'Identificador inválido.' }); return }
  try {
    const esGestor = await puedeAdministrar(req)
    const evento = await getPrismaClient().eventoInstitucional.findUnique({
      where: { id }, select: { ...seleccionEvento,
        participantes: { where: esGestor ? undefined : { usuarioId: req.session.userId! },
          select: { usuarioId: true, estadoInvitacion: true, respondidaEn: true } },
      },
    })
    if (!evento || (!esGestor && !evento.participantes.length)) {
      res.status(404).json({ error: 'Invitación no encontrada.' }); return
    }
    const propia = evento.participantes.find(p => p.usuarioId === req.session.userId)
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({
      eventoId: evento.id, titulo: evento.titulo, categoria: evento.categoria,
      descripcion: evento.descripcion ?? '', lugar: evento.lugar ?? '',
      fechaInicio: fecha(evento.fechaInicio), fechaFin: fecha(evento.fechaFin),
      horaInicio: evento.horaInicio, horaFin: evento.horaFin,
      organizador: nombre(evento.creadoPor),
      estado: propia?.estadoInvitacion ?? null,
      respondidaEn: propia?.respondidaEn ?? null,
    })
  } catch (error) { console.error('Error consultando invitación:', error); res.status(503).json({ error: 'No se pudo consultar la invitación.' }) }
})

// Solo el usuario invitado puede responder su propia invitación.
// La transacción bloquea la relación para no generar respuestas/notificaciones repetidas.
invitationsRouter.patch('/:id/respuesta', async (req: Request, res: Response) => {
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') {
    res.status(403).json({ error: 'Solicitud no autorizada.' }); return
  }
  const id = esIdValido(String(req.params.id))
  const estado = req.body?.estado as unknown
  if (id === null || (estado !== 'ACEPTADA' && estado !== 'RECHAZADA')) {
    res.status(400).json({ error: 'Evento o respuesta inválidos.' }); return
  }
  try {
    const usuarioId = req.session.userId!
    const resultado = await getPrismaClient().$transaction(async tx => {
      await tx.$queryRaw`SELECT "evento_id" FROM "evento_institucional_participante" WHERE "evento_id" = ${id} AND "usuario_id" = ${usuarioId} FOR UPDATE`
      const invitacion = await tx.eventoInstitucionalParticipante.findUnique({
        where: { eventoId_usuarioId: { eventoId: id, usuarioId } },
        include: { evento: { select: { titulo: true, fechaFin: true } }, usuario: { select: { nombre: true, apellido: true } } },
      })
      if (!invitacion || invitacion.estadoInvitacion === 'ASIGNADO') return null
      if (eventoYaFinalizo(invitacion.evento.fechaFin)) return 'FINALIZADO' as const
      if (invitacion.estadoInvitacion === estado) {
        return { estado, respondidaEn: invitacion.respondidaEn, sinCambios: true }
      }
      const respondidaEn = new Date()
      await tx.eventoInstitucionalParticipante.update({
        where: { eventoId_usuarioId: { eventoId: id, usuarioId } },
        data: { estadoInvitacion: estado as EstadoRespuesta, respondidaEn },
      })
      const responsables = await tx.usuario.findMany({
        where: { estado: 'ACTIVO', roles: { some: { rol: { activo: true,
          nombre: { in: ['Dirección general', 'Coordinadora del programa agroforestal'] },
        } } } },
        select: { id: true }, take: 300,
      })
      if (responsables.length) await tx.notificacion.createMany({ data: responsables.map(destinatario => ({
        usuarioId: destinatario.id, tipo: 'INVITACION_RESPUESTA',
        titulo: estado === 'ACEPTADA' ? 'Invitación aceptada' : 'Invitación rechazada',
        mensaje: `${nombre(invitacion.usuario)} ${estado === 'ACEPTADA' ? 'aceptó' : 'rechazó'} la invitación a ${invitacion.evento.titulo}.`,
        referencia: '/notificaciones',
      })) })
      return { estado, respondidaEn, sinCambios: false }
    })
    if (resultado === 'FINALIZADO') { res.status(409).json({ error: 'La actividad ya finalizó. La invitación es de solo consulta.' }); return }
    if (!resultado) { res.status(404).json({ error: 'No se encontró una invitación válida para responder.' }); return }
    res.json(resultado)
  } catch (error) { console.error('Error respondiendo invitación:', error); res.status(503).json({ error: 'No se pudo registrar tu respuesta.' }) }
})
