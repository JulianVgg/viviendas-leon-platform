import type { AdminProgram, ProgramFormData, ProgramOption } from '../types/program'

const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || '/api'

export class ProgramsApiError extends Error {
  readonly status: number
  readonly details: Array<{ field: string; message: string }>

  constructor(
    message: string,
    status: number,
    details: Array<{ field: string; message: string }> = [],
  ) {
    super(message)
    this.name = 'ProgramsApiError'
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`
  const response = await fetch(new URL(path, new URL(base, window.location.origin)), {
    credentials: 'same-origin', cache: 'no-store', ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new ProgramsApiError(payload?.error?.message ?? 'No fue posible completar la solicitud.', response.status, payload?.error?.details ?? [])
  if (!payload || !('data' in payload)) throw new Error('La respuesta del servidor no tiene el formato esperado.')
  return payload.data as T
}

export function listAllPrograms(signal?: AbortSignal) {
  return request<AdminProgram[]>('v1/programas', { signal })
}

export function listAvailablePrograms(signal?: AbortSignal) {
  return request<ProgramOption[]>('v1/programas/disponibles', { signal })
}

export function createProgram(input: ProgramFormData) {
  return request<AdminProgram>('v1/programas', { method: 'POST', body: JSON.stringify(input) })
}

export function updateProgram(id: number, input: ProgramFormData) {
  return request<AdminProgram>(`v1/programas/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}
