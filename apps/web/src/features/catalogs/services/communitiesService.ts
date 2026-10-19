import type { AdminCommunity, CommunityFormData, MunicipalityOption } from '../types/community'

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || '/api'


export class CommunitiesApiError extends Error {
  readonly status: number
  readonly details: Array<{ field: string; message: string }>

  constructor(
    message: string,
    status: number,
    details: Array<{ field: string; message: string }> = [],
  ) {
    super(message)
    this.name = 'CommunitiesApiError'
    this.status = status
    this.details = details
  }
}


async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`
  const url = new URL(path, new URL(base, window.location.origin))
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new CommunitiesApiError(payload?.error?.message ?? 'No se pudo completar la solicitud.', response.status, payload?.error?.details ?? [])
  }
  if (!payload || !('data' in payload)) throw new Error('La respuesta del servidor no es válida.')
  return payload.data as T
}

export function listCommunities(signal?: AbortSignal) {
  return request<AdminCommunity[]>('v1/comunidades/administracion', { signal })
}

export function listMunicipalities(signal?: AbortSignal) {
  return request<MunicipalityOption[]>('v1/municipios', { signal })
}

export function createCommunity(input: CommunityFormData) {
  return request<AdminCommunity>('v1/comunidades', { method: 'POST', body: JSON.stringify(input) })
}

export function editCommunity(id: number, input: CommunityFormData) {
  return request<AdminCommunity>(`v1/comunidades/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function setCommunityActive(id: number, activo: boolean) {
  return request<AdminCommunity>(`v1/comunidades/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) })
}
