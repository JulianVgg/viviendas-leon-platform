import { createHash } from 'node:crypto'
import { getPrismaClient } from '../../config/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type {
  FamilyMemberCreateInput,
  FamilyMemberStateInput,
  FamilyMemberUpdateInput,
  FamilyUpdateInput,
  ValidationDetail,
} from './families.types.js'
import { findIntegralFamily } from './families-integral.service.js'

export class FamilyManagementError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409,
    public readonly code: string,
    message: string,
    public readonly details: ValidationDetail[] = [],
  ) {
    super(message)
  }
}

type LockedFamily = { id: number; version: string }
type LockedMember = {
  id: number
  familia_id: number
  activo: boolean
  version: string
}

const memberSelect = {
  id: true,
  nombreCompleto: true,
  fechaNacimiento: true,
  sexo: true,
  parentesco: true,
  telefono: true,
  observaciones: true,
  activo: true,
} satisfies Prisma.IntegranteFamiliaSelect

function serializeMember<T extends { fechaNacimiento: Date | null }>(member: T, version: string) {
  return { ...member, version, fechaNacimiento: member.fechaNacimiento?.toISOString() ?? null }
}

function conflict(entity: 'familia' | 'integrante') {
  return new FamilyManagementError(409, 'CONCURRENT_MODIFICATION', `La ${entity} cambió desde que abriste el formulario. Recarga la información antes de guardar.`)
}

async function lockFamily(transaction: Prisma.TransactionClient, familyId: number, version?: string) {
  const rows = await transaction.$queryRaw<LockedFamily[]>`SELECT id, xmin::text AS version FROM familia WHERE id = ${familyId} FOR UPDATE`
  if (!rows.length) throw new FamilyManagementError(404, 'FAMILY_NOT_FOUND', 'La familia solicitada no existe.')
  if (version !== undefined && rows[0].version !== version) throw conflict('familia')
  return rows[0]
}

async function lockMember(transaction: Prisma.TransactionClient, familyId: number, memberId: number, version: string) {
  const rows = await transaction.$queryRaw<LockedMember[]>`
    SELECT id, familia_id, activo, xmin::text AS version
    FROM integrante_familia WHERE id = ${memberId} FOR UPDATE
  `
  if (!rows.length || rows[0].familia_id !== familyId) throw new FamilyManagementError(404, 'FAMILY_MEMBER_NOT_FOUND', 'El integrante no existe en esta familia.')
  if (rows[0].version !== version) throw conflict('integrante')
  return rows[0]
}

export async function updateFamily(familyId: number, input: FamilyUpdateInput, userId: number) {
  const { version, ...changes } = input
  await getPrismaClient().$transaction(async (transaction) => {
    await lockFamily(transaction, familyId, version)
    if (changes.comunidadId !== undefined) {
      const communities = await transaction.$queryRaw<Array<{ id: number }>>`
        SELECT c.id FROM comunidad c JOIN municipio m ON m.id = c.municipio_id
        WHERE c.id = ${changes.comunidadId} AND c.activo = true AND m.activo = true
        FOR SHARE OF c, m
      `
      if (!communities.length) throw new FamilyManagementError(400, 'VALIDATION_ERROR', 'Revisa la comunidad seleccionada.', [{ field: 'comunidadId', message: 'La comunidad debe existir y estar activa, al igual que su municipio.' }])
    }
    await transaction.familia.update({ where: { id: familyId }, data: changes })
    const changedFields = Object.keys(changes).sort()
    await transaction.bitacora.create({ data: {
      usuarioId: userId,
      entidad: 'familia',
      registroId: String(familyId),
      accion: 'UPDATE',
      fecha: new Date(),
      datosNuevos: JSON.stringify({ changedFields }),
      descripcion: 'Actualización de información general de la familia.',
    } })
  })
  return findIntegralFamily(familyId)
}

export async function createFamilyMember(familyId: number, input: FamilyMemberCreateInput, userId: number, idempotencyKey: string) {
  const requestHash = createHash('sha256').update(JSON.stringify({ familyId, input })).digest('hex')
  return getPrismaClient().$transaction(async (transaction) => {
    await lockFamily(transaction, familyId)
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${idempotencyKey}, 0))`
    const description = `idempotency:${idempotencyKey}`
    const existing = await transaction.bitacora.findFirst({
      where: { usuarioId: userId, entidad: 'integrante_familia', accion: 'CREATE', descripcion: description },
      orderBy: { id: 'asc' },
    })
    if (existing) {
      const stored = JSON.parse(existing.datosNuevos ?? '{}') as { requestHash?: string }
      if (stored.requestHash !== requestHash) throw new FamilyManagementError(409, 'IDEMPOTENCY_CONFLICT', 'La clave de idempotencia ya fue utilizada con otros datos.')
      const memberId = Number(existing.registroId)
      const member = await transaction.integranteFamilia.findFirst({ where: { id: memberId, familiaId: familyId }, select: memberSelect })
      if (!member) throw new FamilyManagementError(409, 'IDEMPOTENCY_RESULT_UNAVAILABLE', 'La operación ya fue procesada, pero su resultado no está disponible.')
      const versions = await transaction.$queryRaw<Array<{ version: string }>>`SELECT xmin::text AS version FROM integrante_familia WHERE id = ${member.id}`
      return { member: serializeMember(member, versions[0].version), replayed: true }
    }
    const member = await transaction.integranteFamilia.create({ data: { ...input, familiaId: familyId, activo: true }, select: memberSelect })
    const versions = await transaction.$queryRaw<Array<{ version: string }>>`SELECT xmin::text AS version FROM integrante_familia WHERE id = ${member.id}`
    const serialized = serializeMember(member, versions[0].version)
    await transaction.bitacora.create({ data: {
      usuarioId: userId,
      entidad: 'integrante_familia',
      registroId: String(member.id),
      accion: 'CREATE',
      fecha: new Date(),
      datosNuevos: JSON.stringify({ requestHash, changedFields: ['activo', 'fechaNacimiento', 'nombreCompleto', 'observaciones', 'parentesco', 'sexo', 'telefono'] }),
      descripcion: description,
    } })
    return { member: serialized, replayed: false }
  })
}

export async function updateFamilyMember(familyId: number, memberId: number, input: FamilyMemberUpdateInput, userId: number) {
  const { version, ...changes } = input
  return getPrismaClient().$transaction(async (transaction) => {
    await lockFamily(transaction, familyId)
    await lockMember(transaction, familyId, memberId, version)
    const member = await transaction.integranteFamilia.update({ where: { id: memberId }, data: changes, select: memberSelect })
    const versions = await transaction.$queryRaw<Array<{ version: string }>>`SELECT xmin::text AS version FROM integrante_familia WHERE id = ${member.id}`
    const serialized = serializeMember(member, versions[0].version)
    await transaction.bitacora.create({ data: {
      usuarioId: userId,
      entidad: 'integrante_familia',
      registroId: String(memberId),
      accion: 'UPDATE',
      fecha: new Date(),
      datosNuevos: JSON.stringify({ changedFields: Object.keys(changes).sort() }),
      descripcion: 'Actualización de datos personales de un integrante.',
    } })
    return serialized
  })
}

export async function updateFamilyMemberState(familyId: number, memberId: number, input: FamilyMemberStateInput, userId: number) {
  return getPrismaClient().$transaction(async (transaction) => {
    await lockFamily(transaction, familyId)
    const locked = await lockMember(transaction, familyId, memberId, input.version)
    if (locked.activo && !input.activo) {
      const activeMembers = await transaction.integranteFamilia.count({ where: { familiaId: familyId, activo: true, id: { not: memberId } } })
      if (activeMembers === 0) throw new FamilyManagementError(409, 'LAST_ACTIVE_MEMBER', 'La familia debe conservar al menos un integrante activo.')
    }
    const member = await transaction.integranteFamilia.update({ where: { id: memberId }, data: { activo: input.activo }, select: memberSelect })
    const versions = await transaction.$queryRaw<Array<{ version: string }>>`SELECT xmin::text AS version FROM integrante_familia WHERE id = ${member.id}`
    const serialized = serializeMember(member, versions[0].version)
    await transaction.bitacora.create({ data: {
      usuarioId: userId,
      entidad: 'integrante_familia',
      registroId: String(memberId),
      accion: input.activo ? 'REACTIVATE' : 'DEACTIVATE',
      fecha: new Date(),
      datosAnteriores: JSON.stringify({ activo: locked.activo }),
      datosNuevos: JSON.stringify({ activo: input.activo }),
      descripcion: input.activo ? 'Reactivación lógica de integrante.' : 'Desactivación lógica de integrante.',
    } })
    return serialized
  })
}
