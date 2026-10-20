import { Router, type Request, type Response } from 'express'
import { getPrismaClient } from '../../config/prisma.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { getAuthenticatedUser } from '../auth/auth.service.js'
import { esDireccionGeneral, requirePermission } from '../auth/require-permission.middleware.js'

export const calendarRouter = Router()
calendarRouter.use(requireAuth, requirePermission('PANTALLA_CALENDARIO'))

const choices = ['SOPORTE', 'CAPACITACION', 'OFICINA', 'VISITA', 'LOGISTICA', 'REUNION', 'OTRO'] as const
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const hourPattern = /^([01]\d|2[0-3]):[0-5]\d$/
const isoDate = (s: string) => datePattern.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`)) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s
const noHtml = (v: unknown, max: number): string | null => typeof v === 'string' ? v.trim().slice(0, max) : null

const personSelect = { id: true, nombre: true, apellido: true, roles: { where: { rol: { activo: true } }, select: { rol: { select: { nombre: true } } } } } as const
const person = (user: { id: number; nombre: string; apellido: string | null; roles: { rol: { nombre: string } }[] }) => ({
  id: user.id, nombre: [user.nombre, user.apellido].filter(Boolean).join(' '), cargos: user.roles.map(r => r.rol.nombre),
})
const eventIncludes = {
  responsable: { select: personSelect },
  creadoPor: { select: { id: true, nombre: true, apellido: true } },
  participantes: { include: { usuario: { select: personSelect } } },
} as const

function parseEvent(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const p = input as Record<string, unknown>
  const titulo = noHtml(p.titulo, 160)
  const categoria = p.categoria
  const fechaInicio = p.fechaInicio
  const fechaFin = p.fechaFin
  const horaInicio = p.horaInicio === '' || p.horaInicio == null ? null : p.horaInicio
  const horaFin = p.horaFin === '' || p.horaFin == null ? null : p.horaFin
  const descripcion = p.descripcion == null ? '' : noHtml(p.descripcion, 2000)
  const lugar = p.lugar == null ? '' : noHtml(p.lugar, 180)
  const responsableId = p.responsableId
  const participantesIds = p.participantesIds
  if (!titulo || !choices.includes(categoria as (typeof choices)[number]) ||
      typeof fechaInicio !== 'string' || !isoDate(fechaInicio) ||
      typeof fechaFin !== 'string' || !isoDate(fechaFin) || fechaInicio > fechaFin ||
      (horaInicio !== null && (typeof horaInicio !== 'string' || !hourPattern.test(horaInicio))) ||
      (horaFin !== null && (typeof horaFin !== 'string' || !hourPattern.test(horaFin))) ||
      ((horaInicio === null) !== (horaFin === null)) ||
      (typeof horaInicio === 'string' && typeof horaFin === 'string' && horaInicio >= horaFin) ||
      !Number.isSafeInteger(responsableId) || Number(responsableId) < 1 ||
      typeof descripcion !== 'string' || typeof lugar !== 'string' ||
      !Array.isArray(participantesIds) || participantesIds.length > 50 ||
      !participantesIds.every((id) => Number.isSafeInteger(id) && id > 0) ||
      new Set(participantesIds).size !== participantesIds.length) return null
  return { titulo, categoria: String(categoria), fechaInicio, fechaFin,
    horaInicio: horaInicio as string | null, horaFin: horaFin as string | null,
    lugar, descripcion, responsableId: Number(responsableId), participantesIds: participantesIds as number[] }
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
    res.setHeader('Cache-Control', 'private, no-store')
    res.json({ data: events.map(e => ({
      id: e.id, titulo: e.titulo, categoria: e.categoria, descripcion: e.descripcion ?? '', lugar: e.lugar ?? '',
      fechaInicio: e.fechaInicio.toISOString().slice(0, 10), fechaFin: e.fechaFin.toISOString().slice(0, 10),
      horaInicio: e.horaInicio, horaFin: e.horaFin,
      responsable: person(e.responsable), creadoPor: [e.creadoPor.nombre, e.creadoPor.apellido].filter(Boolean).join(' '),
      participantes: e.participantes.map(a => person(a.usuario)),
    })) })
  } catch (error) { console.error('Error consultando calendario:', error); res.status(503).json({ error: 'No se pudo consultar el calendario.' }) }
})

// Director y Coordinadora ven usuarios activos para escoger responsable y asistentes.
calendarRouter.get('/usuarios', async (_req: Request, res: Response) => {
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
  const ids = [...new Set([data.responsableId, ...data.participantesIds])]
  try {
    if (!await usersValid(ids)) { res.status(422).json({ error: 'Responsable o participantes inexistentes/inactivos.' }); return }
    const created = await getPrismaClient().eventoInstitucional.create({ data: {
      titulo: data.titulo, categoria: data.categoria, descripcion: data.descripcion || null, lugar: data.lugar || null,
      fechaInicio: new Date(`${data.fechaInicio}T12:00:00Z`), fechaFin: new Date(`${data.fechaFin}T12:00:00Z`),
      horaInicio: data.horaInicio, horaFin: data.horaFin, responsableId: data.responsableId,
      creadoPorId: req.session.userId!,
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
    if (!await usersValid([...new Set([data.responsableId, ...data.participantesIds])])) {
      res.status(422).json({ error: 'Responsable o participantes inexistentes/inactivos.' }); return
    }
    const result = await prisma.$transaction(async tx => {
      const found = await tx.eventoInstitucional.findUnique({ where: { id }, select: { id: true } })
      if (!found) return false
      await tx.eventoInstitucional.update({ where: { id }, data: {
        titulo: data.titulo, categoria: data.categoria, descripcion: data.descripcion || null, lugar: data.lugar || null,
        fechaInicio: new Date(`${data.fechaInicio}T12:00:00Z`), fechaFin: new Date(`${data.fechaFin}T12:00:00Z`),
        horaInicio: data.horaInicio, horaFin: data.horaFin, responsableId: data.responsableId,
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
