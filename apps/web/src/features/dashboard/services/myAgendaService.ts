export type AgendaItem = {
  id: string
  origenId: number | string
  tipo: 'EVENTO' | 'VISITA' | 'COMPROMISO'
  titulo: string
  detalle: string
  fecha: string | null
  fechaFin?: string
  estado: 'PROGRAMADA' | 'PENDIENTE' | 'VENCIDA'
  destino: '/calendario' | '/visitas/agenda'
}

export type MiAgendaResponse = {
  fechaHoy: string
  horizonte: string
  indicadores: {
    actividadesHoy: number
    proximasActividades: number
    visitasProgramadas: number
    compromisosPendientes: number
  }
  hoy: AgendaItem[]
  proximas: AgendaItem[]
  pendientes: AgendaItem[]
  modulos: { calendario: boolean; visitas: boolean }
}

export async function consultarMiAgenda(signal?: AbortSignal): Promise<MiAgendaResponse> {
  const response = await fetch('/api/v1/mi-agenda', {
    credentials: 'same-origin', cache: 'no-store', signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    if (response.status === 401) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
    if (response.status === 403) throw new Error('No tienes acceso a la agenda personal.')
    throw new Error('No fue posible cargar tu agenda. Intenta nuevamente.')
  }
  return response.json() as Promise<MiAgendaResponse>
}
