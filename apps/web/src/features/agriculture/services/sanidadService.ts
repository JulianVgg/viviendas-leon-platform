export type RegistroSanidad = { id: number; nombre: string; descripcion: string | null; activo: boolean }
export type DatosSanidad = { plagas: RegistroSanidad[]; enfermedades: RegistroSanidad[] }
export type TipoSanidad = 'plagas' | 'enfermedades'
export type EntradaSanidad = { nombre: string; descripcion: string | null; activo: boolean }
const API = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/$/, '')

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}/v1/sanidad${path}`, {
    credentials: 'same-origin', cache: 'no-store', ...init,
    headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw Error(body?.error?.message || `Error HTTP ${response.status}`)
  return body.data as T
}

export const listarSanidad = (signal?: AbortSignal) => request<DatosSanidad>('/', { signal })
export const listarSanidadDisponible = (signal?: AbortSignal) => request<DatosSanidad>('/disponibles', { signal })
export const crearSanidad = (tipo: TipoSanidad, input: EntradaSanidad) => request<RegistroSanidad>(`/${tipo}`, { method: 'POST', body: JSON.stringify(input) })
export const editarSanidad = (tipo: TipoSanidad, id: number, input: EntradaSanidad) => request<RegistroSanidad>(`/${tipo}/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
