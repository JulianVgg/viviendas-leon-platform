// MON-05 — filtros compartidos, siempre validados en la API.
export type FiltrosMon05 = { comunidadId?: number; responsableId?: number }

function leerId(valor: unknown): number | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined
  if (typeof valor !== 'string' || !/^[1-9]\d{0,8}$/.test(valor)) throw new Error('Filtro inválido.')
  const numero = Number(valor)
  if (!Number.isSafeInteger(numero)) throw new Error('Filtro inválido.')
  return numero
}

export function validarFiltrosMon05(entrada: { comunidadId?: unknown; responsableId?: unknown }, institucional: boolean): FiltrosMon05 {
  const comunidadId = leerId(entrada.comunidadId)
  const responsableId = leerId(entrada.responsableId)
  if (!institucional && (comunidadId !== undefined || responsableId !== undefined)) throw new Error('Filtro no autorizado.')
  return { ...(comunidadId ? { comunidadId } : {}), ...(responsableId ? { responsableId } : {}) }
}

export const filtroFamilia = (f: FiltrosMon05) => f.comunidadId ? { comunidadId: f.comunidadId } : {}
export const filtroHuerto = (f: FiltrosMon05) => f.comunidadId ? { familia: { comunidadId: f.comunidadId } } : {}
export const filtroCiclo = (f: FiltrosMon05) => f.comunidadId ? { huerto: { familia: { comunidadId: f.comunidadId } } } : {}
export const filtroProduccion = (f: FiltrosMon05) => f.comunidadId ? { cicloCultivo: { huerto: { familia: { comunidadId: f.comunidadId } } } } : {}
export const filtroVisita = (f: FiltrosMon05) => ({ ...(f.comunidadId ? { familia: { comunidadId: f.comunidadId } } : {}), ...(f.responsableId ? { usuarioResponsableId: f.responsableId } : {}) })
export const filtroCapacitacion = (f: FiltrosMon05) => ({ ...(f.comunidadId ? { comunidadId: f.comunidadId } : {}), ...(f.responsableId ? { usuarioResponsableId: f.responsableId } : {}) })
