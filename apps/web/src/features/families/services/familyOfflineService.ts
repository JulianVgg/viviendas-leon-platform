import { getEssentialData, type EssentialDataResult } from '@/services/offlineService'
import { FamilyApiError, fetchFamilies, fetchFamily } from './familyService'
import type { FamilyDetail, FamilyListParams, FamilyListResponse } from '../types/family'

/**
 * Solo para pruebas con datos FICTICIOS. No habilitar en producción
 * hasta contar con autenticación y almacenamiento aislado por usuario.
 */
export const FAMILY_OFFLINE_DEMO_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_FAMILY_OFFLINE_TESTS === 'true'

function mayUseCacheAfterError(error: unknown): boolean {
  if (error instanceof FamilyApiError) {
    // Jamás mostrar una copia local tras una denegación de acceso,
    // un parámetro inválido o un expediente inexistente.
    return ![400, 401, 403, 404].includes(error.status)
  }
  return true // Sin red o servidor temporalmente inaccesible.
}

function remoteOnly<T>(fetchRemote: () => Promise<T>): Promise<EssentialDataResult<T>> {
  return fetchRemote().then((data) => ({ data, source: 'remote' as const, savedAt: null }))
}

/** Cada combinación de filtros y página se guarda por separado. */
export function fetchFamiliesWithOffline(
  params: FamilyListParams = {},
  signal?: AbortSignal,
): Promise<EssentialDataResult<FamilyListResponse>> {
  const fetchRemote = () => fetchFamilies(params, signal)
  if (!FAMILY_OFFLINE_DEMO_ENABLED) return remoteOnly(fetchRemote)

  const keyParts = {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    search: params.search?.trim() ?? '',
    estado: params.estado ?? '',
  }
  const cacheKey = `demo:families:list:v1:${JSON.stringify(keyParts)}`
  return getEssentialData(cacheKey, fetchRemote, { canUseCacheAfterError: mayUseCacheAfterError })
}

/** Solo se guarda el expediente que el usuario consultó previamente. */
export function fetchFamilyWithOffline(
  id: string,
  signal?: AbortSignal,
): Promise<EssentialDataResult<FamilyDetail>> {
  const fetchRemote = () => fetchFamily(id, signal)
  if (!FAMILY_OFFLINE_DEMO_ENABLED || !/^[1-9]\d*$/.test(id)) {
    return remoteOnly(fetchRemote)
  }

  return getEssentialData(`demo:families:detail:v1:${id}`, fetchRemote, {
    canUseCacheAfterError: mayUseCacheAfterError,
  })
}
