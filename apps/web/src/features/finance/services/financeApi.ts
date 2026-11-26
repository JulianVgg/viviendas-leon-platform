export type FinanceType = 'bancos' | 'caja-chica' | 'fondos-medicos'
export type Account = { id: number; tipo: string; nombre: string; referencia: string | null; saldoInicial: string; fechaApertura: string; activo: boolean; saldo: string; movimientos: number }
export type Subaccount = { id: number; nombre: string; saldoInicial: string; saldo: string; activa: boolean }
export type Category = { id: number; nombre: string; grupo: string }
export type Movement = { id: number; fecha: string; tipo: 'INGRESO' | 'EGRESO'; importe: string; descripcion: string; referencia: string | null; beneficiario: string | null; categoria: string | null; subcuenta: string | null; subcuentaId: number | null; trasladoId: string | null; anuladoEn: string | null; tieneComprobante: boolean }
export type Ledger = { cuenta: Account; mes: string; saldoAnterior: string; resumen: { ingresos: string; egresos: string; total: number }; movimientos: Movement[]; pagina: number; paginas: number }
const ROOT = '/api/v1/finanzas'
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${ROOT}${path}`, { credentials: 'same-origin', cache: 'no-store', ...options,
    headers: { Accept: 'application/json', ...(options.body && !(options.body instanceof ArrayBuffer) ? { 'Content-Type': 'application/json' } : {}), ...options.headers } })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw Error(data?.error?.message || `No fue posible completar la solicitud (${response.status}).`)
  return data?.data as T
}
export const getAccounts = (tipo: FinanceType, signal?: AbortSignal) => request<Account[]>(`/${tipo}/cuentas`, {signal})
export const getAccount = (tipo: FinanceType, id: number) => request<Account & {subcuentas: Subaccount[]}>(`/${tipo}/cuentas/${id}`)
export const getLedger = (tipo: FinanceType, id: number, mes: string, page = 1, signal?: AbortSignal) => request<Ledger>(`/${tipo}/cuentas/${id}/movimientos?mes=${mes}&pagina=${page}`, {signal})
export const getCategories = () => request<Category[]>('/categorias')
export const createAccount = (tipo: FinanceType, body: object) => request<{id:number}>(`/${tipo}/cuentas`, {method:'POST',body:JSON.stringify(body)})
export const createSubaccount = (id: number, body: object) => request<{id:number}>(`/fondos-medicos/cuentas/${id}/subcuentas`, {method:'POST',body:JSON.stringify(body)})
export const createMovement = (tipo: FinanceType, id: number, body: object) => request<{id:number}>(`/${tipo}/cuentas/${id}/movimientos`, {method:'POST',body:JSON.stringify(body)})
export const cancelMovement = (tipo: FinanceType, id: number, motivo: string) => request<{anulados:number}>(`/${tipo}/movimientos/${id}/anular`, {method:'POST',body:JSON.stringify({motivo})})
export const createTransfer = (body: object) => request<{origenId:number;destinoId:number}>('/transferencias',{method:'POST',body:JSON.stringify(body)})
export async function uploadProof(tipo: FinanceType, id: number, file: File) {
  const response = await fetch(`${ROOT}/${tipo}/movimientos/${id}/comprobante`, {method:'POST',credentials:'same-origin',body:await file.arrayBuffer(),headers:{'Content-Type':file.type}})
  const json = await response.json().catch(() => null)
  if(!response.ok) throw Error(json?.error?.message || 'No se pudo adjuntar el comprobante.')
}
export async function download(path: string, filename: string) {
  const response = await fetch(`${ROOT}${path}`, { credentials:'same-origin',cache:'no-store' })
  if (!response.ok) {
    const json = await response.json().catch(() => null)
    throw Error(json?.error?.message || 'No se pudo descargar el archivo.')
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a'); link.href=url; link.download=filename
  document.body.appendChild(link);link.click();link.remove()
  window.setTimeout(()=>URL.revokeObjectURL(url),60_000)
}
