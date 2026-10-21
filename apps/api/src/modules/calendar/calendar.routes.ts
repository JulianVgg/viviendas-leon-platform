import { Router, type Request, type Response } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { esDireccionGeneral, requirePermission } from '../auth/require-permission.middleware.js'

export const calendarRouter = Router()
calendarRouter.use(requireAuth, requirePermission('PANTALLA_CALENDARIO'))

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
  return { titulo: title, categoria, descripcion, date, participantesIds: participants as number[] }
}

async function mayManage(req: Request, res: Response): Promise<boolean> {
  const user = req.session.userId ? await getAuthenticatedUser(req.session.userId) : null
  if (!user) { res.status(401).json({ error: 'Sesión inválida.' }); return false }
  const isCoord = user.roles.some(r => r.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'coordinadora del programa agroforestal')
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
        id: true, fecha: true, estado: true,
        familia: { select: { nombreReferencia: true, comunidad: { select: { nombre: true } } } },
        usuarioResponsable: { select: { nombre: true, apellido: true } },
      },
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
      take: 600,
    })
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({
      visitasTecnicas: visits.map(visit => ({
        id: visit.id,
        fecha: visit.fecha.toISOString().slice(0, 10),
        estado: visit.estado,
        familia: visit.familia.nombreReferencia,
        comunidad: visit.familia.comunidad.nombre,
        responsable: [visit.usuarioResponsable.nombre, visit.usuarioResponsable.apellido].filter(Boolean).join(' '),
      })),
      data: events.map(e => ({
      id: e.id, titulo: e.titulo, categoria: e.categoria, descripcion: e.descripcion ?? '', lugar: e.lugar ?? '',
      fechaInicio: e.fechaInicio.toISOString().slice(0, 10), fechaFin: e.fechaFin.toISOString().slice(0, 10),
      horaInicio: e.horaInicio, horaFin: e.horaFin,
      responsable: person(e.responsable), creadoPor: [e.creadoPor.nombre, e.creadoPor.apellido].filter(Boolean).join(' '),
      participantes: e.participantes.map(a => person(a.usuario)),
    })) })
  } catch (error) { console.error('Error consultando calendario:', error); res.status(503).json({ error: 'No se pudo consultar el calendario.' }) }
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
  // El responsable es el usuario autenticado que creó el evento, no un valor del formulario.
  const autorId = req.session.userId!
  try {
    if (!await usersValid([...new Set([autorId, ...data.participantesIds])])) {
      res.status(422).json({ error: 'Participantes inexistentes o inactivos.' }); return
    }
    const created = await getPrismaClient().eventoInstitucional.create({ data: {
      titulo: data.titulo, categoria: data.categoria, descripcion: data.descripcion || null, lugar: null,
      fechaInicio: new Date(`${data.date}T12:00:00Z`), fechaFin: new Date(`${data.date}T12:00:00Z`),
      horaInicio: null, horaFin: null, responsableId: autorId,
      creadoPorId: autorId,
      participantes: { create: data.participantesIds.map(usuarioId => ({ usuarioId })) },
    } })
    res.status(201).json({ accepted: true, id: created.id })
  } catch (error) { console.error('Error creando evento:', error); res.status(503).json({ error: 'No se pudo crear el evento.' }) }
})

calendarRouter.put('/:id', async (req: Request, res: Response) => {
  if (!await mayManage(req, res)) return
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
  const id = Number(req.params.id)
  const data = parseEvent(req.body)
  if (!Number.isSafeInteger(id) || id < 1 || !data) { res.status(400).json({ error: 'Evento o datos inválidos.' }); return }
  try {
    const prisma = getPrismaClient()
    if (!await usersValid(data.participantesIds)) {
      res.status(422).json({ error: 'Participantes inexistentes o inactivos.' }); return
    }
    const result = await prisma.$transaction(async tx => {
      const found = await tx.eventoInstitucional.findUnique({ where: { id }, select: { id: true } })
      if (!found) return false
      await tx.eventoInstitucional.update({ where: { id }, data: {
        titulo: data.titulo, categoria: data.categoria, descripcion: data.descripcion || null, lugar: null,
        fechaInicio: new Date(`${data.date}T12:00:00Z`), fechaFin: new Date(`${data.date}T12:00:00Z`),
        horaInicio: null, horaFin: null,
        // Mantiene al responsable original; quien edita no cambia la autoría.
        participantes: { deleteMany: {}, create: data.participantesIds.map(usuarioId => ({ usuarioId })) },
      } })
      return true
    })
    if (!result) { res.status(404).json({ error: 'Evento no encontrado.' }); return }
    res.json({ accepted: true })
  } catch (error) { console.error('Error editando evento:', error); res.status(503).json({ error: 'No se pudo actualizar el evento.' }) }
})

calendarRouter.delete('/:id', async (req: Request, res: Response) => {
  if (!await mayManage(req, res)) return
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') { res.status(403).json({ error: 'Solicitud no autorizada.' }); return }
  const id = Number(req.params.id)
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: 'Evento inválido.' }); return }
  try {
    const deleted = await getPrismaClient().eventoInstitucional.deleteMany({ where: { id } })
    if (!deleted.count) { res.status(404).json({ error: 'Evento no encontrado.' }); return }
    res.json({ accepted: true })
  } catch (error) { console.error('Error eliminando evento:', error); res.status(503).json({ error: 'No se pudo eliminar el evento.' }) }
})
