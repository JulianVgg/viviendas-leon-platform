export type ResumenDashboard = {
  alcance: 'INSTITUCIONAL' | 'PERSONAL'
  periodo: { meses: number; desde: string; hasta: string }
  indicadores: {
    familias: number | null
    huertosActivos: number | null
    ciclosActivos: number | null
    visitasRealizadas: number
    capacitaciones: number
    visitasVencidas: number
  }
  actividadMensual: Array<{ mes: string; etiqueta: string; visitas: number; capacitaciones: number }>
  programas: Array<{ id: number; nombre: string; familias: number }>
}

export async function consultarDashboard(meses: 3 | 6 | 12, signal?: AbortSignal): Promise<ResumenDashboard> {
  const response = await fetch(`/api/v1/dashboard/resumen?meses=${meses}`, {
    credentials: 'same-origin', cache: 'no-store', signal, headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(response.status === 401 ? 'Inicia sesión para consultar el dashboard.' : 'No se pudieron cargar los indicadores.')
  return (await response.json()) as ResumenDashboard
}

export type ResumenFamiliasProgramas = {
  totalFamilias: number
  familiasConPrograma: number
  familiasSinPrograma: number
  porcentajeCobertura: number
  programas: Array<{ id: number; nombre: string; estado: string; familias: number; porcentaje: number }>
  comunidades: Array<{ nombre: string; total: number; conPrograma: number }>
}

export async function consultarFamiliasProgramas(signal?: AbortSignal): Promise<ResumenFamiliasProgramas> {
  const response = await fetch('/api/v1/dashboard/resumen/familias-programas', {
    credentials: 'same-origin', cache: 'no-store', signal, headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error('No se pudo consultar la participación por programa.')
  return (await response.json()) as ResumenFamiliasProgramas
}
