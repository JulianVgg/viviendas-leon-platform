import { createHash } from 'node:crypto'
import { getPrismaClient } from '../../config/prisma.js'
import { Prisma } from '../../generated/prisma/client.js'
import { OFFICIAL_COMMUNITY_NAMES, OFFICIAL_MUNICIPALITY } from '../catalogs/official-communities.js'
import { findIntegralFamily } from './families-integral.service.js'
import { FamilyManagementError } from './families-management.service.js'
import type { BatchFamilyInput } from './family-batch.validation.js'

export async function saveFamilyBatch(familyId: number, input: BatchFamilyInput, userId: number, key: string) {
  const requestHash = createHash('sha256').update(JSON.stringify({ familyId, input })).digest('hex')
  await getPrismaClient().$transaction(async (tx) => {
    // El bloqueo por solicitud hace que un reintento con la misma clave sea seguro.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`family-batch:${userId}:${key}`}, 0)) IS NULL AS locked`
    const description = `family-batch:${key}`
    const previous = await tx.bitacora.findFirst({ where: { usuarioId: userId, entidad: 'familia', accion: 'BATCH_UPDATE', descripcion: description } })
    if (previous) {
      const stored = JSON.parse(previous.datosNuevos ?? '{}') as { requestHash?: string }
      if (stored.requestHash !== requestHash) throw new FamilyManagementError(409, 'IDEMPOTENCY_CONFLICT', 'El envío ya fue utilizado con otros cambios.')
      return
    }
    const family = await tx.$queryRaw<Array<{ version: string }>>`SELECT xmin::text AS version FROM familia WHERE id = ${familyId} FOR UPDATE`
    if (!family.length) throw new FamilyManagementError(404, 'FAMILY_NOT_FOUND', 'La familia no existe.')
    if (family[0].version !== input.version) throw new FamilyManagementError(409, 'CONCURRENT_MODIFICATION', 'El expediente cambió. Recarga antes de guardar.')
    if (input.changes.comunidadId !== undefined) {
      const selected = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT c.id FROM comunidad c JOIN municipio m ON m.id = c.municipio_id
        WHERE c.id = ${input.changes.comunidadId} AND c.activo AND m.activo
          AND lower(m.nombre) = lower(${OFFICIAL_MUNICIPALITY})
          AND lower(c.nombre) IN (${Prisma.join(OFFICIAL_COMMUNITY_NAMES.map((n) => n.toLowerCase()))})
        FOR SHARE OF c, m
      `
      if (!selected.length) throw new FamilyManagementError(400, 'VALIDATION_ERROR', 'Selecciona una comunidad oficial activa.', [{ field: 'comunidadId', message: 'Comunidad no disponible.' }])
    }
    if (Object.keys(input.changes).length) await tx.familia.update({ where: { id: familyId }, data: input.changes })
    for (const item of input.programs) {
      if (item.action === 'create') {
        const program = await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM programa WHERE id = ${item.input.programaId} AND estado = 'ACTIVO' FOR SHARE`
        if (!program.length) throw new FamilyManagementError(400, 'VALIDATION_ERROR', 'El programa no está disponible.', [{ field: 'programas', message: 'Selecciona un programa activo.' }])
        const exists = await tx.familiaPrograma.findUnique({ where: { familiaId_programaId: { familiaId: familyId, programaId: item.input.programaId } } })
        if (exists) throw new FamilyManagementError(409, 'DUPLICATE_PARTICIPATION', 'La familia ya participa en ese programa.')
        await tx.familiaPrograma.create({ data: { ...item.input, familiaId: familyId } })
      } else {
        const previousParticipation = await tx.$queryRaw<Array<{ version: string; fecha_ingreso: Date | null; fecha_salida: Date | null }>>`
          SELECT xmin::text AS version, fecha_ingreso, fecha_salida FROM familia_programa
          WHERE id = ${item.id} AND familia_id = ${familyId} FOR UPDATE
        `
        if (!previousParticipation.length) throw new FamilyManagementError(404, 'PARTICIPATION_NOT_FOUND', 'Una participación ya no existe.')
        if (previousParticipation[0].version !== item.input.version) throw new FamilyManagementError(409, 'CONCURRENT_MODIFICATION', 'Una participación cambió. Recarga el expediente.')
        const { version: _v, ...updates } = item.input
        const entry = updates.fechaIngreso === undefined ? previousParticipation[0].fecha_ingreso : updates.fechaIngreso
        const exit = updates.fechaSalida === undefined ? previousParticipation[0].fecha_salida : updates.fechaSalida
        if (entry && exit && exit < entry) throw new FamilyManagementError(400, 'VALIDATION_ERROR', 'La salida no puede ser anterior al ingreso.', [{ field: 'programas', message: 'Revisa las fechas del programa.' }])
        if (Object.keys(updates).length) await tx.familiaPrograma.update({ where: { id: item.id }, data: updates })
      }
    }
    await tx.bitacora.create({ data: {
      usuarioId: userId, entidad: 'familia', registroId: String(familyId), accion: 'BATCH_UPDATE', fecha: new Date(),
      datosNuevos: JSON.stringify({ requestHash, campos: Object.keys(input.changes).sort(), programasCreados: input.programs.filter((p) => p.action === 'create').length, programasEditados: input.programs.filter((p) => p.action === 'update').length }),
      descripcion: description,
    } })
  })
  return findIntegralFamily(familyId)
}
