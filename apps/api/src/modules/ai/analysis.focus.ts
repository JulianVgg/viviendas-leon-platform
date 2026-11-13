/** Preguntas permitidas: su contenido se define exclusivamente en el servidor. */
export const ENFOQUES_ANALISIS = ['resumen', 'prioridades', 'mejoras', 'fortalezas', 'plan'] as const
export type EnfoqueAnalisis = typeof ENFOQUES_ANALISIS[number]

export function esEnfoqueAnalisis(valor: unknown): valor is EnfoqueAnalisis {
  return typeof valor === 'string' && ENFOQUES_ANALISIS.some(enfoque => enfoque === valor)
}

/** Nunca aceptar instrucciones de texto libre en la solicitud del navegador. */
export function instruccionesPorEnfoque(enfoque: EnfoqueAnalisis = 'resumen'): string {
  switch (enfoque) {
    case 'prioridades': return `Identifica hasta cuatro áreas que merecen atención inmediata según indicadores comprobables.
Distingue problemas actuales de riesgos potenciales; ordena las recomendaciones por urgencia.
No describas una situación como crítica sin datos que lo respalden.`
    case 'mejoras': return `Propón mejoras operativas específicas, viables y proporcionadas a los indicadores disponibles.
En cada recomendación indica qué revisar, por qué y qué indicador permitiría evaluar el avance.
No atribuyas problemas a personas, presupuestos o causas que no estén registradas.`
    case 'fortalezas': return `Identifica resultados favorables observables y oportunidades de conservarlos o extenderlos.
No llames éxito a un cambio sin comparación histórica; distingue evidencia de hipótesis.
Explica también las limitaciones para evaluar desempeño.`
    case 'plan': return `Sugiere un plan breve de trabajo priorizado con acciones verificables para el equipo.
Cada acción debe tener un indicador de seguimiento y requerir revisión humana antes de ejecutarse.
No asignes responsables específicos, fechas inventadas ni presupuestos sin datos.`
    default: return `Elabora una visión general equilibrada: situación, hallazgos, riesgos y recomendaciones.
Da preferencia a lo importante sin repetir todos los números de entrada.`
  }
}
