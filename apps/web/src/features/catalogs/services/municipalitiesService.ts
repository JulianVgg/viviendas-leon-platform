import type { AdminMunicipality, MunicipalityFormData } from '../types/municipality'

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || '/api'

export class MunicipalitiesApiError extends Error {
  readonly status: number
  readonly details: Array<{ field: string; message: string }>

  constructor(message: string, status: number, details: Array<{ field: string; message: string }> = []) {
    super(message)
    this.name = 'MunicipalitiesApiError'
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`
  const response = await fetch(new URL(path, new URL(base, window.location.origin)), {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new MunicipalitiesApiError(payload?.error?.message ?? 'No se pudo completar la solicitud.', response.status, payload?.error?.details ?? [])
  }
  if (!payload || !('data' in payload)) throw new Error('La respuesta del servidor no es válida.')
  return payload.data as T
}

export function listAllMunicipalities(signal?: AbortSignal) {
  return request<AdminMunicipality[]>('v1/municipios/administracion', { signal })
}

export function createMunicipality(input: MunicipalityFormData) {
  return request<AdminMunicipality>('v1/municipios', { method: 'POST', body: JSON.stringify(input) })
}

export function editMunicipality(id: number, input: MunicipalityFormData) {
  return request<AdminMunicipality>(`v1/municipios/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function setMunicipalityActive(id: number, activo: boolean) {
  return request<AdminMunicipality>(`v1/municipios/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) })
}
