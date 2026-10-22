const API = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/$/, '')

export type Crop = {
  id: number
  nombre: string
  descripcion: string | null
  activo: boolean
  ciclosCount: number
}
export type CropInput = Pick<Crop, 'nombre' | 'descripcion' | 'activo'>
export type CropOption = Pick<Crop, 'id' | 'nombre' | 'descripcion'>

export class CropsApiError extends Error {
  constructor(message: string, public readonly status: number,
    public readonly details: Array<{ field: string; message: string }> = []) {
    super(message)
    this.name = 'CropsApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}/v1/cultivos${path}`, {
    credentials: 'same-origin', cache: 'no-store', ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  const json = await response.json().catch(() => null)
  if (!response.ok) throw new CropsApiError(json?.error?.message ?? 'No fue posible completar la solicitud.',
    response.status, json?.error?.details ?? [])
  if (!json || !('data' in json)) throw new Error('La respuesta del servidor está incompleta.')
  return json.data as T
}

export const listCrops = (signal?: AbortSignal) => request<Crop[]>('', { signal })
// Usar como selector para nuevos ciclos agrícolas (AGR-03).
export const listAvailableCrops = (signal?: AbortSignal) => request<CropOption[]>('/disponibles', { signal })
export const createCrop = (input: CropInput) => request<Crop>('', { method: 'POST', body: JSON.stringify(input) })
export const updateCrop = (id: number, input: CropInput) => request<Crop>(`/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
