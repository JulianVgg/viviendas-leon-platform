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

/**
 * Esquema específico de Gemini: explicita las restricciones que antes solo se
 * comprobaban al recibir la respuesta. No cambia el contrato de OpenAI.
 * Evitar maxLength: no pertenece al subconjunto de JSON Schema de Gemini.
 */
export const GEMINI_ANALYSIS_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    resumen: { type: 'string', description: 'Síntesis en español, de 1 a 1500 caracteres.' },
    hallazgos: { type: 'array', maxItems: 4, items: {
      type: 'object', additionalProperties: false,
      properties: {
        titulo: { type: 'string', description: 'Título, máximo 110 caracteres.' },
        descripcion: { type: 'string', description: 'Descripción basada en datos, máximo 600 caracteres.' },
        indicadores: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', enum: [...INDICADORES_ADMITIDOS] } },
      }, required: ['titulo', 'descripcion', 'indicadores'],
    } },
    riesgos: { type: 'array', maxItems: 4, items: {
      type: 'object', additionalProperties: false,
      properties: {
        titulo: { type: 'string', description: 'Título, máximo 110 caracteres.' },
        descripcion: { type: 'string', description: 'Riesgo sustentado en datos, máximo 600 caracteres.' },
        indicadores: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', enum: [...INDICADORES_ADMITIDOS] } },
      }, required: ['titulo', 'descripcion', 'indicadores'],
    } },
    recomendaciones: { type: 'array', maxItems: 4, items: {
      type: 'object', additionalProperties: false,
      properties: {
        accion: { type: 'string', description: 'Acción sugerida, máximo 110 caracteres.' },
        justificacion: { type: 'string', description: 'Motivo basado en datos, máximo 600 caracteres.' },
        indicadores: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', enum: [...INDICADORES_ADMITIDOS] } },
      }, required: ['accion', 'justificacion', 'indicadores'],
    } },
    limitaciones: { type: 'array', maxItems: 5, items: { type: 'string', description: 'Máximo 300 caracteres cada una.' } },
  },
  required: ['resumen', 'hallazgos', 'riesgos', 'recomendaciones', 'limitaciones'],
} as const

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
/** Solo códigos fijos para diagnósticos: nunca registrar contenido generado. */
function diagnosticarTarjetas(x: unknown, clase: 'recomendacion' | 'hallazgo', campo: string): string | null {
  if (!Array.isArray(x) || x.length > 4) return `${campo}_cantidad`
  for (const v of x) {
    if (!objeto(v) || !soloClaves(v, clase === 'recomendacion'
      ? ['accion', 'justificacion', 'indicadores'] : ['titulo', 'descripcion', 'indicadores'])) {
      return `${campo}_estructura`
    }
    if (clase === 'recomendacion' ? (!texto(v.accion, 110) || !texto(v.justificacion))
      : (!texto(v.titulo, 110) || !texto(v.descripcion))) return `${campo}_texto`
    if (!listaIndicadores(v.indicadores)) return `${campo}_referencias`
  }
  return null
}

export function diagnosticarResultadoAnalisisIA(valor: unknown): string | null {
  if (!objeto(valor) || !soloClaves(valor, ['resumen','hallazgos','riesgos','recomendaciones','limitaciones'])) {
    return 'estructura'
  }
  if (!texto(valor.resumen, 1500)) return 'resumen'
  const hallazgos = diagnosticarTarjetas(valor.hallazgos, 'hallazgo', 'hallazgos')
  if (hallazgos) return hallazgos
  const riesgos = diagnosticarTarjetas(valor.riesgos, 'hallazgo', 'riesgos')
  if (riesgos) return riesgos
  const recomendaciones = diagnosticarTarjetas(valor.recomendaciones, 'recomendacion', 'recomendaciones')
  if (recomendaciones) return recomendaciones
  if (!Array.isArray(valor.limitaciones) || valor.limitaciones.length > 5 ||
      !valor.limitaciones.every(v => texto(v, 300))) return 'limitaciones'
  return null
}

/** El backend sigue rechazando referencias inventadas y propiedades ajenas al contrato. */
export function validarResultadoAnalisisIA(valor: unknown): ResultadoAnalisisIA {
  if (diagnosticarResultadoAnalisisIA(valor)) throw new Error('La respuesta de IA no cumple el formato esperado.')
  return valor as ResultadoAnalisisIA
}
