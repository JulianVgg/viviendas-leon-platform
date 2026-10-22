// CAP-01: las capacitaciones se consultan y guardan en PostgreSQL mediante la API.
// Esta primera versión requiere conexión; no almacena registros offline.
export type TrainingStatus = 'PROGRAMADA' | 'REALIZADA'

export type TrainingFamily = {
  id: number
  nombreReferencia: string
  comunidad: { id: number; nombre: string }
}

export type TrainingEvidence = {
  id: number
  name: string
  mimeType: string | null
  url: string
}

export type Training = {
  id: number
  tema: string
  descripcion: string | null
  fecha: string
  horaInicio: string | null
  horaFin: string | null
  facilitadorNombre: string | null
  estado: TrainingStatus
  observaciones: string | null
  comunidadId: number | null
  comunidad: { id: number; nombre: string } | null
  familiasPresentes: TrainingFamily[]
  evidencias: TrainingEvidence[]
}

export type CreateTrainingInput = {
  tema: string
  descripcion: string
  fecha: string
  horaInicio: string | null
  horaFin: string | null
  facilitadorNombre: string
  estado: TrainingStatus
  observaciones: string
  comunidadId: number | null
}

export type TrainingCommunity = {
  id: number
  nombre: string
  municipio: { id: number; nombre: string }
}

const API_BASE = import.meta.env.VITE_API_URL?.trim() || '/api'

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const base = API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`
  const url = new URL(endpoint, new URL(base, window.location.origin))
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const result: { data?: T; error?: string | { message?: string } } | null = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof result?.error === 'string' ? result.error : result?.error?.message
    throw new Error(message || `No se pudo completar la operación (HTTP ${response.status}).`)
  }
  if (!result || !('data' in result)) throw new Error('La respuesta de la API no contiene datos.')
  return result.data as T
}

export function getTrainings(): Promise<Training[]> {
  return request<Training[]>('v1/capacitaciones')
}

export function getTrainingCommunities(): Promise<TrainingCommunity[]> {
  return request<TrainingCommunity[]>('v1/comunidades')
}

export function createTraining(input: CreateTrainingInput): Promise<Training> {
  return request<Training>('v1/capacitaciones', {
    method: 'POST',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify(input),
  })
}


// CAP-02: la selección corresponde a familias, no a integrantes asumidos.
export function getTrainingFamilies(): Promise<TrainingFamily[]> {
  return request<TrainingFamily[]>('v1/capacitaciones/familias')
}

export function registerTrainingAttendance(trainingId: number, familiaIds: number[]): Promise<Training> {
  return request<Training>(`v1/capacitaciones/${trainingId}/asistencia-familiar`, {
    method: 'PUT',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ familiaIds }),
  })
}


export async function uploadTrainingPhoto(trainingId: number, file: File): Promise<TrainingEvidence> {
  const base = API_BASE.endsWith('/') ? API_BASE : `${API_BASE}/`
  const url = new URL(`v1/capacitaciones/${trainingId}/evidencias`, new URL(base, window.location.origin))
  const response = await fetch(url, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'Content-Type': file.type,
      'X-Requested-With': 'XMLHttpRequest',
      'X-File-Name': encodeURIComponent(file.name),
    },
    body: file,
  })
  const result: { data?: TrainingEvidence; error?: string | { message?: string } } | null = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof result?.error === 'string' ? result.error : result?.error?.message
    throw new Error(message || `No se pudo subir la fotografía (HTTP ${response.status}).`)
  }
  if (!result?.data) throw new Error('El servidor no confirmó la fotografía.')
  return result.data
}
