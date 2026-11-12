import { getOfflineData, saveOfflineData } from '@/db/offlineDb'
import { fetchFamilies } from '@/features/families/services/familyService'
import { listCycles } from '@/features/agriculture/services/cyclesService'
import { listAvailableCrops } from '@/features/agriculture/services/cropsService'
import { listAvailableInsumos } from '@/features/agriculture/services/insumosService'
import { listarSanidadDisponible } from '@/features/agriculture/services/sanidadService'
import { listProductionUnits } from '@/features/agriculture/services/productionService'
import { listSaleCurrencies } from '@/features/agriculture/services/salesService'
import { getVisitFollowUps, getVisitList } from '@/features/visits/services/visitService'
import type { FamilyListItem } from '@/features/families/types/family'
import type { Cycle } from '@/features/agriculture/services/cyclesService'
import { getConnectivitySnapshot } from '@/services/connectivity'
import { fieldAccessActive } from '@/features/auth/services/fieldAccess'

export type FieldDownload = {
  downloadedAt: string
  families: number
  cycles: number
  visits: number
  followUps: number
  storage?: 'encrypted' | 'session'
}
const keyFor = (userId: number) => `visits:prepared:v1:user:${userId}`
export async function getFieldDownload(userId: number): Promise<FieldDownload | null> {
  return (await getOfflineData<FieldDownload>(keyFor(userId)))?.data ?? null
}

/** Descarga completa, sin inventar registros ni utilizar datos sintéticos.
 * El indicador 'preparado' se escribe solo tras persistir todas las colecciones.
 */
export async function prepareFieldData(userId: number, onProgress: (message: string) => void): Promise<FieldDownload> {
  if (getConnectivitySnapshot().status !== 'connected') throw new Error('Comprueba la conexión con Railway antes de descargar datos.')
  const durable = fieldAccessActive(userId)
  if (durable) {
    try { await navigator.storage?.persist?.() } catch { /* Sin garantía de persistencia. */ }
    if (!import.meta.env.DEV && (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller)) {
      throw new Error('La PWA todavía no está lista para abrirse sin internet. Recarga con conexión.')
    }
  }
  onProgress('Descargando familias…')
  const families: FamilyListItem[] = []
  const familyIds = new Set<number>()
  let page = 1
  let totalPages = 1
  do {
    const result = await fetchFamilies({ page, limit: 100 })
    if (!Array.isArray(result.data) || !Number.isInteger(result.pagination.totalPages)) throw new Error('Listado incompleto de familias.')
    for (const family of result.data) {
      if (!familyIds.has(family.id)) { families.push(family); familyIds.add(family.id) }
    }
    totalPages = result.pagination.totalPages
    if (totalPages > 30) throw new Error('Hay demasiadas páginas de familias para esta descarga. Consulta a la administración.')
    page += 1
  } while (page <= totalPages)
  await saveOfflineData(`visits:family-options:v1:user:${userId}`, families)

  onProgress('Descargando ciclos agrícolas…')
  const cycles = await listCycles()
  // La API devuelve como máximo 500: evitar marcar un paquete recortado como completo.
  if (cycles.length >= 500) throw new Error('Se alcanzó el límite de 500 ciclos de la API. No puede garantizarse una descarga completa.')
  const byFamily = new Map<number, Cycle[]>()
  for (const family of families) byFamily.set(family.id, [])
  for (const cycle of cycles) {
    const ownerId = cycle.huerto.familiaId
    if (byFamily.has(ownerId)) byFamily.get(ownerId)!.push(cycle)
  }
  for (const [id, familyCycles] of byFamily) {
    await saveOfflineData(`visits:cycles:v1:user:${userId}:family:${id}`, familyCycles)
  }

  onProgress('Descargando catálogos…')
  const [crops, insumos, fichas, units, currencies] = await Promise.all([
    listAvailableCrops(), listAvailableInsumos(), listarSanidadDisponible(), listProductionUnits(), listSaleCurrencies(),
  ])
  await saveOfflineData(`visits:crop-catalog:v1:user:${userId}`, crops.map((crop) => crop.nombre))
  await saveOfflineData(`visits:technical-catalog:v1:user:${userId}`, { insumos, fichas })
  await saveOfflineData(`visits:sale-catalog:v1:user:${userId}`, { units, currencies })

  onProgress('Descargando agenda y compromisos…')
  const visits = await getVisitList(userId)
  const followUps = await getVisitFollowUps(userId)
  if (visits.local || followUps.local) throw new Error('La API dejó de responder mientras se descargaban visitas y compromisos.')

  const summary: FieldDownload = {
    downloadedAt: new Date().toISOString(), families: families.length, cycles: cycles.length,
    visits: visits.items.length, followUps: followUps.items.length, storage: durable ? 'encrypted' : 'session',
  }
  await saveOfflineData(keyFor(userId), summary)
  return summary
}
