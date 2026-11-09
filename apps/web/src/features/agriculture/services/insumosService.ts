const API = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/$/, '')

export type CategoriaInsumo = {
  id: number; nombre: string; descripcion: string | null; activo: boolean; insumosCount: number
}
export type Insumo = {
  id: number; nombre: string; descripcion: string | null; activo: boolean; categoriaInsumoId: number
  categoriaInsumo: { id: number; nombre: string; activo: boolean }
  tratamientosCount: number; entregasCount: number
}
export type DisponibleInsumo = Pick<Insumo, 'id' | 'nombre' | 'descripcion' | 'categoriaInsumoId'> & {
  categoriaInsumo: { nombre: string }
}
export type CategoriaInsumoInput = Pick<CategoriaInsumo, 'nombre' | 'descripcion' | 'activo'>
export type InsumoInput = CategoriaInsumoInput & { categoriaInsumoId: number }

export class InsumosApiError extends Error {
  readonly status: number
  readonly details: Array<{ field: string; message: string }>
  constructor(message: string, status: number, details: Array<{ field: string; message: string }> = []) {
    super(message)
    this.name = 'InsumosApiError'
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}/v1/insumos${path}`, {
    credentials: 'same-origin', cache: 'no-store', ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  const json = await response.json().catch(() => null)
  if (!response.ok) {
    throw new InsumosApiError(json?.error?.message || `Error HTTP ${response.status}`, response.status, json?.error?.details ?? [])
  }
  if (!json || !('data' in json)) throw new InsumosApiError('Respuesta incompleta del servidor.', response.status)
  return json.data as T
}

export const listInsumos = (signal?: AbortSignal) => request<Insumo[]>('/', { signal })
export const listCategoriasInsumo = (signal?: AbortSignal) => request<CategoriaInsumo[]>('/categorias', { signal })
export const listAvailableInsumos = (signal?: AbortSignal) => request<DisponibleInsumo[]>('/disponibles', { signal })
export const createInsumo = (data: InsumoInput) => request<Insumo>('/', { method: 'POST', body: JSON.stringify(data) })
export const updateInsumo = (id: number, data: InsumoInput) => request<Insumo>(`/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const createCategoriaInsumo = (data: CategoriaInsumoInput) => request<CategoriaInsumo>('/categorias', { method: 'POST', body: JSON.stringify(data) })
export const updateCategoriaInsumo = (id: number, data: CategoriaInsumoInput) => request<CategoriaInsumo>(`/categorias/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
