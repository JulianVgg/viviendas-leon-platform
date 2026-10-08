import { getOfflineData, saveOfflineData } from '@/db/offlineDb'

export type EssentialDataResult<T> = {
  data: T
  source: 'remote' | 'cache'
  savedAt: string | null
}

/**
 * Consulta la fuente remota si hay conexión y guarda una copia local.
 * Sin conexión (o si la consulta remota falla), utiliza la última copia.
 * No crea ni sincroniza registros: OFF-02 es exclusivamente de lectura.
 */
export async function getEssentialData<T>(
  key: string,
  fetchRemote: () => Promise<T>,
): Promise<EssentialDataResult<T>> {
  let remoteError: unknown

  if (navigator.onLine) {
    try {
      const data = await fetchRemote()
      let savedAt: string | null = null

      try {
        await saveOfflineData(key, data)
        savedAt = new Date().toISOString()
      } catch (error) {
        console.warn('No se pudo guardar la copia offline:', error)
      }

      return { data, source: 'remote', savedAt }
    } catch (error) {
      remoteError = error
    }
  }

  const stored = await getOfflineData<T>(key)
  if (stored) {
    return { data: stored.data, source: 'cache', savedAt: stored.savedAt }
  }

  if (remoteError) {
    throw new Error('No se pudo consultar el servidor y no hay copia local.', { cause: remoteError })
  }
  throw new Error('No hay información descargada en este dispositivo para consultar sin conexión.')
}
