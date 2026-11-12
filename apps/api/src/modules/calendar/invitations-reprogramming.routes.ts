import { Router, type Request, type Response } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { esDireccionGeneral } from '../auth/require-permission.middleware.js'
import { eventoYaFinalizo } from './event-history.js'
import { fechaAnteriorAHoy } from './guatemala-date.js'
import { verificarCruceInstitucional, ConflictoHorario } from './calendar-conflicts.js'
import { actualizarRecordatorios, configGuardada, configParaPrisma, reglasTrasCambioFecha } from '../notifications/reminders.service.js'
import { crearNotificacionesDeActividad } from '../notifications/notifications.service.js'

export const reprogrammingRouter = Router()

const nombre = (persona: { nombre: string; apellido: string | null }) =>
  [persona.nombre, persona.apellido].filter(Boolean).join(' ')
const fecha = (valor: Date) => valor.toISOString().slice(0, 10)
const idValido = (valor: unknown): valor is number => typeof valor === 'number' && Number.isSafeInteger(valor) && valor > 0 && valor <= 2_147_483_647
const parseId = (valor: string): number | null => {
  if (!/^[1-9]\d*$/.test(valor)) return null
  const numero = Number(valor)
  return idValido(numero) ? numero : null
}
const esFecha = (valor: unknown): valor is string => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const fechaValor = new Date(`${valor}T12:00:00Z`)
  return !Number.isNaN(fechaValor.valueOf()) && fechaValor.toISOString().slice(0, 10) === valor
}
const esCoordinacion = (roles: string[]) => roles.some(rol =>
  ['coordinadora del programa agroforestal', 'coordinador del programa agroforestal', 'coordinacion']
    .includes(rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()))

async function esGestor(usuarioId: number): Promise<boolean> {
  const usuario = await getAuthenticatedUser(usuarioId)
  return Boolean(usuario && (esDireccionGeneral(usuario.roles) || esCoordinacion(usuario.roles)))
}
function soloAjax(req: Request, res: Response): boolean {
  if (req.get('X-Requested-With') === 'XMLHttpRequest') return true
  res.status(403).json({ error: 'Solicitud no autorizada.' })
  return false
}

/** Solicitudes abiertas de los eventos creados por la persona autenticada. */
reprogrammingRouter.get('/reprogramaciones/pendientes', async (req: Request, res: Response) => {
  const organizadorId = req.session.userId!
  if (!await esGestor(organizadorId)) {
    res.status(403).json({ error: 'Acceso reservado al personal responsable.' }); return
  }
  try {
    const solicitudes = await getPrismaClient().solicitudReprogramacionInvitacion.findMany({
      where: { estado: 'PENDIENTE', evento: { creadoPorId: organizadorId } },
      include: {
        evento: { select: { id: true, titulo: true, fechaInicio: true, horaInicio: true, horaFin: true } },
        solicitante: { select: { nombre: true, apellido: true } },
      },
      orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }], take: 200,
    })
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: solicitudes.map(item => ({
      id: item.id, eventoId: item.eventoId, eventoTitulo: item.evento.titulo,
      solicitanteId: item.solicitanteId, solicitante: nombre(item.solicitante),
      fechaOriginal: fecha(item.fechaOriginal), fechaPropuesta: fecha(item.fechaPropuesta),
      fechaVigente: fecha(item.evento.fechaInicio), motivo: item.motivo, creadoEn: item.creadoEn,
      horaInicio: item.evento.horaInicio, horaFin: item.evento.horaFin,
    })) })
  } catch (error) {
    console.error('Error consultando solicitudes de reprogramación:', error)
    res.status(503).json({ error: 'No se pudieron consultar las solicitudes.' })
  }
})

/** El invitado puede ver su propia solicitud, pero nunca las de sus compañeros. */
reprogrammingRouter.get('/:id/reprogramacion', async (req: Request, res: Response) => {
  const eventoId = parseId(String(req.params.id))
  if (eventoId === null) { res.status(400).json({ error: 'Evento inválido.' }); return }
  try {
    const item = await getPrismaClient().solicitudReprogramacionInvitacion.findFirst({
      where: { eventoId, solicitanteId: req.session.userId! },
      orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
    })
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: item ? {
      id: item.id, estado: item.estado, fechaOriginal: fecha(item.fechaOriginal),
      fechaPropuesta: fecha(item.fechaPropuesta), motivo: item.motivo,
      resolucion: item.resolucion, creadoEn: item.creadoEn, resueltoEn: item.resueltoEn,
    } : null })
  } catch (error) {
    console.error('Error consultando solicitud propia:', error)
    res.status(503).json({ error: 'No se pudo consultar la solicitud.' })
  }
})

/** La propuesta no altera ni la fecha efectiva ni los participantes hasta ser resuelta. */
reprogrammingRouter.post('/:id/reprogramacion', async (req: Request, res: Response) => {
  if (!soloAjax(req, res)) return
  const eventoId = parseId(String(req.params.id))
  const nuevaFecha: unknown = req.body?.fechaPropuesta
  const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : null
  if (eventoId === null || !esFecha(nuevaFecha) || fechaAnteriorAHoy(nuevaFecha) ||
      !motivo || motivo.length < 5 || motivo.length > 500) {
    res.status(400).json({ error: 'Indica una fecha válida y un motivo de 5 a 500 caracteres.' }); return
  }
  try {
    const usuarioId = req.session.userId!
    const resultado = await getPrismaClient().$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "evento_institucional" WHERE "id" = ${eventoId} FOR UPDATE`
      const evento = await tx.eventoInstitucional.findUnique({
        where: { id: eventoId },
        include: { participantes: { where: { usuarioId }, include: {
          usuario: { select: { nombre: true, apellido: true } },
        } } },
      })
      const participante = evento?.participantes[0]
      if (!evento || !participante || participante.estadoInvitacion === 'ASIGNADO') return 'NO_EXISTE' as const
      if (eventoYaFinalizo(evento.fechaFin)) return 'FINALIZADO' as const
      if (fecha(evento.fechaInicio) === nuevaFecha) return 'MISMA_FECHA' as const
      const previa = await tx.solicitudReprogramacionInvitacion.findFirst({
        where: { eventoId, solicitanteId: usuarioId, estado: 'PENDIENTE' },
      })
      if (previa) {
        if (fecha(previa.fechaPropuesta) === nuevaFecha && previa.motivo === motivo) {
          return { id: previa.id, estado: previa.estado, sinCambios: true }
        }
        return 'SOLICITUD_PENDIENTE' as const
      }
      if (!['PENDIENTE', 'ACEPTADA', 'RECHAZADA'].includes(participante.estadoInvitacion)) {
        return 'SOLICITUD_PENDIENTE' as const
      }
      const solicitud = await tx.solicitudReprogramacionInvitacion.create({ data: {
        eventoId, solicitanteId: usuarioId, fechaOriginal: evento.fechaInicio,
        fechaPropuesta: new Date(`${nuevaFecha}T12:00:00Z`),
        motivo, versionEvento: evento.versionNotificacion,
      } })
      await tx.eventoInstitucionalParticipante.update({
        where: { eventoId_usuarioId: { eventoId, usuarioId } },
        data: { estadoInvitacion: 'REPROGRAMACION', respondidaEn: new Date() },
      })
      await tx.notificacion.create({ data: {
        usuarioId: evento.creadoPorId,
        tipo: 'INVITACION_REPROGRAMACION_SOLICITUD',
        titulo: 'Solicitud de reprogramación',
        mensaje: `${nombre(participante.usuario)} solicita reprogramar ${evento.titulo} del ${fecha(evento.fechaInicio)} al ${nuevaFecha}. Motivo: ${motivo}`,
        referencia: '/notificaciones',
      } })
      return { id: solicitud.id, estado: 'PENDIENTE', sinCambios: false }
    })
    if (resultado === 'NO_EXISTE') { res.status(404).json({ error: 'No existe una invitación válida para este usuario.' }); return }
    if (resultado === 'FINALIZADO') { res.status(409).json({ error: 'La actividad ya finalizó.' }); return }
    if (resultado === 'MISMA_FECHA') { res.status(422).json({ error: 'La nueva fecha debe ser distinta de la actual.' }); return }
    if (resultado === 'SOLICITUD_PENDIENTE') { res.status(409).json({ error: 'Ya existe una solicitud pendiente para esta invitación.' }); return }
    res.status(resultado.sinCambios ? 200 : 201).json(resultado)
  } catch (error) {
    console.error('Error solicitando reprogramación:', error)
    res.status(503).json({ error: 'No se pudo registrar la reprogramación.' })
  }
})

/** Solo el creador activo y con rol gestor puede confirmar o mantener la fecha. */
reprogrammingRouter.patch('/reprogramaciones/:id/resolver', async (req: Request, res: Response) => {
  if (!soloAjax(req, res)) return
  const solicitudId = parseId(String(req.params.id))
  const decision: unknown = req.body?.decision
  const resolucion: unknown = req.body?.resolucion
  const reemplazoId: unknown = req.body?.reemplazoUsuarioId
  const esAprobacion = decision === 'ACEPTAR_FECHA'
  const esMantenimiento = decision === 'MANTENER_FECHA'
  if (solicitudId === null || (!esAprobacion && !esMantenimiento) ||
      (esAprobacion && (resolucion != null || reemplazoId != null)) ||
      (esMantenimiento && resolucion !== 'OTRA_PERSONA' && resolucion !== 'SOLO_ORGANIZADOR') ||
      (esMantenimiento && resolucion === 'OTRA_PERSONA' && !idValido(reemplazoId)) ||
      (esMantenimiento && resolucion === 'SOLO_ORGANIZADOR' && reemplazoId != null)) {
    res.status(400).json({ error: 'Decisión o alternativa inválida.' }); return
  }
  const organizadorId = req.session.userId!
  if (!await esGestor(organizadorId)) {
    res.status(403).json({ error: 'Solo el organizador autorizado puede resolver la solicitud.' }); return
  }
  try {
    const resultado = await getPrismaClient().$transaction(async tx => {
      const inicial = await tx.solicitudReprogramacionInvitacion.findUnique({
        where: { id: solicitudId }, select: { eventoId: true },
      })
      if (!inicial) return 'NO_EXISTE' as const
      await tx.$queryRaw`SELECT "id" FROM "evento_institucional" WHERE "id" = ${inicial.eventoId} FOR UPDATE`
      const solicitud = await tx.solicitudReprogramacionInvitacion.findUnique({ where: { id: solicitudId } })
      const evento = await tx.eventoInstitucional.findUnique({
        where: { id: inicial.eventoId },
        include: { participantes: { select: { usuarioId: true, estadoInvitacion: true } } },
      })
      if (!solicitud || !evento) return 'NO_EXISTE' as const
      if (evento.creadoPorId !== organizadorId) return 'SIN_PERMISO' as const
      const estadoFinal = esAprobacion ? 'APROBADA' : 'MANTENIDA'
      if (solicitud.estado !== 'PENDIENTE') {
        const mismaDecision = solicitud.estado === estadoFinal &&
          (esAprobacion || (solicitud.resolucion === resolucion &&
            solicitud.reemplazoUsuarioId === (resolucion === 'OTRA_PERSONA' ? reemplazoId : null)))
        return mismaDecision ? { id: solicitud.id, estado: solicitud.estado, sinCambios: true } : 'YA_RESUELTA' as const
      }
      if (eventoYaFinalizo(evento.fechaFin)) return 'FINALIZADO' as const
      const invitado = evento.participantes.find(persona => persona.usuarioId === solicitud.solicitanteId)
      if (solicitud.versionEvento !== evento.versionNotificacion ||
          fecha(solicitud.fechaOriginal) !== fecha(evento.fechaInicio) ||
          invitado?.estadoInvitacion !== 'REPROGRAMACION') return 'DESACTUALIZADA' as const

      const fechaVigente = fecha(evento.fechaInicio)
      const fechaSolicitada = fecha(solicitud.fechaPropuesta)
      const hoy = new Date()
      if (esAprobacion && fechaAnteriorAHoy(fechaSolicitada, hoy)) return 'FECHA_PASADA' as const
      const nuevosParticipantes = evento.participantes.map(persona => persona.usuarioId)
      let version = evento.versionNotificacion + 1

      if (esAprobacion) {
        await verificarCruceInstitucional(tx, fechaSolicitada,
          { horaInicio: evento.horaInicio, horaFin: evento.horaFin },
          evento.participantes.filter(persona => persona.estadoInvitacion !== 'RECHAZADA')
            .map(persona => persona.usuarioId), evento.id)
        const actualizado = await tx.eventoInstitucional.update({
          where: { id: evento.id },
          data: { fechaInicio: solicitud.fechaPropuesta, fechaFin: solicitud.fechaPropuesta,
            versionNotificacion: { increment: 1 } },
        })
        version = actualizado.versionNotificacion
        // Quienes habían aceptado la fecha anterior deben confirmar de nuevo.
        await tx.eventoInstitucionalParticipante.updateMany({
          where: { eventoId: evento.id, usuarioId: { not: solicitud.solicitanteId },
            estadoInvitacion: { in: ['ACEPTADA', 'REPROGRAMACION'] } },
          data: { estadoInvitacion: 'PENDIENTE', respondidaEn: null },
        })
        await tx.eventoInstitucionalParticipante.update({
          where: { eventoId_usuarioId: { eventoId: evento.id, usuarioId: solicitud.solicitanteId } },
          data: { estadoInvitacion: 'ACEPTADA', respondidaEn: hoy },
        })
        const configAnterior = configGuardada(evento.recordatoriosConfig, fechaVigente)
        const configNueva = reglasTrasCambioFecha(configAnterior, fechaSolicitada)
        await tx.eventoInstitucional.update({ where: { id: evento.id },
          data: { recordatoriosConfig: configParaPrisma(configNueva) } })
        await actualizarRecordatorios(tx, 'CALENDARIO', evento.id, fechaSolicitada, nuevosParticipantes, configNueva)
        await crearNotificacionesDeActividad(evento.participantes
          .filter(persona => persona.usuarioId !== solicitud.solicitanteId)
          .map(persona => ({
            usuarioId: persona.usuarioId, tipo: 'CALENDARIO_CAMBIO',
            titulo: 'Actividad reprogramada',
            mensaje: `La actividad ${evento.titulo} se realizará el ${fechaSolicitada}. Consulta la invitación y confirma tu asistencia.`,
            referencia: `/notificaciones?invitacion=${evento.id}`,
            permisoDestino: 'PANTALLA_CALENDARIO' as const,
            claveEvento: `CAL:${evento.id}:V${version}:${persona.usuarioId}`,
          })), tx)
      } else {
        const nuevoId = resolucion === 'OTRA_PERSONA' ? reemplazoId as number : null
        if (nuevoId !== null) {
          if (nuevoId === solicitud.solicitanteId || nuevosParticipantes.includes(nuevoId)) return 'REEMPLAZO_INVALIDO' as const
          const usuarioNuevo = await tx.usuario.findUnique({ where: { id: nuevoId }, select: { estado: true } })
          if (usuarioNuevo?.estado !== 'ACTIVO') return 'REEMPLAZO_INVALIDO' as const
          await verificarCruceInstitucional(tx, fechaVigente,
            { horaInicio: evento.horaInicio, horaFin: evento.horaFin }, [nuevoId], evento.id)
        }
        await tx.eventoInstitucionalParticipante.delete({
          where: { eventoId_usuarioId: { eventoId: evento.id, usuarioId: solicitud.solicitanteId } },
        })
        if (nuevoId !== null) await tx.eventoInstitucionalParticipante.create({
          data: { eventoId: evento.id, usuarioId: nuevoId, estadoInvitacion: 'PENDIENTE' },
        })
        const actualizado = await tx.eventoInstitucional.update({
          where: { id: evento.id }, data: { versionNotificacion: { increment: 1 } },
        })
        version = actualizado.versionNotificacion
        const participantesActuales = nuevosParticipantes.filter(id => id !== solicitud.solicitanteId)
        if (nuevoId !== null) participantesActuales.push(nuevoId)
        await actualizarRecordatorios(tx, 'CALENDARIO', evento.id, fechaVigente, participantesActuales,
          configGuardada(evento.recordatoriosConfig, fechaVigente))
        if (nuevoId !== null) await crearNotificacionesDeActividad([{
          usuarioId: nuevoId, tipo: 'INVITACION_EVENTO',
          titulo: 'Nueva invitación institucional',
          mensaje: `Te invitaron a ${evento.titulo} (${fechaVigente}).`,
          referencia: `/notificaciones?invitacion=${evento.id}`,
          permisoDestino: 'PANTALLA_CALENDARIO' as const,
          claveEvento: `CAL:${evento.id}:V${version}:${nuevoId}`,
        }], tx)
      }

      const anuladas = await tx.solicitudReprogramacionInvitacion.findMany({
        where: { eventoId: evento.id, estado: 'PENDIENTE', id: { not: solicitudId } },
        select: { solicitanteId: true },
      })
      await tx.solicitudReprogramacionInvitacion.updateMany({
        where: { eventoId: evento.id, estado: 'PENDIENTE', id: { not: solicitudId } },
        data: { estado: 'ANULADA', resueltoPorId: organizadorId, resueltoEn: hoy },
      })
      // Reabrir la respuesta de otros solicitantes al quedar obsoleta su propuesta.
      await tx.eventoInstitucionalParticipante.updateMany({
        where: { eventoId: evento.id, estadoInvitacion: 'REPROGRAMACION' },
        data: { estadoInvitacion: 'PENDIENTE', respondidaEn: null },
      })
      if (anuladas.length) await tx.notificacion.createMany({
        data: anuladas.map(item => ({
          usuarioId: item.solicitanteId, tipo: 'INVITACION_REPROGRAMACION_RESUELTA',
          titulo: 'Propuesta pendiente actualizada',
          mensaje: `La actividad ${evento.titulo} cambió mientras se revisaba tu propuesta. Consulta la invitación y responde nuevamente.`,
          referencia: `/notificaciones?invitacion=${evento.id}`,
        })),
      })
      await tx.solicitudReprogramacionInvitacion.update({
        where: { id: solicitudId }, data: {
          estado: estadoFinal,
          resolucion: esMantenimiento ? resolucion as 'OTRA_PERSONA' | 'SOLO_ORGANIZADOR' : null,
          reemplazoUsuarioId: esMantenimiento && resolucion === 'OTRA_PERSONA' ? reemplazoId as number : null,
          resueltoPorId: organizadorId, resueltoEn: hoy,
        },
      })
      await tx.notificacion.create({ data: {
        usuarioId: solicitud.solicitanteId,
        tipo: 'INVITACION_REPROGRAMACION_RESUELTA',
        titulo: esAprobacion ? 'Nueva fecha aceptada' : 'Fecha original confirmada',
        mensaje: esAprobacion
          ? `Se aprobó tu propuesta. La actividad ${evento.titulo} se realizará el ${fechaSolicitada}.`
          : `Gracias por la aclaración, pero la actividad ${evento.titulo} se realizará el ${fechaVigente}.`,
        referencia: '/notificaciones',
      } })
      return { id: solicitudId, estado: estadoFinal, sinCambios: false, fecha: esAprobacion ? fechaSolicitada : fechaVigente }
    })
    if (resultado === 'NO_EXISTE') { res.status(404).json({ error: 'Solicitud no encontrada.' }); return }
    if (resultado === 'SIN_PERMISO') { res.status(403).json({ error: 'Solo el creador puede resolver esta solicitud.' }); return }
    if (resultado === 'YA_RESUELTA') { res.status(409).json({ error: 'La solicitud ya fue resuelta con otra decisión.' }); return }
    if (resultado === 'DESACTUALIZADA') { res.status(409).json({ error: 'La actividad cambió y esta propuesta ya no está vigente.' }); return }
    if (resultado === 'FINALIZADO') { res.status(409).json({ error: 'La actividad ya finalizó.' }); return }
    if (resultado === 'FECHA_PASADA') { res.status(422).json({ error: 'La fecha propuesta ya pasó.' }); return }
    if (resultado === 'REEMPLAZO_INVALIDO') { res.status(422).json({ error: 'Selecciona otra persona activa que no participe en esta actividad.' }); return }
    res.json(resultado)
  } catch (error) {
    if (error instanceof ConflictoHorario) { res.status(409).json({ error: error.message }); return }
    console.error('Error resolviendo reprogramación:', error)
    res.status(503).json({ error: 'No se pudo resolver la reprogramación.' })
  }
})
