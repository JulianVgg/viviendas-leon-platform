import { getPrismaClient } from '../../config/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type { CommunityInput, FieldError } from './communities.validation.js'

export class CommunityError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409,
    public readonly code: string,
    message: string,
    public readonly details: FieldError[] = [],
  ) {
    super(message)
  }
}

function notFound(): never {
  throw new CommunityError(404, 'COMMUNITY_NOT_FOUND', 'La comunidad solicitada no existe.')
}

// Bloquea el municipio para serializar altas y cambios de nombre dentro del mismo
// territorio. Así también se impide que se desactive durante la validación.
async function requireActiveMunicipality(tx: Prisma.TransactionClient, municipioId: number) {
  const rows = await tx.$queryRaw<Array<{ id: number }>>`
    SELECT id FROM municipio WHERE id = ${municipioId} AND activo = true FOR UPDATE
  `
  if (!rows.length) {
    throw new CommunityError(400, 'INVALID_MUNICIPALITY', 'El municipio debe existir y estar activo.', [
      { field: 'municipioId', message: 'Selecciona un municipio activo.' },
    ])
  }
}

async function ensureUniqueName(tx: Prisma.TransactionClient, data: CommunityInput, exceptId?: number) {
  const duplicate = await tx.comunidad.findFirst({
    where: {
      municipioId: data.municipioId,
      nombre: { equals: data.nombre, mode: 'insensitive' },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  })
  if (duplicate) {
    throw new CommunityError(409, 'DUPLICATE_COMMUNITY', 'Ya existe una comunidad con este nombre en el municipio.', [
      { field: 'nombre', message: 'Utiliza un nombre diferente.' },
    ])
  }
}

const selectCommunity = {
  id: true,
  nombre: true,
  activo: true,
  municipio: { select: { id: true, nombre: true, activo: true } },
  _count: { select: { familias: true, capacitaciones: true } },
} satisfies Prisma.ComunidadSelect

function formatCommunity(record: Prisma.ComunidadGetPayload<{ select: typeof selectCommunity }>) {
  const { _count, ...rest } = record
  return { ...rest, familiasCount: _count.familias, capacitacionesCount: _count.capacitaciones }
}

export async function listCommunitiesForAdmin() {
  const records = await getPrismaClient().comunidad.findMany({
    orderBy: [{ municipio: { nombre: 'asc' } }, { nombre: 'asc' }, { id: 'asc' }],
    select: selectCommunity,
  })
  return records.map(formatCommunity)
}

export async function createCommunity(data: CommunityInput, userId: number) {
  return getPrismaClient().$transaction(async (tx) => {
    await requireActiveMunicipality(tx, data.municipioId)
    await ensureUniqueName(tx, data)
    const created = await tx.comunidad.create({
      data: { ...data, activo: true },
      select: selectCommunity,
    })
    await tx.bitacora.create({ data: {
      usuarioId: userId,
      entidad: 'comunidad',
      registroId: String(created.id),
      accion: 'CREATE',
      fecha: new Date(),
      datosNuevos: JSON.stringify(data),
      descripcion: 'Registro de comunidad.',
    } })
    return formatCommunity(created)
  })
}

export async function updateCommunity(id: number, data: CommunityInput, userId: number) {
  return getPrismaClient().$transaction(async (tx) => {
    const existing = await tx.$queryRaw<Array<{ id: number; nombre: string; municipio_id: number; activo: boolean }>>`
      SELECT id, nombre, municipio_id, activo FROM comunidad WHERE id = ${id} FOR UPDATE
    `
    if (!existing.length) return notFound()
    await requireActiveMunicipality(tx, data.municipioId)
    await ensureUniqueName(tx, data, id)
    const updated = await tx.comunidad.update({ where: { id }, data, select: selectCommunity })
    await tx.bitacora.create({ data: {
      usuarioId: userId,
      entidad: 'comunidad',
      registroId: String(id),
      accion: 'UPDATE',
      fecha: new Date(),
      datosAnteriores: JSON.stringify(existing[0]),
      datosNuevos: JSON.stringify(data),
      descripcion: 'Actualización de comunidad.',
    } })
    return formatCommunity(updated)
  })
}

export async function changeCommunityState(id: number, activo: boolean, userId: number) {
  return getPrismaClient().$transaction(async (tx) => {
    const existing = await tx.$queryRaw<Array<{ id: number; municipio_id: number; activo: boolean }>>`
      SELECT id, municipio_id, activo FROM comunidad WHERE id = ${id} FOR UPDATE
    `
    if (!existing.length) return notFound()
    if (activo) await requireActiveMunicipality(tx, existing[0].municipio_id)
    if (!activo && existing[0].activo) {
      const activeFamilies = await tx.familia.count({ where: { comunidadId: id, estado: 'ACTIVA' } })
      if (activeFamilies > 0) {
        throw new CommunityError(409, 'COMMUNITY_HAS_ACTIVE_FAMILIES', 'La comunidad tiene familias activas. Reasígnalas antes de desactivarla.')
      }
    }
    if (existing[0].activo === activo) {
      return formatCommunity(await tx.comunidad.findUniqueOrThrow({ where: { id }, select: selectCommunity }))
    }
    const updated = await tx.comunidad.update({ where: { id }, data: { activo }, select: selectCommunity })
    await tx.bitacora.create({ data: {
      usuarioId: userId,
      entidad: 'comunidad',
      registroId: String(id),
      accion: activo ? 'ACTIVATE' : 'DEACTIVATE',
      fecha: new Date(),
      datosAnteriores: JSON.stringify({ activo: existing[0].activo }),
      datosNuevos: JSON.stringify({ activo }),
      descripcion: 'Cambio de estado de comunidad.',
    } })
    return formatCommunity(updated)
  })
}
