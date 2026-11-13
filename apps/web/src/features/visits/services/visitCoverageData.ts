import { getOfflineData, saveOfflineData } from '@/db/offlineDb'
import { GardenApiError, listGardens, type Garden } from '@/features/agriculture/services/gardens'

/** Conserva las familias con huerto para consultar la cobertura durante conexiones intermitentes. */
export async function getCoverageGardens(userId: number): Promise<{ gardens: Garden[]; local: boolean }> {
  const key = `visits:gardens-for-coverage:v1:user:${userId}`
  try {
    const gardens = await listGardens()
    void saveOfflineData(key, gardens).catch(() => {})
    return { gardens, local: false }
  } catch (error) {
    // Nunca recuperar datos privados de una sesión que el servidor rechazó.
    if (error instanceof GardenApiError && (error.status === 401 || error.status === 403)) throw error
    const cached = await getOfflineData<Garden[]>(key).catch(() => undefined)
    if (cached) return { gardens: cached.data, local: true }
    throw error
  }
}
