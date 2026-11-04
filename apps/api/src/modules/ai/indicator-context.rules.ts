// AI-01.1: contrato interno. Se construye EXCLUSIVAMENTE a partir de contadores,
// fechas y agrupaciones permitidas; nunca se serializan objetos Prisma completos.
// No enviar este objeto a proveedores externos hasta aprobar AI-01.2.

export const VERSION_CONTEXTO_IA = 'AI-01.1/v1' as const
export const MESES_ANALISIS = [3, 6, 12] as const

export type PeriodoIndicador = { meses: number; desde: string; hasta: string }
export type ResultadoDashboardIA = {
  alcance: string
  periodo: PeriodoIndicador
  indicadores: {
    familias: number | null; huertosActivos: number | null; ciclosActivos: number | null
    visitasRealizadas: number; capacitaciones: number; visitasVencidas: number
  }
  actividadMensual: Array<{ mes: string; visitas: number; capacitaciones: number; etiqueta?: string }>
  programas: Array<{ id: number; nombre: string; familias: number }>
}
export type ResultadoFamiliasIA = {
  totalFamilias: number; familiasConPrograma: number; familiasSinPrograma: number; porcentajeCobertura: number
  programas: Array<{ id: number; nombre: string; familias: number; porcentaje: number }>
  comunidades: Array<{ nombre: string; total: number; conPrograma: number }>
}
export type ResultadoActividadIA = {
  alcance: string; periodo: PeriodoIndicador
  visitas: { realizadas: number; programadas: number; vencidas: number; reprogramadas: number }
  capacitaciones: { realizadas: number; programadas: number; otras: number }
  porResponsable?: Array<{ nombre: string; id: string; visitas: number; capacitaciones: number }>
}
export type ResultadoAgriculturaIA = {
  periodo: PeriodoIndicador
  indicadores: {
    ciclosRegistrados: number; ciclosActivos: number; ciclosFinalizados: number
    variedadesActivas: number; familiasConSiembras: number; plantasActivas: number
    registrosProduccion: number; produccionKg: number; produccionUnidades: number; unidadesNoComparables: number
  }
  visitasConProduccion: number
  porCultivo: Array<{ id: number; nombre: string; activos: number; ciclos: number; plantas: number; kg: number; unidades: number }>
  porComunidad: Array<{ nombre: string; familias: number; ciclosActivos: number }>
  produccionMensual: Array<{ mes: string; kg: number; unidades: number; registros: number }>
}
export type ResultadoAlertasIA = {
  fechaHoy: string
  indicadores: { visitasVencidas: number; compromisosPendientes: number; compromisosVencidos: number }
  // Intencionalmente NO tipar los listados de visitas/compromisos: contienen datos sensibles.
}

export function validarParametrosContextoIA(meses: number, filtros: { comunidadId?: number; responsableId?: number }) {
  if (!MESES_ANALISIS.includes(meses as typeof MESES_ANALISIS[number])) throw new Error('Período inválido para análisis.')
  for (const id of [filtros.comunidadId, filtros.responsableId]) {
    if (id !== undefined && (!Number.isSafeInteger(id) || id <= 0 || id > 999_999_999)) throw new Error('Filtro inválido para análisis.')
  }
}

function cantidad(n: number, campo: string): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) throw new Error(`Indicador inválido: ${campo}.`)
  return n
}
function entero(n: number, campo: string): number {
  cantidad(n, campo)
  if (!Number.isSafeInteger(n)) throw new Error(`Indicador inválido: ${campo}.`)
  return n
}
function fechaDia(d: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error('Fecha inválida en indicadores.')
  return d
}
function fechaMes(d: string): string {
  if (!/^\d{4}-\d{2}$/.test(d)) throw new Error('Mes inválido en indicadores.')
  return d
}
function periodo(p: PeriodoIndicador): PeriodoIndicador {
  return { meses: entero(p.meses, 'periodo.meses'), desde: fechaDia(p.desde), hasta: fechaDia(p.hasta) }
}

export type FuentesConsolidadasIA = {
  resumen: ResultadoDashboardIA
  familias: ResultadoFamiliasIA
  actividad: ResultadoActividadIA
  agricultura: ResultadoAgriculturaIA
  alertas: ResultadoAlertasIA
}

/** JSON seguro para la siguiente historia; no incluye personas, expedientes, texto libre ni IDs de usuario. */
export function construirContextoIndicadoresIA(
  fuentes: FuentesConsolidadasIA,
  parametros: { meses: number; comunidadFiltrada: boolean; responsableFiltrado: boolean; generadoEn: Date },
) {
  validarParametrosContextoIA(parametros.meses, {})
  const { resumen, familias, actividad, agricultura, alertas } = fuentes
  if (resumen.alcance !== 'INSTITUCIONAL' || actividad.alcance !== 'INSTITUCIONAL') {
    throw new Error('Solo se consolidan indicadores institucionales autorizados.')
  }
  if (resumen.periodo.meses !== parametros.meses || actividad.periodo.meses !== parametros.meses || agricultura.periodo.meses !== parametros.meses) {
    throw new Error('Los indicadores corresponden a períodos diferentes.')
  }
  if (resumen.indicadores.familias === null || resumen.indicadores.huertosActivos === null || resumen.indicadores.ciclosActivos === null) {
    throw new Error('Faltan indicadores institucionales.')
  }
  if (!Number.isFinite(parametros.generadoEn.getTime())) throw new Error('Fecha de generación inválida.')

  const n = entero
  const d = cantidad
  const ia = agricultura.indicadores
  const fa = familias
  const av = actividad.visitas
  const ac = actividad.capacitaciones
  const al = alertas.indicadores
  const total = n(fa.totalFamilias, 'familias.total')
  const conPrograma = n(fa.familiasConPrograma, 'familias.conPrograma')
  const sinPrograma = n(fa.familiasSinPrograma, 'familias.sinPrograma')
  if (conPrograma + sinPrograma !== total || n(fa.porcentajeCobertura, 'familias.cobertura') > 100) {
    throw new Error('La cobertura de familias no es consistente.')
  }
  if (n(al.compromisosVencidos, 'alertas.compromisosVencidos') > n(al.compromisosPendientes, 'alertas.compromisosPendientes')) {
    throw new Error('Los compromisos vencidos exceden los pendientes.')
  }
  const hoyAlertas = fechaDia(alertas.fechaHoy)

  // Construcción por lista blanca. Los nombres de usuarios, familias, observaciones,
  // teléfonos, evidencias y etiquetas de texto libre nunca se incluyen en el resultado.
  return {
    version: VERSION_CONTEXTO_IA,
    generadoEn: parametros.generadoEn.toISOString(),
    alcance: 'INSTITUCIONAL' as const,
    zonaHoraria: 'America/Guatemala' as const,
    filtros: { meses: parametros.meses, comunidad: parametros.comunidadFiltrada ? 'FILTRADA' : 'TODAS',
      responsable: parametros.responsableFiltrado ? 'FILTRADO' : 'TODOS' },
    periodos: {
      dashboard: periodo(resumen.periodo),
      actividad: periodo(actividad.periodo),
      agricultura: periodo(agricultura.periodo),
      familias: { corte: hoyAlertas, tipo: 'ESTADO_VIGENTE' as const },
      alertas: { corte: hoyAlertas, tipo: 'ESTADO_VIGENTE' as const },
    },
    familias: {
      registradas: total, conPrograma, sinPrograma,
      coberturaPorcentaje: d(fa.porcentajeCobertura, 'familias.cobertura'),
      // Referencias sin nombres: AI-01.2 podrá resolverlas localmente en la interfaz.
      porPrograma: fa.programas.map(p => ({ referencia: `PROGRAMA_${n(p.id, 'programa.id')}`,
        familias: n(p.familias, 'programa.familias'), porcentaje: d(p.porcentaje, 'programa.porcentaje') })),
    },
    visitas: {
      realizadas: n(av.realizadas, 'visitas.realizadas'), programadas: n(av.programadas, 'visitas.programadas'),
      vencidasEnPeriodo: n(av.vencidas, 'visitas.vencidas'), reprogramadasEnPeriodo: n(av.reprogramadas, 'visitas.reprogramadas'),
    },
    capacitaciones: { realizadas: n(ac.realizadas, 'capacitaciones.realizadas'),
      programadas: n(ac.programadas, 'capacitaciones.programadas'), otras: n(ac.otras, 'capacitaciones.otras') },
    actividadMensual: resumen.actividadMensual.map(m => ({ mes: fechaMes(m.mes),
      visitasRealizadas: n(m.visitas, 'actividadMensual.visitas'),
      capacitacionesRegistradas: n(m.capacitaciones, 'actividadMensual.capacitaciones') })),
    agricultura: {
      ciclosRegistrados: n(ia.ciclosRegistrados, 'agricultura.ciclosRegistrados'),
      ciclosActivos: n(ia.ciclosActivos, 'agricultura.ciclosActivos'),
      ciclosFinalizados: n(ia.ciclosFinalizados, 'agricultura.ciclosFinalizados'),
      cultivosActivos: n(ia.variedadesActivas, 'agricultura.variedadesActivas'),
      familiasConSiembras: n(ia.familiasConSiembras, 'agricultura.familiasConSiembras'),
      plantasActivas: d(ia.plantasActivas, 'agricultura.plantasActivas'),
      registrosCosecha: n(ia.registrosProduccion, 'agricultura.registrosCosecha'),
      produccionConfirmada: { kg: d(ia.produccionKg, 'agricultura.kg'), unidades: d(ia.produccionUnidades, 'agricultura.unidades') },
      registrosEnOtrasUnidades: n(ia.unidadesNoComparables, 'agricultura.otrasUnidades'),
      // Estas capturas NO se suman a producción confirmada.
      visitasQueReportanProduccion: n(agricultura.visitasConProduccion, 'agricultura.visitasConProduccion'),
      produccionMensual: agricultura.produccionMensual.map(m => ({ mes: fechaMes(m.mes),
        kg: d(m.kg, 'agricultura.mes.kg'), unidades: d(m.unidades, 'agricultura.mes.unidades'),
        registros: n(m.registros, 'agricultura.mes.registros') })),
    },
    alertas: { visitasVencidasActuales: n(al.visitasVencidas, 'alertas.visitasVencidas'),
      compromisosPendientes: n(al.compromisosPendientes, 'alertas.compromisosPendientes'),
      compromisosVencidos: n(al.compromisosVencidos, 'alertas.compromisosVencidos') },
    advertencias: [
      'Familias, programas, ciclos activos y alertas reflejan estados actuales, no acumulados del período.',
      'MON-03 llega hasta el fin del mes en curso e incluye actividades futuras programadas; dashboard y agricultura solo llegan hasta hoy.',
      'Los reportes de producción de visitas no equivalen a cosechas confirmadas.',
      'Los compromisos vencidos están incluidos en el total de compromisos pendientes.',
      'Los totales en kilogramos y unidades son magnitudes distintas; no se suman.',
      'La información consolidada es descriptiva y no demuestra causalidad.',
    ],
    fuentes: ['MON-01', 'MON-02', 'MON-03', 'MON-04', 'MON-05', 'MON-06'] as const,
  }
}
