const API = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/$/, '')

export type Cycle = {
  id: number
  huertoId: number
  cultivoId: number
  fechaSiembra: string | null
  fechaTrasplante: string | null
  cantidadPlantas: number | null
  fechaFin: string | null
  estado: string
  observaciones: string | null
  cultivo: { id: number; nombre: string; activo: boolean }
  huerto: { id: number; nombre: string | null; estado: string; familiaId: number; familia: {
    id: number; nombreReferencia: string; comunidad: { nombre: string }
  } }
}
export type CycleInput = Pick<Cycle, 'huertoId' | 'cultivoId' | 'fechaSiembra' | 'fechaTrasplante' | 'cantidadPlantas' | 'observaciones'>
export class CyclesApiError extends Error {
  public readonly status: number
  public readonly details: Array<{ field: string; message: string }>

  constructor(message: string, status: number,
    details: Array<{ field: string; message: string }> = []) {
    super(message)
    this.name = 'CyclesApiError'
    this.status = status
    this.details = details
  }
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}/v1/ciclos-cultivo${path}`, {
    credentials: 'same-origin', cache: 'no-store', ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new CyclesApiError(body?.error?.message ?? 'No se pudo completar la operación.', response.status, body?.error?.details ?? [])
  if (!body || !('data' in body)) throw new Error('El servidor devolvió una respuesta incompleta.')
  return body.data as T
}
export const listCycles = (params?: { familiaId?: number; huertoId?: number }, signal?: AbortSignal) => {
  const query = params?.familiaId ? `?familiaId=${params.familiaId}` : params?.huertoId ? `?huertoId=${params.huertoId}` : ''
  return request<Cycle[]>(query, { signal })
}
export const createCycle = (input: CycleInput) => request<Cycle>('', { method: 'POST', body: JSON.stringify(input) })
