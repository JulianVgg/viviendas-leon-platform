import { getPrismaClient } from '../../config/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import type { ValidationDetail } from './families.types.js'
import type { FamilyProgramOption, IntegralFamilyInput, IntegralFamilyRecord } from './families-integral.types.js'

// Existing seed uses ACTIVO. No other selectable status is documented.
export const SELECTABLE_PROGRAM_STATUS = 'ACTIVO'

export class IntegralFamilyValidationError extends Error {
  constructor(public readonly details: ValidationDetail[]) {
    super('Revisa los datos del expediente.')
  }
}

const recordSelect = {
  id: true, nombreReferencia: true, fechaIngreso: true, estado: true, observaciones: true,
  comunidad: { select: { id: true, nombre: true, municipio: { select: { id: true, nombre: true } } } },
  integrantes: {
    orderBy: { id: 'asc' },
    select: { id: true, nombreCompleto: true, fechaNacimiento: true, sexo: true, parentesco: true, telefono: true, observaciones: true, activo: true },
  },
  programas: {
    orderBy: [{ programa: { nombre: 'asc' } }, { id: 'asc' }],
    select: { id: true, programaId: true, programa: { select: { id: true, nombre: true } }, fechaIngreso: true, fechaSalida: true, estado: true, observaciones: true },
  },
} satisfies Prisma.FamiliaSelect

function serializeRecord(
  record: Prisma.FamiliaGetPayload<{ select: typeof recordSelect }>,
  version: string,
  memberVersions: Map<number, string>,
): IntegralFamilyRecord {
  return {
    ...record,
    version,
    fechaIngreso: record.fechaIngreso?.toISOString() ?? null,
    integrantes: record.integrantes.map((member) => ({ ...member, version: memberVersions.get(member.id) ?? '', fechaNacimiento: member.fechaNacimiento?.toISOString() ?? null })),
    programas: record.programas.map((program) => ({ ...program, fechaIngreso: program.fechaIngreso?.toISOString() ?? null, fechaSalida: program.fechaSalida?.toISOString() ?? null })),
  }
}

function checkReferences(communityIds: number[], programIds: number[], input: IntegralFamilyInput) {
  const details: ValidationDetail[] = []
  if (!communityIds.includes(input.comunidadId)) details.push({ field: 'comunidadId', message: 'La comunidad debe existir y estar activa, al igual que su municipio.' })
  const available = new Set(programIds)
  input.programas.forEach((program, index) => {
    if (!available.has(program.programaId)) details.push({ field: `programas[${index}].programaId`, message: 'El programa debe existir y estar disponible (ACTIVO).' })
  })
  if (details.length) throw new IntegralFamilyValidationError(details)
}

export async function listFamilyProgramOptions(): Promise<FamilyProgramOption[]> {
  return getPrismaClient().programa.findMany({
    where: { estado: SELECTABLE_PROGRAM_STATUS }, orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    select: { id: true, nombre: true, descripcion: true, estado: true },
  })
}

export async function findIntegralFamily(id: number): Promise<IntegralFamilyRecord | null> {
  return getPrismaClient().$transaction(async (transaction) => {
    const record = await transaction.familia.findUnique({ where: { id }, select: recordSelect })
    if (!record) return null
    const familyVersions = await transaction.$queryRaw<Array<{ version: string }>>`SELECT xmin::text AS version FROM familia WHERE id = ${id}`
    const memberVersions = record.integrantes.length
      ? await transaction.$queryRaw<Array<{ id: number; version: string }>>(Prisma.sql`SELECT id, xmin::text AS version FROM integrante_familia WHERE familia_id = ${id}`)
      : []
    return serializeRecord(record, familyVersions[0].version, new Map(memberVersions.map((item) => [item.id, item.version])))
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function createIntegralFamily(input: IntegralFamilyInput, prisma = getPrismaClient()): Promise<IntegralFamilyRecord> {
  const minimumDetails: ValidationDetail[] = []
  if (!input.integrantes.length) minimumDetails.push({ field: 'integrantes', message: 'Incluye al menos un integrante.' })
  if (!input.programas.length) minimumDetails.push({ field: 'programas', message: 'Incluye al menos un programa.' })
  if (minimumDetails.length) throw new IntegralFamilyValidationError(minimumDetails)
  const ids = input.programas.map((program) => program.programaId).sort((a, b) => a - b)
  const [community, programs] = await Promise.all([
    prisma.comunidad.findFirst({ where: { id: input.comunidadId, activo: true, municipio: { activo: true } }, select: { id: true } }),
    prisma.programa.findMany({ where: { id: { in: ids }, estado: SELECTABLE_PROGRAM_STATUS }, select: { id: true } }),
  ])
  checkReferences(community ? [community.id] : [], programs.map((program) => program.id), input)

  return prisma.$transaction(async (transaction) => {
    // Retain the basic endpoint's locks: foreign keys alone do not protect active states.
    const lockedCommunities = await transaction.$queryRaw<Array<{ id: number }>>`
      SELECT c.id FROM comunidad c JOIN municipio m ON m.id = c.municipio_id
      WHERE c.id = ${input.comunidadId} AND c.activo = true AND m.activo = true
      FOR SHARE OF c, m
    `
    const lockedPrograms = await transaction.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id FROM programa WHERE id IN (${Prisma.join(ids)}) AND estado = ${SELECTABLE_PROGRAM_STATUS}
      ORDER BY id FOR SHARE
    `)
    checkReferences(lockedCommunities.map((row) => row.id), lockedPrograms.map((row) => row.id), input)
    const { integrantes, programas, ...family } = input
    const created = await transaction.familia.create({ data: { ...family, estado: 'ACTIVA' }, select: { id: true } })
    await transaction.integranteFamilia.createMany({ data: integrantes.map((member) => ({ ...member, familiaId: created.id, activo: true })) })
    await transaction.familiaPrograma.createMany({ data: programas.map((program) => ({ ...program, familiaId: created.id })) })
    // Read inside the transaction so a read failure also rolls back the entire operation.
    // Read each relation group sequentially: adapter-pg uses one connection per
    // interactive transaction; parallel relation queries trigger pg deprecations.
    const { integrantes: memberSelection, programas: programSelection, ...generalSelection } = recordSelect
    const general = await transaction.familia.findUniqueOrThrow({ where: { id: created.id }, select: generalSelection })
    const members = await transaction.integranteFamilia.findMany({ where: { familiaId: created.id }, ...memberSelection })
    const associations = await transaction.familiaPrograma.findMany({ where: { familiaId: created.id }, ...programSelection })
    const familyVersions = await transaction.$queryRaw<Array<{ version: string }>>`SELECT xmin::text AS version FROM familia WHERE id = ${created.id}`
    const memberVersions = await transaction.$queryRaw<Array<{ id: number; version: string }>>`SELECT id, xmin::text AS version FROM integrante_familia WHERE familia_id = ${created.id}`
    return serializeRecord({ ...general, integrantes: members, programas: associations }, familyVersions[0].version, new Map(memberVersions.map((item) => [item.id, item.version])))
  })
}
