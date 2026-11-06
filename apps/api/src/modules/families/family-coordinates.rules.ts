import type { ValidationDetail } from './families.types.js'

export type FamilyCoordinates = { latitud: number | null; longitud: number | null }

/** Regla compartida: ausencia en ambos campos o pareja de números válidos. */
export function validateCoordinates(input: Record<string, unknown>): { data?: FamilyCoordinates; details: ValidationDetail[]; included: boolean } {
  const hasLat = Object.prototype.hasOwnProperty.call(input, 'latitud')
  const hasLon = Object.prototype.hasOwnProperty.call(input, 'longitud')
  if (!hasLat && !hasLon) return { included: false, details: [] }
  if (!hasLat || !hasLon) return { included: true, details: [{ field: 'latitud', message: 'Introduce latitud y longitud juntas, o deja ambas vacías.' }] }
  if (input.latitud === null && input.longitud === null) return { included: true, details: [], data: { latitud: null, longitud: null } }
  const lat = input.latitud, lon = input.longitud
  const details: ValidationDetail[] = []
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) details.push({ field: 'latitud', message: 'La latitud debe ser un número entre -90 y 90.' })
  if (typeof lon !== 'number' || !Number.isFinite(lon) || lon < -180 || lon > 180) details.push({ field: 'longitud', message: 'La longitud debe ser un número entre -180 y 180.' })
  return details.length ? { included: true, details } : { included: true, details, data: { latitud: lat as number, longitud: lon as number } }
}
