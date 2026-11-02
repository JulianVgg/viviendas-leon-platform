import { Router, type Request, type Response } from 'express'
import { Prisma } from '../../generated/prisma/client.js'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { esDireccionGeneral } from '../auth/require-permission.middleware.js'
import { crearNotificacionesDeActividad, type AvisoActividad } from '../notifications/notifications.service.js'
import { actualizarRecordatorios, cancelarRecordatorios, configGuardada, configParaPrisma, parseReglas } from '../notifications/reminders.service.js'
import { descripcionAvisoCalendario, eventoTieneCambios, planificarCambioCalendario, type EventoResumen, type TipoAvisoCalendario } from '../notifications/notifications.activity.js'
import { eventoYaFinalizo } from './event-history.js'
import { fechaAnteriorAHoy } from './guatemala-date.js'
import { horariosSeCruzan, interpretarHorario, type HorarioEvento } from './calendar-schedule.rules.js'

export const calendarRouter = Router()
calendarRouter.use(requireAuth)
// El calendario institucional es una herramienta de supervisión: ninguna otra cuenta
// puede consultar su contenido, incluso si conserva un permiso histórico de pantalla.
function esCoordinacion(roles: string[]): boolean {
  return roles.some(rol => {
    const nombre = rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
    return ['coordinadora del programa agroforestal', 'coordinador del programa agroforestal', 'coordinacion'].includes(nombre)
  })
}
calendarRouter.use(async (req: Request, res: Response, next) => {
  try {
    const usuario = req.session.userId ? await getAuthenticatedUser(req.session.userId) : null
    if (!usuario) { res.status(401).json({ error: 'Sesión inválida.' }); return }
    if (!esDireccionGeneral(usuario.roles) && !esCoordinacion(usuario.roles)) {
      res.status(403).json({ error: 'Acceso reservado a Dirección y Coordinación.' }); return
    }
    next()
  } catch (error) { next(error) }
})

// Tipos institucionales. Las claves históricas se aceptan para compatibilidad.
const names: Record<string, string> = {
  SOPORTE: 'Visita de soporte técnico',
  CAPACITACION: 'Capacitación',
  OFICINA_PANAJACHEL: 'Oficina Panajachel',
  VISITA_ESTUDIANTES: 'Visita de estudiantes',
  HOME_OFFICE: 'Home Office',
  COMPRA_RECOLECCION: 'Compra y recolección',
  ENTREGA_PILONES: 'Entrega de pilones',
}
const legacy = ['OFICINA', 'VISITA', 'LOGISTICA', 'REUNION']
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const isoDate = (value: string) => datePattern.test(value) &&
  !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
  new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
const noHtml = (value: unknown, max: number): string | null =>
  typeof value === 'string' ? value.trim().slice(0, max) : null

const personSelect = {
  id: true, nombre: true, apellido: true,
  roles: { where: { rol: { activo: true } }, select: { rol: { select: { nombre: true } } } },
} as const
const person = (user: { id: number; nombre: string; apellido: string | null; roles: { rol: { nombre: string } }[] }) => ({
  id: user.id, nombre: [user.nombre, user.apellido].filter(Boolean).join(' '), cargos: user.roles.map(role => role.rol.nombre),
})
const eventIncludes = {
  responsable: { select: personSelect },
  creadoPor: { select: { id: true, nombre: true, apellido: true } },
  participantes: { include: { usuario: { select: personSelect } } },
} as const

function parseEvent(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const data = input as Record<string, unknown>
  const categoria = data.categoria
  const date = data.fechaInicio
  const customTitle = noHtml(data.titulo, 160)
  const title = typeof categoria === 'string' && names[categoria]
    ? names[categoria]
    : customTitle
  const descripcion = data.descripcion == null ? '' : noHtml(data.descripcion, 2000)
  const participants = data.participantesIds
  if (typeof categoria !== 'string' || !(categoria === 'OTRO' || categoria in names || legacy.includes(categoria)) ||
      !title || typeof date !== 'string' || !isoDate(date) ||
      typeof descripcion !== 'string' ||
      !Array.isArray(participants) || participants.length > 300 ||
      !participants.every(id => Number.isSafeInteger(id) && id > 0) ||
      new Set(participants).size !== participants.length) return null
  const horario = interpretarHorario(data.todoElDia, data.horaInicio, data.horaFin)
  if (!horario) return null
  const recordatorios = parseReglas(data.recordatorios, date)
  if (recordatorios === undefined) return null
  return { titulo: title, categoria, descripcion, date, participantesIds: participants as number[], recordatorios, ...horario }
}

// Serializa asignaciones del mismo día entre procesos distintos. Las visitas técnicas
// tienen agenda propia y no participan en esta validación institucional.
class ConflictoHorario extends Error {
  constructor() { super('Uno o más participantes ya tienen otro evento en ese horario.') }
}
type TxCalendario = Prisma.TransactionClient
async function verificarCruceInstitucional(tx: TxCalendario, fecha: string, horario: HorarioEvento,
  participantesIds: number[], exceptId?: number) {
  if (!participantesIds.length) return
  const dayNumber = Math.floor(Date.parse(`${fecha}T00:00:00Z`) / 86400000)
  // pg_advisory_xact_lock(2 x int4): libera el bloqueo al completar la transacción.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(${81315}, ${dayNumber})::text`
  const existentes = await tx.eventoInstitucional.findMany({
    where: {
      fechaInicio: new Date(`${fecha}T12:00:00Z`),
      ...(exceptId ? { id: { not: exceptId } } : {}),
      participantes: { some: { usuarioId: { in: participantesIds }, estadoInvitacion: { not: 'RECHAZADA' } } },
    },
    select: { horaInicio: true, horaFin: true },
  })
  if (existentes.some(evento => horariosSeCruzan(horario, evento))) throw new ConflictoHorario()
}

// El destinatario se determina en el servidor a partir de participantes reales.
function avisoCalendario(eventoId: number, version: string, usuarioId: number,
  tipo: TipoAvisoCalendario, evento: EventoResumen): AvisoActividad {
  const nuevaInvitacion = tipo === 'CALENDARIO_ASIGNACION'
  return {
    usuarioId,
    tipo: nuevaInvitacion ? 'INVITACION_EVENTO' : tipo,
    ...(nuevaInvitacion
      ? { titulo: 'Nueva invitación institucional', mensaje: `Te invitaron a ${evento.titulo} (${evento.fecha}).` }
      : descripcionAvisoCalendario(tipo, evento)),
    referencia: nuevaInvitacion ? '/notificaciones' : '/calendario',
    permisoDestino: 'PANTALLA_CALENDARIO',
    claveEvento: `CAL:${eventoId}:${version}:${usuarioId}`,
  }
}

async function mayManage(req: Request, res: Response): Promise<boolean> {
  const user = req.session.userId ? await getAuthenticatedUser(req.session.userId) : null
  if (!user) { res.status(401).json({ error: 'Sesión inválida.' }); return false }
  const isCoord = esCoordinacion(user.roles)
  if (!esDireccionGeneral(user.roles) && !isCoord) {
    res.status(403).json({ error: 'Solo Dirección general o Coordinación puede modificar el calendario institucional.' })
    return false
  }
  return true
}

// Vista institucional para cualquier cuenta con PANTALLA_CALENDARIO.
calendarRouter.get('/', async (req: Request, res: Response) => {
  const from = String(req.query.from ?? '')
  const to = String(req.query.to ?? '')
  if (!isoDate(from) || !isoDate(to) || to < from || (Date.parse(to) - Date.parse(from) > 370 * 86400000)) {
    res.status(400).json({ error: 'Rango de calendario inválido.' }); return
  }
  try {
    const events = await getPrismaClient().eventoInstitucional.findMany({
      where: { fechaInicio: { lte: new Date(`${to}T12:00:00Z`) }, fechaFin: { gte: new Date(`${from}T12:00:00Z`) } },
      include: eventIncludes,
      orderBy: [{ fechaInicio: 'asc' }, { id: 'asc' }], take: 600,
    })
    // La agenda técnica es la fuente única: NO se crea otro evento institucional.
    // Consulta únicamente fecha, familia, comunidad, responsable y estado.
    // Nunca se devuelven evaluaciones, observaciones, evidencias ni compromisos.
    const visits = await getPrismaClient().visita.findMany({
      where: {
        fecha: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T23:59:59Z`) },
        estado: { in: ['PROGRAMADA', 'REALIZADA'] },
      },
      select: {
        id: true, fecha: true, estado: true, horaInicio: true, horaFin: true,
        familia: { select: { nombreReferencia: true, comunidad: { select: { nombre: true } } } },
        usuarioResponsable: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
      take: 600,
    })
    // Vista de solo lectura: las capacitaciones permanecen en su tabla original.
    // No se incluyen asistentes, fotografías ni observaciones internas.
    const trainings = await getPrismaClient().capacitacion.findMany({
      where: {
        fecha: {
          gte: new Date(`${from}T00:00:00Z`),
          lte: new Date(`${to}T23:59:59Z`),
        },
      },
      select: {
        id: true, tema: true, fecha: true, estado: true, horaInicio: true, horaFin: true,
        facilitadorNombre: true,
        comunidad: { select: { nombre: true } },
      },
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
      take: 600,
    })
    res.setHeader('Cache-Control', 'private, no-store')
    const hora = (valor: Date | null) => valor
      ? `${String(valor.getUTCHours()).padStart(2, '0')}:${String(valor.getUTCMinutes()).padStart(2, '0')}` : null
    res.json({
      capacitaciones: trainings.map(training => ({
        id: training.id,
        tema: training.tema,
        fecha: training.fecha.toISOString().slice(0, 10),
        estado: training.estado,
        horaInicio: hora(training.horaInicio), horaFin: hora(training.horaFin),
        facilitador: training.facilitadorNombre ?? '',
        comunidad: training.comunidad?.nombre ?? '',
      })),
      visitasTecnicas: visits.map(visit => ({
        id: visit.id,
        fecha: visit.fecha.toISOString().slice(0, 10),
        estado: visit.estado,
        horaInicio: hora(visit.horaInicio), horaFin: hora(visit.horaFin),
        familia: visit.familia.nombreReferencia,
        comunidad: visit.familia.comunidad.nombre,
        responsable: [visit.usuarioResponsable.nombre, visit.usuarioResponsable.apellido].filter(Boolean).join(' '),
        responsableId: visit.usuarioResponsable.id,
      })),
      data: events.map(e => ({
      id: e.id, titulo: e.titulo, categoria: e.categoria, descripcion: e.descripcion ?? '', lugar: e.lugar ?? '',
      fechaInicio: e.fechaInicio.toISOString().slice(0, 10), fechaFin: e.fechaFin.toISOString().slice(0, 10),
      horaInicio: e.horaInicio, horaFin: e.horaFin,
      responsable: person(e.responsable), creadoPor: [e.creadoPor.nombre, e.creadoPor.apellido].filter(Boolean).join(' '),
      participantes: e.participantes.map(a => person(a.usuario)),
      recordatorios: configGuardada(e.recordatoriosConfig, e.fechaInicio.toISOString().slice(0, 10)),
    })) })
  } catch (error) { console.error('Error consultando calendario:', error); res.status(503).json({ error: 'No se pudo consultar el calendario.' }) }
})

// Consulta detallada bajo demanda. Los resúmenes mensuales siguen sin exponer datos privados.
// Solo Dirección y Coordinación pueden acceder; la ruta es exclusivamente GET.
calendarRouter.get('/visitas/:id/detalle', async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id <= 0) { res.status(400).json({ error: 'Visita inválida.' }); return }
  try {
    const visit = await getPrismaClient().visita.findUnique({
      where: { id },
      include: {
        familia: { select: { id: true, nombreReferencia: true, comunidad: { select: { nombre: true } } } },
        usuarioResponsable: { select: { id: true, nombre: true, apellido: true } },
        captura: { select: { operationId: true, datos: true } },
        evidencias: { select: { evidencia: { select: { id: true, nombreArchivo: true } } } },
        compromisosVisita: { select: { id: true, texto: true, estado: true, fechaLimite: true, responsable: true }, orderBy: { creadoEn: 'asc' } },
        reprogramaciones: { select: { id: true, fechaAnterior: true, fechaNueva: true, motivo: true, usuarioId: true, creadoEn: true }, orderBy: { creadoEn: 'asc' } },
      },
    })
    if (!visit) { res.status(404).json({ error: 'La visita no existe.' }); return }
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: {
      id: visit.id,
      operationId: visit.captura?.operationId ?? null,
      date: visit.fecha.toISOString().slice(0, 10), status: visit.estado,
      responsibleUserId: visit.usuarioResponsable.id,
      responsibleName: [visit.usuarioResponsable.nombre, visit.usuarioResponsable.apellido].filter(Boolean).join(' '),
      familyId: visit.familia.id, familyName: visit.familia.nombreReferencia,
      community: visit.familia.comunidad.nombre,
      capture: visit.captura?.datos ?? null,
      evidences: visit.evidencias.map(item => ({ id: item.evidencia.id, name: item.evidencia.nombreArchivo,
        url: `/api/v1/visitas/${visit.id}/evidencias/${item.evidencia.id}` })),
      followUps: visit.compromisosVisita.map(item => ({ id: item.id, text: item.texto, status: item.estado,
        due: item.fechaLimite?.toISOString().slice(0, 10) ?? null, category: item.responsable })),
      reprogramaciones: visit.reprogramaciones.map(item => ({ id: item.id,
        oldDate: item.fechaAnterior.toISOString().slice(0, 10), newDate: item.fechaNueva.toISOString().slice(0, 10),
        actorId: item.usuarioId, reason: item.motivo, at: item.creadoEn.toISOString() })),
    } })
  } catch (error) {
    console.error('Error consultando detalle de visita para supervisión:', error)
    res.status(503).json({ error: 'No se pudo consultar el detalle de la visita.' })
  }
})

// Los participantes se enumeran únicamente para Dirección y Coordinación.
calendarRouter.get('/usuarios', async (req: Request, res: Response) => {
  if (!await mayManage(req, res)) return
  try {
    const users = await getPrismaClient().usuario.findMany({ where: { estado: 'ACTIVO' },
      select: personSelect, orderBy: [{ nombre: 'asc' }, { id: 'asc' }], take: 300 })
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: users.map(person) })
  } catch (error) { console.error('Error consultando usuarios para calendario:', error); res.status(503).json({ error: 'No se pudieron consultar los participantes.' }) }
})

async function usersValid(ids: number[]): Promise<boolean> {
  const count = await getPrismaClient().usuario.count({ where: { id: { in: ids }, estado: 'ACTIVO' } })
  return count === ids.length
}

calendarRouter.post('/', async (req: Request, res: Response) => {
  if (!await mayManage(req, res)) return
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
  const data = parseEvent(req.body)
  if (!data) { res.status(400).json({ error: 'Revisa los datos del evento.' }); return }
  if (fechaAnteriorAHoy(data.date)) { res.status(422).json({ error: 'La fecha no puede ser anterior a hoy.' }); return }
  const operationId = req.get('X-Operation-Id')?.toLowerCase() ?? null
  if (operationId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(operationId)) {
    res.status(400).json({ error: 'X-Operation-Id debe ser un UUID v4.' }); return
  }
  // El responsable es el usuario autenticado que creó el evento, no un valor del formulario.
  const autorId = req.session.userId!
  try {
    if (!await usersValid([...new Set([autorId, ...data.participantesIds])])) {
      res.status(422).json({ error: 'Participantes inexistentes o inactivos.' }); return
    }
    const prisma = getPrismaClient()
    const created = await prisma.$transaction(async tx => {
      // Reintentos con el mismo identificador no insertan otro evento.
      if (operationId) {
        const previo = await tx.eventoInstitucional.findUnique({
          where: { operacionCreacionId: operationId },
          include: { participantes: { select: { usuarioId: true } } },
        })
        if (previo) {
          const mismosDatos = previo.creadoPorId === autorId && previo.titulo === data.titulo &&
            previo.categoria === data.categoria && (previo.descripcion ?? '') === data.descripcion &&
            previo.fechaInicio.toISOString().slice(0, 10) === data.date &&
            previo.horaInicio === data.horaInicio && previo.horaFin === data.horaFin &&
            previo.participantes.length === data.participantesIds.length &&
            previo.participantes.every(p => data.participantesIds.includes(p.usuarioId)) &&
            JSON.stringify(configGuardada(previo.recordatoriosConfig, data.date)) === JSON.stringify(data.recordatorios)
          if (!mismosDatos) throw new Error('CALENDAR_OPERATION_CONFLICT')
          return { id: previo.id, duplicate: true }
        }
      }
      await verificarCruceInstitucional(tx, data.date, data, data.participantesIds)
      const evento = await tx.eventoInstitucional.create({ data: {
        titulo: data.titulo, categoria: data.categoria, descripcion: data.descripcion || null, lugar: null,
        fechaInicio: new Date(`${data.date}T12:00:00Z`), fechaFin: new Date(`${data.date}T12:00:00Z`),
        horaInicio: data.horaInicio, horaFin: data.horaFin, responsableId: autorId,
        creadoPorId: autorId, operacionCreacionId: operationId, recordatoriosConfig: configParaPrisma(data.recordatorios),
        participantes: { create: data.participantesIds.map(usuarioId => ({ usuarioId, estadoInvitacion: 'PENDIENTE' })) },
      } })
      const resumen: EventoResumen = { titulo: data.titulo, categoria: data.categoria,
        descripcion: data.descripcion || null, fecha: data.date, horaInicio: data.horaInicio, horaFin: data.horaFin, participantesIds: data.participantesIds }
      await actualizarRecordatorios(tx, 'CALENDARIO', evento.id, data.date, data.participantesIds, data.recordatorios)
      await crearNotificacionesDeActividad(data.participantesIds.map(usuarioId =>
        avisoCalendario(evento.id, 'CREACION', usuarioId, 'CALENDARIO_ASIGNACION', resumen)), tx)
      return { id: evento.id, duplicate: false }
    })
    res.status(created.duplicate ? 200 : 201).json({ accepted: true, id: created.id, duplicate: created.duplicate })
  } catch (error) {
    if (error instanceof ConflictoHorario) { res.status(409).json({ error: error.message }); return }
    if (error instanceof Error && error.message === 'CALENDAR_OPERATION_CONFLICT') {
      res.status(409).json({ error: 'Este identificador de operación ya corresponde a otro evento.' }); return
    }
    // Dos POST paralelos con el mismo UUID: solo uno puede insertar la fila.
    if (operationId && error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const previo = await getPrismaClient().eventoInstitucional.findUnique({
        where: { operacionCreacionId: operationId },
        include: { participantes: { select: { usuarioId: true } } },
      })
      if (previo && previo.creadoPorId === autorId && previo.titulo === data.titulo &&
          previo.categoria === data.categoria && (previo.descripcion ?? '') === data.descripcion &&
          previo.fechaInicio.toISOString().slice(0, 10) === data.date &&
          previo.participantes.length === data.participantesIds.length &&
          previo.participantes.every(p => data.participantesIds.includes(p.usuarioId)) &&
          previo.horaInicio === data.horaInicio && previo.horaFin === data.horaFin &&
          JSON.stringify(configGuardada(previo.recordatoriosConfig, data.date)) === JSON.stringify(data.recordatorios)) {
        res.status(200).json({ accepted: true, id: previo.id, duplicate: true }); return
      }
      res.status(409).json({ error: 'El identificador de la operación ya fue utilizado.' }); return
    }
    console.error('Error creando evento:', error)
    res.status(503).json({ error: 'No se pudo crear el evento.' })
  }
})

calendarRouter.put('/:id', async (req: Request, res: Response) => {
  if (!await mayManage(req, res)) return
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
  const id = Number(req.params.id)
  const data = parseEvent(req.body)
  if (!Number.isSafeInteger(id) || id < 1 || !data) { res.status(400).json({ error: 'Evento o datos inválidos.' }); return }
  if (fechaAnteriorAHoy(data.date)) { res.status(422).json({ error: 'La fecha no puede ser anterior a hoy.' }); return }
  try {
    const prisma = getPrismaClient()
    if (!await usersValid(data.participantesIds)) {
      res.status(422).json({ error: 'Participantes inexistentes o inactivos.' }); return
    }
    const result = await prisma.$transaction(async tx => {
      // Bloquea este evento hasta terminar. Dos PUT simultáneos con el mismo
      // contenido no pueden producir avisos duplicados.
      await tx.$queryRaw`SELECT "id" FROM "evento_institucional" WHERE "id" = ${id} FOR UPDATE`
      const found = await tx.eventoInstitucional.findUnique({
        where: { id }, include: { participantes: { select: { usuarioId: true } } },
      })
      if (!found) return false
      // Los eventos finalizados son historial inmutable, incluso para Dirección.
      if (eventoYaFinalizo(found.fechaFin)) return 'FINALIZADO' as const
      const antes: EventoResumen = {
        titulo: found.titulo, categoria: found.categoria,
        descripcion: found.descripcion, fecha: found.fechaInicio.toISOString().slice(0, 10),
        horaInicio: found.horaInicio, horaFin: found.horaFin,
        participantesIds: found.participantes.map(participante => participante.usuarioId),
      }
      const despues: EventoResumen = {
        titulo: data.titulo, categoria: data.categoria, descripcion: data.descripcion || null,
        fecha: data.date, horaInicio: data.horaInicio, horaFin: data.horaFin, participantesIds: data.participantesIds,
      }
      const cambios = planificarCambioCalendario(antes, despues)
      const recordatoriosAntes = configGuardada(found.recordatoriosConfig, antes.fecha)
      if (!eventoTieneCambios(antes, despues) && JSON.stringify(recordatoriosAntes) === JSON.stringify(data.recordatorios)) return true // PUT idempotente.
      await verificarCruceInstitucional(tx, data.date, data, data.participantesIds, id)
      const actualizado = await tx.eventoInstitucional.update({ where: { id }, data: {
        titulo: data.titulo, categoria: data.categoria, descripcion: data.descripcion || null, lugar: null,
        fechaInicio: new Date(`${data.date}T12:00:00Z`), fechaFin: new Date(`${data.date}T12:00:00Z`),
        horaInicio: data.horaInicio, horaFin: data.horaFin, versionNotificacion: { increment: 1 },
        recordatoriosConfig: configParaPrisma(data.recordatorios),
        // Mantiene al responsable original y las respuestas de quienes siguen invitados.
        participantes: {
          deleteMany: data.participantesIds.length ? { usuarioId: { notIn: data.participantesIds } } : {},
          create: data.participantesIds
            .filter(usuarioId => !antes.participantesIds.includes(usuarioId))
            .map(usuarioId => ({ usuarioId, estadoInvitacion: 'PENDIENTE' })),
        },
      } })
      await actualizarRecordatorios(tx, 'CALENDARIO', id, data.date, data.participantesIds, data.recordatorios)
      await crearNotificacionesDeActividad(cambios.map(cambio =>
        avisoCalendario(id, `V${actualizado.versionNotificacion}`, cambio.usuarioId, cambio.tipo,
          cambio.tipo === 'CALENDARIO_DESASIGNACION' ? antes : despues)), tx)
      return true
    })
    if (result === 'FINALIZADO') { res.status(409).json({ error: 'Este evento ya finalizó y solo puede consultarse.' }); return }
    if (!result) { res.status(404).json({ error: 'Evento no encontrado.' }); return }
    res.json({ accepted: true })
  } catch (error) {
    if (error instanceof ConflictoHorario) { res.status(409).json({ error: error.message }); return }
    console.error('Error editando evento:', error); res.status(503).json({ error: 'No se pudo actualizar el evento.' })
  }
})

calendarRouter.delete('/:id', async (req: Request, res: Response) => {
  if (!await mayManage(req, res)) return
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: 'Evento inválido.' }); return }
  try {
    const eliminado = await getPrismaClient().$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "evento_institucional" WHERE "id" = ${id} FOR UPDATE`
      const evento = await tx.eventoInstitucional.findUnique({
        where: { id }, include: { participantes: { select: { usuarioId: true } } },
      })
      if (!evento) return false
      if (eventoYaFinalizo(evento.fechaFin)) return 'FINALIZADO' as const
      const resumen: EventoResumen = {
        titulo: evento.titulo, categoria: evento.categoria, descripcion: evento.descripcion,
        fecha: evento.fechaInicio.toISOString().slice(0, 10),
        participantesIds: evento.participantes.map(participante => participante.usuarioId),
      }
      await cancelarRecordatorios(tx, 'CALENDARIO', id)
      await tx.eventoInstitucional.delete({ where: { id } })
      await crearNotificacionesDeActividad(resumen.participantesIds.map(usuarioId =>
        avisoCalendario(id, 'CANCELACION', usuarioId, 'CALENDARIO_CANCELACION', resumen)), tx)
      return true
    })
    if (eliminado === 'FINALIZADO') { res.status(409).json({ error: 'Este evento ya finalizó y no puede eliminarse.' }); return }
    if (!eliminado) { res.status(404).json({ error: 'Evento no encontrado.' }); return }
    res.json({ accepted: true })
  } catch (error) { console.error('Error eliminando evento:', error); res.status(503).json({ error: 'No se pudo eliminar el evento.' }) }
})
