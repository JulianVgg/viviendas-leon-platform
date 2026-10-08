import type { FamilyListParams, FamilyListResponse } from '@/features/families/types/family'

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || '/api'

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
