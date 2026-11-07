const API = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/$/, '')
export type SaleCurrency = { id: number; codigo: string; nombre: string; simbolo: string | null }
export type SaleUnit = { id: number; codigo: string; nombre: string; abreviatura: string | null }
export type SaleAvailability = {
  registroProduccionId: number
  unidades: { unidadMedida: SaleUnit; tipo: 'kg' | 'unidades' | 'manojos'; cosechado: string; vendido: string; disponible: string }[]
}
export type Sale = {
  id: number; registroProduccionId: number; visitaOrigenId?: number | null; fechaVenta: string | null; cantidad: string
  unidadMedida: SaleUnit; observaciones: string | null
  cicloCultivo: { id: number; cultivo: { nombre: string }; huerto: { nombre: string | null; familia: {
    nombreReferencia: string; comunidad: { nombre: string }
  } } }
  precioUnitario: string | null; moneda: SaleCurrency | null; totalVenta: string | null
  tipoImporte: 'VENTA_REAL'; esDatoPrueba: boolean
  conversionPendiente: boolean
  equivalencia: { tipoCambioId: number; totalGTQ: string; totalUSD: string; fechaTasa: string; quetzalesPorDolar: string; fuente: string; referencia: string } | null
}
export type SaleInput = { registroProduccionId: number; fechaVenta: string; cantidad: string; unidadMedidaId: number
  monedaId: number; precioUnitario: string; observaciones: string | null }
export class SaleApiError extends Error {
  public readonly status: number
  public readonly details: Array<{ field: string; message: string }>
  constructor(message: string, status: number, details: Array<{ field: string; message: string }> = []) {
    super(message); this.name = 'SaleApiError'
    this.status = status; this.details = details
  }
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}/v1/producciones/ventas${path}`, {
    credentials: 'same-origin', cache: 'no-store', ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new SaleApiError(body?.error?.message ?? 'No se pudo completar la operación.',
    response.status, body?.error?.details ?? [])
  if (!body || !('data' in body)) throw new Error('El servidor devolvió una respuesta incompleta.')
  return body.data as T
}
export const listSales = (signal?: AbortSignal, cicloCultivoId?: number) =>
  request<Sale[]>(cicloCultivoId ? `?cicloCultivoId=${cicloCultivoId}` : '', { signal })
export const listSaleCurrencies = (signal?: AbortSignal) => request<SaleCurrency[]>('/monedas', { signal })
export const saleAvailability = (registroProduccionId: number, signal?: AbortSignal) =>
  request<SaleAvailability>(`/disponibilidad?registroProduccionId=${registroProduccionId}`, { signal })
export const createSale = (data: SaleInput) => request<Sale>('', { method: 'POST', body: JSON.stringify(data) })
