import type { CommunityOption, FamilyCreateInput, FamilyDetail, FamilyListParams, FamilyListResponse } from '@/features/families/types/family'

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || '/api'

export class FamilyApiError extends Error {
  status: number
  details: Array<{ field: string; message: string }>

  constructor(message: string, status: number, details: Array<{ field: string; message: string }> = []) {
    super(message)
    this.name = 'FamilyApiError'
    this.status = status
    this.details = details
  }
}

async function requestData<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`
  const url = new URL(path, new URL(base, window.location.origin))
  const response = await fetch(url, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}) } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new FamilyApiError(payload?.error?.message ?? 'No fue posible completar la operación.', response.status, payload?.error?.details ?? [])
  }
  if (!payload || !('data' in payload)) throw new Error('La respuesta del servidor no es válida.')
  return payload.data as T
}

export function fetchCommunities(signal?: AbortSignal) {
  return requestData<CommunityOption[]>('v1/comunidades', { signal })
}

export function fetchFamily(id: string, signal?: AbortSignal) {
  return requestData<FamilyDetail>(`v1/familias/${encodeURIComponent(id)}`, { signal })
}

export function saveFamily(input: FamilyCreateInput) {
  return requestData<FamilyDetail>('v1/familias', { method: 'POST', body: JSON.stringify(input) })
}

export async function fetchFamilies(
  params: FamilyListParams = {},
  signal?: AbortSignal,
): Promise<FamilyListResponse> {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`
  const absoluteBase = new URL(base, window.location.origin)
  const url = new URL('v1/familias', absoluteBase)

  if (params.search) url.searchParams.set('search', params.search)
  if (params.estado) url.searchParams.set('estado', params.estado)
  if (params.page) url.searchParams.set('page', String(params.page))
  if (params.limit) url.searchParams.set('limit', String(params.limit))

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(payload?.error?.message ?? 'No fue posible consultar las familias.')
  }

  return response.json() as Promise<FamilyListResponse>
}
