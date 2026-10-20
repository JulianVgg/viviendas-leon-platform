import type { CommunityOption, FamilyCreateInput, FamilyDetail, FamilyListParams, FamilyListResponse } from '@/features/families/types/family'
import type { FamilyMemberInput, FamilyMemberRecord, FamilyMemberUpdateInput, FamilyProgramOption, FamilyUpdateInput, IntegralFamilyInput, IntegralFamilyRecord, FamilyParticipationRecord, FamilyParticipationCreateInput, FamilyParticipationUpdateInput } from '@/features/families/types/familyIntegral'

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || '/api'

export class FamilyApiError extends Error {
  status: number
  details: Array<{ field: string; message: string }>
  code?: string

  constructor(message: string, status: number, details: Array<{ field: string; message: string }> = [], code?: string) {
    super(message)
    this.name = 'FamilyApiError'
    this.status = status
    this.details = details
    this.code = code
  }
}

async function requestData<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`
  const url = new URL(path, new URL(base, window.location.origin))
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new FamilyApiError(payload?.error?.message ?? 'No fue posible completar la operación.', response.status, payload?.error?.details ?? [], payload?.error?.code)
  }
  if (options.method === 'POST' && path === 'v1/familias/registro-integral' && response.status !== 201) throw new Error('No se pudo confirmar el registro.')
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

export async function fetchIntegralFamily(id: string, signal?: AbortSignal) {
  // Reuse the existing AUTH session. The temporary integral gate alone does not
  // validate identity; do not clear AuthProvider or introduce a parallel store.
  const session = await fetch('/api/v1/auth/me', { credentials: 'same-origin', cache: 'no-store', signal })
  if (!session.ok) throw new FamilyApiError('', session.status)
  return requestData<IntegralFamilyRecord>(`v1/familias/${encodeURIComponent(id)}/expediente`, { signal, cache: 'no-store' })
}

export function fetchFamilyProgramOptions(signal?: AbortSignal) {
  return requestData<FamilyProgramOption[]>('v1/familias/opciones/programas', { signal, cache: 'no-store' })
}

export async function createIntegralFamily(input: IntegralFamilyInput) {
  const record = await requestData<IntegralFamilyRecord>('v1/familias/registro-integral', { method: 'POST', body: JSON.stringify(input) })
  if (!Number.isInteger(record?.id) || record.id <= 0) throw new Error('No se pudo confirmar el identificador generado.')
  return record
}

export function updateFamily(id: number, input: FamilyUpdateInput) {
  return requestData<IntegralFamilyRecord>(`v1/familias/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function createFamilyProgram(familyId: number, input: FamilyParticipationCreateInput, idempotencyKey: string) {
  return requestData<FamilyParticipationRecord>(`v1/familias/${familyId}/programas`, {
    method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(input),
  })
}

export function updateFamilyProgram(familyId: number, participationId: number, input: FamilyParticipationUpdateInput) {
  return requestData<FamilyParticipationRecord>(`v1/familias/${familyId}/programas/${participationId}`, {
    method: 'PATCH', body: JSON.stringify(input),
  })
}

export function createFamilyMember(id: number, input: FamilyMemberInput, idempotencyKey: string) {
  return requestData<FamilyMemberRecord>(`v1/familias/${id}/integrantes`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(input),
  })
}

export function updateFamilyMember(familyId: number, memberId: number, input: FamilyMemberUpdateInput) {
  return requestData<FamilyMemberRecord>(`v1/familias/${familyId}/integrantes/${memberId}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function updateFamilyMemberState(familyId: number, memberId: number, activo: boolean, version: string) {
  return requestData<FamilyMemberRecord>(`v1/familias/${familyId}/integrantes/${memberId}/estado`, { method: 'PATCH', body: JSON.stringify({ activo, version }) })
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
    throw new FamilyApiError(payload?.error?.message ?? 'No fue posible consultar las familias.', response.status)
  }

  return response.json() as Promise<FamilyListResponse>
}
