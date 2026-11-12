import { Prisma } from '../../generated/prisma/client.js'
import { horariosSeCruzan, type HorarioEvento } from './calendar-schedule.rules.js'

// Una sola regla de cruce para el calendario y la reprogramación CIR-25.
export class ConflictoHorario extends Error {
  constructor() { super('Uno o más participantes ya tienen otro evento en ese horario.') }
}

/** Bloqueo compartido por fecha; evita dos asignaciones simultáneas incompatibles. */
export async function verificarCruceInstitucional(
  tx: Prisma.TransactionClient, fecha: string, horario: HorarioEvento,
  participantesIds: number[], exceptId?: number,
): Promise<void> {
  if (!participantesIds.length) return
  const dayNumber = Math.floor(Date.parse(`${fecha}T00:00:00Z`) / 86400000)
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(${81315}, ${dayNumber})::text`
  const existentes = await tx.eventoInstitucional.findMany({
    where: {
      fechaInicio: new Date(`${fecha}T12:00:00Z`),
      ...(exceptId ? { id: { not: exceptId } } : {}),
      participantes: { some: {
        usuarioId: { in: participantesIds }, estadoInvitacion: { not: 'RECHAZADA' },
      } },
    },
    select: { horaInicio: true, horaFin: true },
  })
  if (existentes.some(evento => horariosSeCruzan(horario, evento))) throw new ConflictoHorario()
}
