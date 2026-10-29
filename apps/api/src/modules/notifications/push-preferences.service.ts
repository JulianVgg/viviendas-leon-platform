import { getPrismaClient } from '../../config/prisma.js'
import { PREFERENCIAS_PUSH_POR_DEFECTO, type PreferenciasPush } from './push-automatic.rules.js'

/** Devuelve las preferencias del usuario autenticado; nunca acepta un ID del cliente. */
export async function consultarPreferenciasPush(usuarioId: number): Promise<PreferenciasPush> {
  const encontrada = await getPrismaClient().preferenciaPush.findUnique({
    where: { usuarioId },
    select: { habilitadas: true, silencioInicio: true, silencioFin: true },
  })
  return encontrada ?? { ...PREFERENCIAS_PUSH_POR_DEFECTO }
}

export async function guardarPreferenciasPush(usuarioId: number, preferencias: PreferenciasPush): Promise<PreferenciasPush> {
  const guardada = await getPrismaClient().preferenciaPush.upsert({
    where: { usuarioId },
    create: { usuarioId, ...preferencias },
    update: preferencias,
    select: { habilitadas: true, silencioInicio: true, silencioFin: true },
  })
  return guardada
}
