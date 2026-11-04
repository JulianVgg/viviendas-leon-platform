/** Mismos identificadores autorizados por AI-01.2, con etiquetas breves para usuarios. */
export const ETIQUETAS_INDICADORES_IA: Record<string, string> = {
  'familias.registradas': 'Familias registradas',
  'familias.conPrograma': 'Familias con programa',
  'familias.sinPrograma': 'Familias sin programa',
  'familias.coberturaPorcentaje': 'Cobertura de programas',
  'visitas.realizadas': 'Visitas realizadas',
  'visitas.programadas': 'Visitas programadas',
  'visitas.vencidasEnPeriodo': 'Visitas vencidas',
  'visitas.reprogramadasEnPeriodo': 'Visitas reprogramadas',
  'capacitaciones.realizadas': 'Capacitaciones realizadas',
  'capacitaciones.programadas': 'Capacitaciones programadas',
  'agricultura.ciclosRegistrados': 'Ciclos agrícolas registrados',
  'agricultura.ciclosActivos': 'Ciclos activos',
  'agricultura.ciclosFinalizados': 'Ciclos finalizados',
  'agricultura.cultivosActivos': 'Cultivos activos',
  'agricultura.familiasConSiembras': 'Familias con siembras',
  'agricultura.plantasActivas': 'Plantas activas',
  'agricultura.registrosCosecha': 'Registros de cosecha',
  'agricultura.produccionConfirmada.kg': 'Producción confirmada (kg)',
  'agricultura.produccionConfirmada.unidades': 'Producción confirmada (unidades)',
  'agricultura.visitasQueReportanProduccion': 'Visitas con reporte de producción',
  'alertas.visitasVencidasActuales': 'Visitas vencidas actuales',
  'alertas.compromisosPendientes': 'Compromisos pendientes',
  'alertas.compromisosVencidos': 'Compromisos vencidos',
}

export function nombreIndicadorIA(codigo: string): string {
  return ETIQUETAS_INDICADORES_IA[codigo] ?? 'Indicador no disponible'
}
