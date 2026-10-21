// Los tipos visibles son independientes del texto libre para la opción OTRO.
// Se conservan las claves históricas para poder consultar eventos ya creados.
export type InstitutionalCategory =
  | 'SOPORTE' | 'CAPACITACION' | 'OFICINA_PANAJACHEL'
  | 'VISITA_ESTUDIANTES' | 'HOME_OFFICE' | 'COMPRA_RECOLECCION'
  | 'ENTREGA_PILONES' | 'OTRO'
  | 'OFICINA' | 'VISITA' | 'LOGISTICA' | 'REUNION'

// Resumen de solo lectura. La fuente es la tabla Visita, nunca EventoInstitucional.
export type CalendarTechnicalVisit = {
  id: number
  fecha: string
  estado: 'PROGRAMADA' | 'REALIZADA'
  familia: string
  comunidad: string
  responsable: string
}

export type CalendarPerson = { id: number; nombre: string; cargos: string[] }
export type CalendarEvent = {
  id: number; titulo: string; categoria: InstitutionalCategory; descripcion: string; lugar: string
  fechaInicio: string; fechaFin: string; horaInicio: string | null; horaFin: string | null
  responsable: CalendarPerson; creadoPor: string; participantes: CalendarPerson[]
}
// La API asigna responsableId automáticamente al creador y conserva el original al editar.
export type CalendarEventInput = {
  titulo: string; categoria: InstitutionalCategory; descripcion: string
  fechaInicio: string; participantesIds: number[]
}

export const eventTypes: { id: InstitutionalCategory; text: string; className: string }[] = [
  { id: 'SOPORTE', text: 'Visita de soporte técnico', className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-500/15 dark:text-blue-200' },
  { id: 'CAPACITACION', text: 'Capacitación', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200' },
  { id: 'OFICINA_PANAJACHEL', text: 'Oficina Panajachel', className: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-200' },
  { id: 'VISITA_ESTUDIANTES', text: 'Visita de estudiantes', className: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-500/15 dark:text-violet-200' },
  { id: 'HOME_OFFICE', text: 'Home Office', className: 'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200' },
  { id: 'COMPRA_RECOLECCION', text: 'Compra y recolección', className: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-500/15 dark:text-amber-200' },
  { id: 'ENTREGA_PILONES', text: 'Entrega de pilones', className: 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-900 dark:bg-cyan-500/15 dark:text-cyan-200' },
  { id: 'OTRO', text: 'Otro', className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-500/15 dark:text-rose-200' },
]

export function eventDisplayTitle(event: Pick<CalendarEvent, 'titulo'|'categoria'>): string {
  const preset = eventTypes.find(item => item.id === event.categoria)
  return preset && preset.id !== 'OTRO' ? preset.text : event.titulo
}
export function eventColor(categoria: InstitutionalCategory): string {
  return eventTypes.find(item => item.id === categoria)?.className ??
    'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
}

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
export async function loadCalendarView(from: string, to: string): Promise<{events:CalendarEvent[]; visits:CalendarTechnicalVisit[]}> {
  const answer = await request<{data:CalendarEvent[]; visitasTecnicas:CalendarTechnicalVisit[]}>(`?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
  return {events: answer.data, visits: answer.visitasTecnicas ?? []}
}
export async function loadEvents(from: string, to: string): Promise<CalendarEvent[]> {
  return (await loadCalendarView(from, to)).events
}
export async function loadParticipants(): Promise<CalendarPerson[]> {
  return (await request<{data:CalendarPerson[]}>('/usuarios')).data
}
export async function saveEvent(data: CalendarEventInput, id?: number): Promise<void> {
  await request(id ? `/${id}` : '/', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data),
    ...(!id ? { headers: { 'X-Operation-Id': crypto.randomUUID() } } : {}),
  })
}
export async function removeEvent(id: number): Promise<void> {
  await request(`/${id}`, { method:'DELETE' })
}
