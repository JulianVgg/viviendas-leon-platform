const API = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/$/, '')

export type Garden = {
  id: number
  familiaId: number
  nombre: string | null
  tipo: string | null
  fechaInicio: string | null
  estado: string
  observaciones: string | null
  tieneImagen: boolean
  imagenUrl: string | null
  imagenActualizadaEn: string | null
  familia: { id: number; nombreReferencia: string; comunidad: { nombre: string } }
}
export type FamilyOption = { id: number; nombreReferencia: string; estado: string; comunidad: { nombre: string } }
export type GardenInput = {
  familiaId: number
  nombre: string | null
  tipo: string | null
  fechaInicio: string | null
  estado: string
  observaciones: string | null
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}/v1/huertos${path}`, {
    credentials: 'same-origin', cache: 'no-store', ...init,
    headers: { Accept: 'application/json', ...init.headers },
  })
  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.error?.message ?? `Error del servidor (${response.status}).`)
  if (!result || !('data' in result)) throw new Error('Respuesta incompleta del servidor.')
  return result.data as T
}

export function listGardens(familiaId?: number, signal?: AbortSignal) {
  return api<Garden[]>(familiaId ? `?familiaId=${familiaId}` : '', { signal })
}

export function listGardenFamilies(signal?: AbortSignal) {
  return api<FamilyOption[]>('/familias-opciones', { signal })
}

export function createGarden(input: GardenInput) {
  return api<Garden>('', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  })
}

export async function uploadGardenImage(id: number, file: File) {
  const validMimes = ['image/jpeg', 'image/png', 'image/webp']
  if (!validMimes.includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) {
    throw new Error('Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.')
  }
  return api<{ imagenUrl: string; tieneImagen: boolean }>(`/${id}/imagen`, {
    method: 'POST', headers: { 'Content-Type': file.type }, body: file,
  })
}

// Keep this URL on the same origin so session cookies remain attached.
export function gardenImageUrl(garden: Garden): string | null {
  return garden.tieneImagen ? `${API}/v1/huertos/${garden.id}/imagen?t=${encodeURIComponent(garden.imagenActualizadaEn ?? '')}` : null
}
