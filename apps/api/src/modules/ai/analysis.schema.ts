/** AI-01.2: contrato público estable para AI-01.3. */
export const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    resumen: { type: 'string' },
    hallazgos: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { titulo: { type: 'string' }, descripcion: { type: 'string' }, indicadores: { type: 'array', items: { type: 'string' } } },
      required: ['titulo', 'descripcion', 'indicadores'] } },
    riesgos: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { titulo: { type: 'string' }, descripcion: { type: 'string' }, indicadores: { type: 'array', items: { type: 'string' } } },
      required: ['titulo', 'descripcion', 'indicadores'] } },
    recomendaciones: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { accion: { type: 'string' }, justificacion: { type: 'string' }, indicadores: { type: 'array', items: { type: 'string' } } },
      required: ['accion', 'justificacion', 'indicadores'] } },
    limitaciones: { type: 'array', items: { type: 'string' } },
  },
  required: ['resumen', 'hallazgos', 'riesgos', 'recomendaciones', 'limitaciones'],
} as const

export const INDICADORES_ADMITIDOS = [
  'familias.registradas', 'familias.conPrograma', 'familias.sinPrograma', 'familias.coberturaPorcentaje',
  'visitas.realizadas', 'visitas.programadas', 'visitas.vencidasEnPeriodo', 'visitas.reprogramadasEnPeriodo',
  'capacitaciones.realizadas', 'capacitaciones.programadas',
  'agricultura.ciclosRegistrados', 'agricultura.ciclosActivos', 'agricultura.ciclosFinalizados',
  'agricultura.cultivosActivos', 'agricultura.familiasConSiembras', 'agricultura.plantasActivas',
  'agricultura.registrosCosecha', 'agricultura.produccionConfirmada.kg',
  'agricultura.produccionConfirmada.unidades', 'agricultura.visitasQueReportanProduccion',
  'alertas.visitasVencidasActuales', 'alertas.compromisosPendientes', 'alertas.compromisosVencidos',
] as const

export type ReferenciaIndicador = typeof INDICADORES_ADMITIDOS[number]
export type ResultadoAnalisisIA = {
  resumen: string
  hallazgos: { titulo: string; descripcion: string; indicadores: ReferenciaIndicador[] }[]
  riesgos: { titulo: string; descripcion: string; indicadores: ReferenciaIndicador[] }[]
  recomendaciones: { accion: string; justificacion: string; indicadores: ReferenciaIndicador[] }[]
  limitaciones: string[]
}

function objeto(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === 'object' && !Array.isArray(x)
}
function texto(x: unknown, max = 600): x is string {
  return typeof x === 'string' && x.trim().length >= 1 && x.length <= max
}
function soloClaves(x: Record<string, unknown>, claves: string[]) {
  return Object.keys(x).length === claves.length && claves.every(k => Object.hasOwn(x, k))
}
function listaIndicadores(x: unknown): x is ReferenciaIndicador[] {
  return Array.isArray(x) && x.length > 0 && x.length <= 4 &&
    x.every(v => typeof v === 'string' && INDICADORES_ADMITIDOS.some(k => k === v)) &&
    new Set(x).size === x.length
}
function validarTarjetas(x: unknown, clase: 'recomendacion' | 'hallazgo'): boolean {
  if (!Array.isArray(x) || x.length > 4) return false
  return x.every(v => objeto(v) && (clase === 'recomendacion'
    ? soloClaves(v, ['accion', 'justificacion', 'indicadores']) && texto(v.accion, 110) && texto(v.justificacion) && listaIndicadores(v.indicadores)
    : soloClaves(v, ['titulo', 'descripcion', 'indicadores']) && texto(v.titulo, 110) && texto(v.descripcion) && listaIndicadores(v.indicadores)))
}

/** Validar además del esquema del proveedor: referencias, límites y ausencia de propiedades adicionales. */
export function validarResultadoAnalisisIA(valor: unknown): ResultadoAnalisisIA {
  if (!objeto(valor) || !soloClaves(valor, ['resumen','hallazgos','riesgos','recomendaciones','limitaciones']) ||
      !texto(valor.resumen, 1500) || !validarTarjetas(valor.hallazgos, 'hallazgo') ||
      !validarTarjetas(valor.riesgos, 'hallazgo') || !validarTarjetas(valor.recomendaciones, 'recomendacion') ||
      !Array.isArray(valor.limitaciones) || valor.limitaciones.length > 5 ||
      !valor.limitaciones.every(v => texto(v, 300))) {
    throw new Error('La respuesta de IA no cumple el formato esperado.')
  }
  return valor as ResultadoAnalisisIA
}
