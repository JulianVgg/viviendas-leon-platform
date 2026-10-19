import { getPrismaClient } from '../../config/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type { MunicipalityFieldError, MunicipalityInput } from './municipalities.validation.js'

export class MunicipalityError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409,
    public readonly code: string,
    message: string,
    public readonly details: MunicipalityFieldError[] = [],
  ) {
    super(message)
  }
}

const municipalitySelect = {
  id: true,
  nombre: true,
  activo: true,
  _count: { select: { comunidades: true } },
  comunidades: { where: { activo: true }, select: { id: true } },
} satisfies Prisma.MunicipioSelect

function formatMunicipality(record: Prisma.MunicipioGetPayload<{ select: typeof municipalitySelect }>) {
  const { _count, comunidades, ...data } = record
  return { ...data, comunidadesCount: _count.comunidades, comunidadesActivasCount: comunidades.length }
}

function notFound(): never {
  throw new MunicipalityError(404, 'MUNICIPALITY_NOT_FOUND', 'El municipio solicitado no existe.')
}

function duplicate(): never {
  throw new MunicipalityError(409, 'DUPLICATE_MUNICIPALITY', 'Ya existe un municipio con ese nombre.', [
    { field: 'nombre', message: 'Ingresa un nombre diferente.' },
  ])
}

async function reserveName(tx: Prisma.TransactionClient, nombre: string) {
  // Serializa altas/cambios del mismo nombre ignorando diferencias de mayúsculas.
  const canonical = `municipio:${nombre.toLocaleLowerCase('es')}`
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${canonical}, 0))`
}

async function ensureNameAvailable(tx: Prisma.TransactionClient, nombre: string, exceptId?: number) {
  const existing = await tx.municipio.findFirst({
    where: { nombre: { equals: nombre, mode: 'insensitive' }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  })
  if (existing) return duplicate()
}

export async function listMunicipalitiesForAdmin() {
  const records = await getPrismaClient().municipio.findMany({
    orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    select: municipalitySelect,
  })
  return records.map(formatMunicipality)
}

export async function createMunicipality(input: MunicipalityInput, userId: number) {
  return getPrismaClient().$transaction(async (tx) => {
    await reserveName(tx, input.nombre)
    await ensureNameAvailable(tx, input.nombre)
    const created = await tx.municipio.create({ data: { nombre: input.nombre, activo: true }, select: municipalitySelect })
    await tx.bitacora.create({ data: {
      usuarioId: userId, entidad: 'municipio', registroId: String(created.id), accion: 'CREATE', fecha: new Date(),
      datosNuevos: JSON.stringify({ nombre: created.nombre, activo: created.activo }),
      descripcion: 'Registro de municipio.',
    } })
    return formatMunicipality(created)
  })
}

export async function updateMunicipality(id: number, input: MunicipalityInput, userId: number) {
  return getPrismaClient().$transaction(async (tx) => {
    const previous = await tx.$queryRaw<Array<{ id: number; nombre: string; activo: boolean }>>`
      SELECT id, nombre, activo FROM municipio WHERE id = ${id} FOR UPDATE
    `
    if (!previous.length) return notFound()
    await reserveName(tx, input.nombre)
    await ensureNameAvailable(tx, input.nombre, id)
    if (previous[0].nombre === input.nombre) {
      return formatMunicipality(await tx.municipio.findUniqueOrThrow({ where: { id }, select: municipalitySelect }))
    }
    const updated = await tx.municipio.update({ where: { id }, data: { nombre: input.nombre }, select: municipalitySelect })
    await tx.bitacora.create({ data: {
      usuarioId: userId, entidad: 'municipio', registroId: String(id), accion: 'UPDATE', fecha: new Date(),
      datosAnteriores: JSON.stringify({ nombre: previous[0].nombre }), datosNuevos: JSON.stringify({ nombre: updated.nombre }),
      descripcion: 'Actualización del nombre del municipio.',
    } })
    return formatMunicipality(updated)
  })
}

export async function changeMunicipalityState(id: number, activo: boolean, userId: number) {
  return getPrismaClient().$transaction(async (tx) => {
    const previous = await tx.$queryRaw<Array<{ id: number; activo: boolean }>>`
      SELECT id, activo FROM municipio WHERE id = ${id} FOR UPDATE
    `
    if (!previous.length) return notFound()
    if (!activo && previous[0].activo) {
      const comunidadesActivas = await tx.comunidad.count({ where: { municipioId: id, activo: true } })
      if (comunidadesActivas) {
        throw new MunicipalityError(409, 'MUNICIPALITY_HAS_ACTIVE_COMMUNITIES',
          'El municipio tiene comunidades activas. Desactiva primero sus comunidades sin familias activas.')
      }
    }
    if (previous[0].activo === activo) {
      return formatMunicipality(await tx.municipio.findUniqueOrThrow({ where: { id }, select: municipalitySelect }))
    }
    const updated = await tx.municipio.update({ where: { id }, data: { activo }, select: municipalitySelect })
    await tx.bitacora.create({ data: {
      usuarioId: userId, entidad: 'municipio', registroId: String(id), accion: activo ? 'ACTIVATE' : 'DEACTIVATE', fecha: new Date(),
      datosAnteriores: JSON.stringify({ activo: previous[0].activo }), datosNuevos: JSON.stringify({ activo }),
      descripcion: 'Cambio de estado de municipio.',
    } })
    return formatMunicipality(updated)
  })
}
