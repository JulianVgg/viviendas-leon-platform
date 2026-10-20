export type InstitutionalCategory = 'SOPORTE' | 'CAPACITACION' | 'OFICINA' | 'VISITA' | 'LOGISTICA' | 'REUNION' | 'OTRO'
export type CalendarPerson = { id: number; nombre: string; cargos: string[] }
export type CalendarEvent = {
  id: number; titulo: string; categoria: InstitutionalCategory; descripcion: string; lugar: string
  fechaInicio: string; fechaFin: string; horaInicio: string | null; horaFin: string | null
  responsable: CalendarPerson; creadoPor: string; participantes: CalendarPerson[]
}
export type CalendarEventInput = {
  titulo: string; categoria: InstitutionalCategory; descripcion: string; lugar: string
  fechaInicio: string; fechaFin: string; horaInicio: string | null; horaFin: string | null
  responsableId: number; participantesIds: number[]
}

export const categories: { id: InstitutionalCategory; text: string; className: string }[] = [
  { id: 'SOPORTE', text: 'Soporte técnico', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200' },
  { id: 'CAPACITACION', text: 'Capacitación', className: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-200' },
  { id: 'OFICINA', text: 'Oficina / trabajo interno', className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-200' },
  { id: 'VISITA', text: 'Visita institucional', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200' },
  { id: 'LOGISTICA', text: 'Logística / compras', className: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200' },
  { id: 'REUNION', text: 'Reunión', className: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-200' },
  { id: 'OTRO', text: 'Otro', className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200' },
]

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/calendario${path}`, { cache:'no-store', credentials:'same-origin', ...init, headers: {
    Accept: 'application/json', ...(init?.body ? {'Content-Type':'application/json'} : {}),
    ...(init?.method && init.method !== 'GET' ? {'X-Requested-With':'XMLHttpRequest'} : {}), ...init?.headers,
  } })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string | { message?: string } } | null
    const message = typeof body?.error === 'string' ? body.error : body?.error?.message
    throw new Error(message || (response.status === 401 ? 'Inicia sesión nuevamente.' : response.status === 403 ? 'No tienes permisos para consultar o modificar el calendario.' : `Error ${response.status}.`))
  }
  return response.json() as Promise<T>
}
export async function loadEvents(from: string, to: string): Promise<CalendarEvent[]> {
  const answer = await request<{data:CalendarEvent[]}>(`?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
  return answer.data
}
export async function loadParticipants(): Promise<CalendarPerson[]> {
  return (await request<{data:CalendarPerson[]}>('/usuarios')).data
}
export async function saveEvent(data: CalendarEventInput, id?: number): Promise<void> {
  await request(id ? `/${id}` : '/', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) })
}
export async function removeEvent(id: number): Promise<void> {
  await request(`/${id}`, { method:'DELETE' })
}
