const API = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/$/, '')

export type ProductionUnit = { id: number; codigo: string; nombre: string; abreviatura: string | null; activo?: boolean }
export type Production = {
  id: number
  cicloCultivoId: number
  fechaInicioPeriodo: string
  fechaFinPeriodo: string
  fechaCosecha: string | null
  observaciones: string | null
  cicloCultivo: {
    id: number
    estado: string
    cultivo: { id: number; nombre: string }
    huerto: { id: number; nombre: string | null; familiaId: number; familia: {
      id: number; nombreReferencia: string; comunidad: { nombre: string }
    } }
  }
  detalles: { id: number; cantidadTotal: string; unidadMedida: ProductionUnit }[]
}
export type ProductionInput = {
  cicloCultivoId: number
  fechaCosecha: string
  cantidad: string
  unidadMedidaId: number
  observaciones: string | null
}
export class ProductionApiError extends Error {
  public readonly status: number
  public readonly details: Array<{ field: string; message: string }>

  constructor(message: string, status: number,
    details: Array<{ field: string; message: string }> = []) {
    super(message)
    this.name = 'ProductionApiError'
    this.status = status
    this.details = details
  }
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}/v1/producciones${path}`, {
    credentials: 'same-origin', cache: 'no-store', ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new ProductionApiError(
    body?.error?.message ?? 'No se pudo completar la operación.', response.status, body?.error?.details ?? [],
  )
  if (!body || !('data' in body)) throw new Error('El servidor devolvió una respuesta incompleta.')
  return body.data as T
}
export const listProductionUnits = (signal?: AbortSignal) => request<ProductionUnit[]>('/unidades', { signal })
export const listProductions = (cicloCultivoId?: number, signal?: AbortSignal) =>
  request<Production[]>(cicloCultivoId ? `?cicloCultivoId=${cicloCultivoId}` : '', { signal })
export const createProduction = (data: ProductionInput) => request<Production>('', { method: 'POST', body: JSON.stringify(data) })
