import { harvestUnitKind } from '../agriculture/production.units.js'
import { periodoDashboard } from './dashboard-summary.rules.js'
import { decimalEscalado, expresarCantidad, type consolidarSemestre } from '../reports/semester.rules.js'

export type CicloAgricola = {
  id: number
  estado: string
  cantidadPlantas: number | null
  cultivo: { id: number; nombre: string }
  huerto: { familia: { id: number; comunidad: { nombre: string } } }
}
export type RegistroAgricola = {
  id: number
  fechaFinPeriodo: Date
  cicloCultivo: { cultivo: { id: number; nombre: string } }
  detalles: Array<{ cantidadTotal: unknown; unidadMedida: { codigo: string; abreviatura: string | null } }>
}

const activo = (estado: string) => ['ACTIVO', 'EN_CURSO', 'EN CURSO'].includes(estado.trim().toUpperCase())
const finalizado = (estado: string) => ['FINALIZADO', 'FINALIZADA', 'CERRADO', 'CERRADA', 'COMPLETADO', 'COMPLETADA'].includes(estado.trim().toUpperCase())
export function tipoUnidad(codigo: string, abreviatura: string | null): 'kg' | 'unidades' | 'manojos' | 'otra' {
  return harvestUnitKind({ codigo, abreviatura })
}
const numero = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null
  const n = Number(valor)
  return Number.isFinite(n) && n >= 0 ? n : null
}
// Las cosechas se guardan con hasta tres decimales; no truncar 0.001 kg.
const redondear = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000

export function resumirAgricultura(ciclos: CicloAgricola[], producciones: RegistroAgricola[], claves: string[]) {
  const cultivos = new Map<number, { id:number; nombre:string; ciclos:number; activos:number; plantas:number; kg:number; unidades:number; manojos:number }>()
  const comunidades = new Map<string, { nombre:string; familias:Set<number>; ciclosActivos:number }>()
  const meses = new Map(claves.map(mes => [mes, { mes, kg:0, unidades:0, manojos:0, registros:0 }]))
  const familias = new Set<number>()
  let ciclosActivos = 0, ciclosFinalizados = 0, plantasActivas = 0, kg = 0, unidades = 0, manojos = 0, unidadesOtras = 0
  let plantasSinDato = 0, cantidadesInvalidas = 0
  for (const ciclo of ciclos) {
    familias.add(ciclo.huerto.familia.id)
    const a = activo(ciclo.estado)
    const p = a ? numero(ciclo.cantidadPlantas) : 0
    if (a && p === null) plantasSinDato++
    const cultivo = cultivos.get(ciclo.cultivo.id) ?? { id:ciclo.cultivo.id, nombre:ciclo.cultivo.nombre, ciclos:0, activos:0, plantas:0, kg:0, unidades:0, manojos:0 }
    cultivo.ciclos++; if (a) { cultivo.activos++; cultivo.plantas += p ?? 0; ciclosActivos++; plantasActivas += p ?? 0 }
    if (finalizado(ciclo.estado)) ciclosFinalizados++
    cultivos.set(ciclo.cultivo.id, cultivo)
    const nombre = ciclo.huerto.familia.comunidad.nombre
    const comunidad = comunidades.get(nombre) ?? {nombre, familias:new Set<number>(), ciclosActivos:0}
    comunidad.familias.add(ciclo.huerto.familia.id)
    if (a) comunidad.ciclosActivos++
    comunidades.set(nombre, comunidad)
  }
  for (const produccion of producciones) {
    const mes = produccion.fechaFinPeriodo.toISOString().slice(0,7)
    const filaMes = meses.get(mes)
    if (filaMes) filaMes.registros++
    for (const detalle of produccion.detalles) {
      const cantidad = numero(detalle.cantidadTotal)
      if (cantidad === null) { cantidadesInvalidas++; continue }
      const tipo = tipoUnidad(detalle.unidadMedida.codigo, detalle.unidadMedida.abreviatura)
      const cultivo = cultivos.get(produccion.cicloCultivo.cultivo.id)
      if (tipo === 'kg') {
        kg += cantidad
        if (filaMes) filaMes.kg += cantidad
        if (cultivo) cultivo.kg += cantidad
      } else if (tipo === 'unidades') {
        unidades += cantidad
        if (filaMes) filaMes.unidades += cantidad
        if (cultivo) cultivo.unidades += cantidad
      } else if (tipo === 'manojos') {
        manojos += cantidad
        unidadesOtras++ // No se suman a kg o piezas, pero se muestran por separado.
        if (filaMes) filaMes.manojos += cantidad
        if (cultivo) cultivo.manojos += cantidad
      } else unidadesOtras++ // Cajas y otras unidades sin equivalencia verificada.
    }
  }
  return {
    indicadores: {
      ciclosRegistrados:ciclos.length, ciclosActivos, ciclosFinalizados,
      variedadesActivas:[...cultivos.values()].filter(c=>c.activos>0).length,
      familiasConSiembras:familias.size, plantasActivas,
      registrosProduccion:producciones.length, produccionKg:redondear(kg), produccionUnidades:redondear(unidades),
      produccionManojos:redondear(manojos), unidadesNoComparables:unidadesOtras, plantasSinDato, cantidadesInvalidas,
    },
    porCultivo:[...cultivos.values()].map(c=>({...c,kg:redondear(c.kg),unidades:redondear(c.unidades),manojos:redondear(c.manojos)}))
      .sort((a,b)=>b.activos-a.activos || a.nombre.localeCompare(b.nombre,'es')),
    porComunidad:[...comunidades.values()].map(c=>({nombre:c.nombre,familias:c.familias.size,ciclosActivos:c.ciclosActivos}))
      .sort((a,b)=>b.ciclosActivos-a.ciclosActivos || a.nombre.localeCompare(b.nombre,'es')),
    produccionMensual:[...meses.values()].map(m=>({...m,kg:redondear(m.kg),unidades:redondear(m.unidades),manojos:redondear(m.manojos)})),
  }
}

export function limitesAgricultura(fecha: Date, cantidadMeses: number) {
  const periodo = periodoDashboard(fecha, cantidadMeses)
  return { ...periodo, inicio: new Date(`${periodo.desde}T00:00:00Z`), fin: new Date(`${periodo.hoy}T00:00:00Z`) }
}

export function contarVisitasConProduccion(capturas: Array<{datos: unknown}>): number {
  return capturas.filter(({datos}) => {
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return false
    const cultivos = (datos as {crops?: unknown}).crops
    return Array.isArray(cultivos) && cultivos.some(c=>c && typeof c==='object' && (c as {production?:unknown}).production===true)
  }).length
}

// CIR-16: la producción de MON-04 reutiliza la consolidación de CIR-11.
// Los ciclos/siembras permanecen como indicadores operativos, no semestrales.
type ConsolidadoInstitucional = ReturnType<typeof consolidarSemestre>

export function aplicarConsolidadoInstitucional(
  base: ReturnType<typeof resumirAgricultura>,
  consolidado: ConsolidadoInstitucional,
  claves: string[],
) {
  const porCultivo = new Map(consolidado.porCultivo.map(item => [item.cultivoId, item]))
  const meses = new Map(claves.map(mes => [mes, {
    mes, kg: 0n, unidades: 0n, manojos: 0n, cosechas: new Set<number>(),
  }]))
  for (const detalle of consolidado.detalleCosechas) {
    if (typeof detalle.fechaFin !== 'string' || typeof detalle.unidad !== 'string' ||
        typeof detalle.cantidad !== 'string' || typeof detalle.cosechaId !== 'number') continue
    const mes = meses.get(detalle.fechaFin.slice(0, 7))
    const cantidad = decimalEscalado(detalle.cantidad, 3)
    if (!mes || cantidad === null || cantidad < 0n) continue
    if (detalle.unidad === 'kg' || detalle.unidad === 'unidades' || detalle.unidad === 'manojos') {
      mes[detalle.unidad] += cantidad
      mes.cosechas.add(detalle.cosechaId)
    }
  }
  const total = consolidado.resumen.cantidades
  return {
    ...base,
    indicadores: {
      ...base.indicadores,
      registrosProduccion: consolidado.resumen.cosechas,
      produccionKg: Number(total.kg),
      produccionUnidades: Number(total.unidades),
      produccionManojos: Number(total.manojos),
      unidadesNoComparables: consolidado.advertencias.filter(a => a.codigo === 'UNIDAD_O_CANTIDAD_INVALIDA').length,
      cantidadesInvalidas: consolidado.resumen.datosIncompletos,
    },
    porCultivo: base.porCultivo.map(item => {
      const oficial = porCultivo.get(item.id)
      return { ...item, kg: Number(oficial?.kg ?? '0'), unidades: Number(oficial?.unidades ?? '0'),
        manojos: Number(oficial?.manojos ?? '0') }
    }),
    produccionMensual: [...meses.values()].map(mes => ({
      mes: mes.mes, kg: Number(expresarCantidad(mes.kg)),
      unidades: Number(expresarCantidad(mes.unidades)),
      manojos: Number(expresarCantidad(mes.manojos)), registros: mes.cosechas.size,
    })),
    conciliacion: {
      criterio: 'CIR-11' as const,
      excluidasPrueba: consolidado.resumen.excluidasPrueba,
      excluidasCrucePeriodo: consolidado.resumen.excluidasCrucePeriodo,
      datosIncompletos: consolidado.resumen.datosIncompletos,
      posiblesDuplicados: consolidado.resumen.posiblesDuplicados,
    },
  }
}
