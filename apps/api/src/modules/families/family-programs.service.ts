import { createHash } from 'node:crypto'
import { getPrismaClient } from '../../config/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import type { ValidationDetail } from './families.types.js'
import type { ParticipationCreateInput, ParticipationUpdateInput } from './family-programs.validation.js'

export class FamilyProgramError extends Error {
  constructor(
    public readonly status: 400 | 404 | 409,
    public readonly code: string,
    message: string,
    public readonly details: ValidationDetail[] = [],
  ) { super(message) }
}

const participationSelect = {
  id: true, familiaId: true, programaId: true, fechaIngreso: true, fechaSalida: true,
  estado: true, observaciones: true,
  programa: { select: { id: true, nombre: true } },
} satisfies Prisma.FamiliaProgramaSelect

type Participation = Prisma.FamiliaProgramaGetPayload<{ select: typeof participationSelect }>

function serializeParticipation(record: Participation, version: string) {
  const { familiaId: _familiaId, ...data } = record
  return {
    ...data,
    version,
    fechaIngreso: record.fechaIngreso?.toISOString() ?? null,
    fechaSalida: record.fechaSalida?.toISOString() ?? null,
  }
}

async function readParticipation(tx: Prisma.TransactionClient, id: number, familiaId: number) {
  const record = await tx.familiaPrograma.findFirst({ where: { id, familiaId }, select: participationSelect })
  if (!record) throw new FamilyProgramError(404, 'PARTICIPATION_NOT_FOUND', 'La participación no existe para esta familia.')
  const versions = await tx.$queryRaw<Array<{ version: string }>>`
    SELECT xmin::text AS version FROM familia_programa WHERE id = ${id}
  `
  return serializeParticipation(record, versions[0].version)
}

function checkPeriod(fechaIngreso: Date | null, fechaSalida: Date | null) {
  if (fechaIngreso && fechaSalida && fechaSalida < fechaIngreso) {
    throw new FamilyProgramError(400, 'VALIDATION_ERROR', 'Revisa las fechas de participación.', [
      { field: 'fechaSalida', message: 'La fecha de salida no puede ser anterior a la fecha de ingreso.' },
    ])
  }
}

export async function createFamilyParticipation(familiaId: number, input: ParticipationCreateInput, userId: number, key: string) {
  const requestHash = createHash('sha256').update(JSON.stringify({ familiaId, ...input })).digest('hex')
  return getPrismaClient().$transaction(async (tx) => {
    // Bloquea la familia y protege contra dos altas simultáneas sobre el mismo expediente.
    const family = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM familia WHERE id = ${familiaId} FOR UPDATE`
    if (!family.length) throw new FamilyProgramError(404, 'FAMILY_NOT_FOUND', 'La familia solicitada no existe.')

    const description = `idempotency:${key}`
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`familia_programa:${userId}:${key}`}, 0))`
    const previousRequest = await tx.bitacora.findFirst({
      where: { usuarioId: userId, entidad: 'familia_programa', accion: 'CREATE', descripcion: description },
      orderBy: { id: 'asc' },
    })
    if (previousRequest) {
      const stored = JSON.parse(previousRequest.datosNuevos ?? '{}') as { requestHash?: string }
      if (stored.requestHash !== requestHash) throw new FamilyProgramError(409, 'IDEMPOTENCY_CONFLICT', 'La clave de envío ya fue utilizada con otros datos.')
      const existing = await readParticipation(tx, Number(previousRequest.registroId), familiaId)
      return { participation: existing, replayed: true }
    }

    // Comparte el bloqueo de programa con los cambios de estado del catálogo PROG-01.
    const program = await tx.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM programa WHERE id = ${input.programaId} AND estado = 'ACTIVO' FOR SHARE
    `
    if (!program.length) throw new FamilyProgramError(400, 'PROGRAM_UNAVAILABLE', 'El programa no existe o no está activo.', [
      { field: 'programaId', message: 'Selecciona un programa disponible.' },
    ])
    const alreadyLinked = await tx.familiaPrograma.findUnique({
      where: { familiaId_programaId: { familiaId, programaId: input.programaId } },
      select: { id: true },
    })
    if (alreadyLinked) throw new FamilyProgramError(409, 'DUPLICATE_PARTICIPATION', 'La familia ya está asociada a este programa.', [
      { field: 'programaId', message: 'Selecciona otro programa.' },
    ])
    const created = await tx.familiaPrograma.create({ data: { ...input, familiaId }, select: { id: true } })
    await tx.bitacora.create({ data: {
      usuarioId: userId, entidad: 'familia_programa', registroId: String(created.id), accion: 'CREATE', fecha: new Date(),
      datosNuevos: JSON.stringify({ requestHash, familiaId, programaId: input.programaId, estado: input.estado,
        fechaIngreso: input.fechaIngreso?.toISOString() ?? null, fechaSalida: input.fechaSalida?.toISOString() ?? null,
        observaciones: input.observaciones }),
      descripcion: description,
    } })
    return { participation: await readParticipation(tx, created.id, familiaId), replayed: false }
  })
}

export async function updateFamilyParticipation(familiaId: number, participationId: number, input: ParticipationUpdateInput, userId: number) {
  return getPrismaClient().$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{
      id: number; version: string; estado: string | null; fecha_ingreso: Date | null;
      fecha_salida: Date | null; observaciones: string | null;
    }>>`
      SELECT id, xmin::text AS version, estado, fecha_ingreso, fecha_salida, observaciones
      FROM familia_programa WHERE id = ${participationId} AND familia_id = ${familiaId} FOR UPDATE
    `
    if (!rows.length) throw new FamilyProgramError(404, 'PARTICIPATION_NOT_FOUND', 'La participación no existe para esta familia.')
    const before = rows[0]
    if (before.version !== input.version) throw new FamilyProgramError(409, 'CONCURRENT_MODIFICATION',
      'Otro usuario modificó esta participación. Recarga el expediente antes de guardar.')

    const { version: _version, ...changes } = input
    checkPeriod(changes.fechaIngreso === undefined ? before.fecha_ingreso : changes.fechaIngreso,
      changes.fechaSalida === undefined ? before.fecha_salida : changes.fechaSalida)

    // Evita escrituras y eventos de auditoría redundantes.
    const changed = Object.entries(changes).some(([field, value]) => {
      const key = ({ fechaIngreso: 'fecha_ingreso', fechaSalida: 'fecha_salida' } as Record<string, string>)[field] ?? field
      const oldValue = before[key as keyof typeof before]
      return (value instanceof Date ? value.toISOString() : value) !== (oldValue instanceof Date ? oldValue.toISOString() : oldValue)
    })
    if (!changed) return readParticipation(tx, participationId, familiaId)

    await tx.familiaPrograma.update({ where: { id: participationId }, data: changes })
    await tx.bitacora.create({ data: {
      usuarioId: userId, entidad: 'familia_programa', registroId: String(participationId), accion: 'UPDATE', fecha: new Date(),
      datosAnteriores: JSON.stringify({ familiaId, estado: before.estado, fechaIngreso: before.fecha_ingreso,
        fechaSalida: before.fecha_salida, observaciones: before.observaciones }),
      datosNuevos: JSON.stringify({ familiaId, changedFields: Object.keys(changes).sort(), ...changes }),
      descripcion: 'Actualización de participación familiar en un programa.',
    } })
    return readParticipation(tx, participationId, familiaId)
  })
}

export function isDuplicateFamilyParticipation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}
