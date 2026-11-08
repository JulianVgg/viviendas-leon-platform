import { querySemestral, nombreArchivoReporte } from './semesterReportFilters'
export type { FiltrosReporte, OpcionesReporte } from './semesterReportFilters'
import type { FiltrosReporte, OpcionesReporte } from './semesterReportFilters'

const API = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/$/, '')

export type InformeSemestral = {
  periodo: { anio: number; semestre: 1 | 2; desde: string; hasta: string }
  detalleCosechas: Array<{ id: number; fechaInicio: string; unidad: string; cantidad: string; cultivo: string }>
  detalleVentas: Array<{ id: number; fecha: string; moneda: string | null; importe: string | null; cultivo: string }>
  resumen: {
    cosechas: number; ventas: number; ventasConImporte: number
    cantidades: { kg: string; unidades: string; manojos: string }
    totalVentasOriginalGTQ: string; totalVentasOriginalUSD: string
    excluidasPrueba: number; excluidasCrucePeriodo: number; datosIncompletos: number; posiblesDuplicados: number
  }
  porCultivo: Array<{
    cultivoId: number; cultivo: string; cosechas: number; ventas: number
    kg: string; unidades: string; manojos: string
    totalVentasOriginalGTQ: string; totalVentasOriginalUSD: string
  }>
  advertencias: Array<{ codigo: string; referencia: number; mensaje: string }>
}

async function errorServidor(response: Response): Promise<string> {
  const data = await response.json().catch(() => null)
  return typeof data?.error?.message === 'string' ? data.error.message :
    response.status === 401 ? 'La sesión ha expirado. Vuelve a iniciar sesión.' :
    response.status === 403 ? 'No tienes permiso para consultar estos reportes.' :
    `No fue posible completar la consulta (${response.status}).`
}

async function consultar<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API}/v1/reportes/${path}`, {
    credentials: 'same-origin', cache: 'no-store', signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw Error(await errorServidor(response))
  const body = await response.json().catch(() => null)
  if (!body || !('data' in body)) throw Error('Respuesta incompleta del servidor.')
  return body.data as T
}

export const consultarOpcionesReporte = (signal?: AbortSignal) =>
  consultar<OpcionesReporte>('produccion-semestral/filtros', signal)

export const consultarReporteSemestral = (filtros: FiltrosReporte, signal?: AbortSignal) =>
  consultar<InformeSemestral>(`produccion-semestral?${querySemestral(filtros)}`, signal)

export async function descargarReporteSemestral(filtros: FiltrosReporte): Promise<void> {
  const response = await fetch(`${API}/v1/reportes/produccion-semestral.xlsx?${querySemestral(filtros)}`, {
    credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  })
  if (!response.ok) throw Error(await errorServidor(response))
  const blob = await response.blob()
  if (blob.size === 0) throw Error('El reporte descargado está vacío.')
  const url = URL.createObjectURL(blob)
  try {
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = nombreArchivoReporte(filtros)
    document.body.appendChild(enlace)
    enlace.click()
    enlace.remove()
  } finally {
    // Dar al navegador oportunidad de iniciar la descarga antes de liberar la URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
