/** Adaptadores puros: reutilizan los indicadores reales, nunca los datos demo de TailAdmin. */
import type {
  IndicadoresAgricolas,
  IndicadoresVisitasCapacitaciones,
  ResumenDashboard,
  ResumenFamiliasProgramas,
} from '../services/dashboardSummaryService'

export function seriesActividad(datos: ResumenDashboard['actividadMensual']) {
  return {
    labels: datos.map(item => item.etiqueta),
    series: [
      { name: 'Visitas realizadas', data: datos.map(item => item.visitas) },
      { name: 'Capacitaciones', data: datos.map(item => item.capacitaciones) },
    ],
  }
}

export function seriesCobertura(datos: ResumenFamiliasProgramas, programaId: number | 'todos') {
  const programa = datos.programas.find(item => item.id === programaId)
  const participantes = programa?.familias ?? datos.familiasConPrograma
  return {
    labels: ['Con programa', 'Sin programa'],
    values: [participantes, Math.max(0, datos.totalFamilias - participantes)],
  }
}

export function seriesProgramas(datos: ResumenFamiliasProgramas) {
  return {
    labels: datos.programas.map(item => item.nombre),
    series: [{ name: 'Familias', data: datos.programas.map(item => item.familias) }],
  }
}

export function seriesComunidadesFamilias(datos: ResumenFamiliasProgramas) {
  return {
    labels: datos.comunidades.map(item => item.nombre),
    series: [
      { name: 'Familias registradas', data: datos.comunidades.map(item => item.total) },
      { name: 'Con programa', data: datos.comunidades.map(item => item.conPrograma) },
    ],
  }
}

export function seriesActividadResponsables(responsables: IndicadoresVisitasCapacitaciones['porResponsable']) {
  return {
    labels: responsables.map(item => item.nombre),
    series: [
      { name: 'Visitas realizadas', data: responsables.map(item => item.visitas) },
      { name: 'Capacitaciones', data: responsables.map(item => item.capacitaciones) },
    ],
  }
}

export function seriesProduccion(datos: IndicadoresAgricolas, unidad: 'kg' | 'unidades') {
  return {
    labels: datos.produccionMensual.map(item => item.mes),
    series: [{ name: unidad === 'kg' ? 'Producción (kg)' : 'Producción (unidades)', data: datos.produccionMensual.map(item => item[unidad]) }],
  }
}

export function seriesComunidadesAgricolas(datos: IndicadoresAgricolas) {
  return {
    labels: datos.porComunidad.map(item => item.nombre),
    series: [
      { name: 'Ciclos activos', data: datos.porComunidad.map(item => item.ciclosActivos) },
      { name: 'Familias', data: datos.porComunidad.map(item => item.familias) },
    ],
  }
}
