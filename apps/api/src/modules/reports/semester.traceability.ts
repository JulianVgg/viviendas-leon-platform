// CIR-13: filas auditables del mismo consolidado CIR-11 que alimenta la hoja institucional.
// Esta capa no consulta la base ni interpreta estimaciones de las visitas.
import type { InformeSemestralExcel } from './semester.excel-data.js'
import { decimalEscalado, expresarCantidad, expresarImporte } from './semester.rules.js'

export type FilaDetalleSemestral = {
  tipo: 'COSECHA' | 'VENTA'
  registroId: number
  detalleId: number | null
  cosechaId: number
  cicloId: number
  cultivoId: number
  cultivo: string
  familiaId: number
  familia: string
  comunidadId: number | null
  comunidad: string
  huertoId: number | null
  huerto: string | null
  visitaOrigenId: number | null
  fecha: string
  fechaFin: string | null
  unidad: string
  cantidad: string
  precioUnitario: string | null
  moneda: string | null
  importe: string | null
  observaciones: string | null
}

export type ConciliacionDetalle = {
  concepto: 'unidades' | 'kg' | 'manojos' | 'GTQ' | 'USD'
  detalle: string
  resumen: string
}

const leerTexto = (fila: Record<string, string | number | null>, campo: string): string => {
  const valor = fila[campo]
  return valor === null || valor === undefined ? '' : String(valor)
}
const leerOpcional = (fila: Record<string, string | number | null>, campo: string): string | null => {
  const texto = leerTexto(fila, campo)
  return texto === '' ? null : texto
}
const leerNumero = (fila: Record<string, string | number | null>, campo: string): number => {
  const dato = fila[campo]
  if (typeof dato !== 'number' || !Number.isSafeInteger(dato) || dato <= 0) {
    throw Error(`CIR-13: ${campo} inválido en registro del consolidado.`)
  }
  return dato
}
const leerNumeroOpcional = (fila: Record<string, string | number | null>, campo: string): number | null => {
  const dato = fila[campo]
  return dato === null || dato === undefined ? null : leerNumero(fila, campo)
}
const sumar = (filas: FilaDetalleSemestral[], tipo: 'COSECHA' | 'VENTA', unidad: string, moneda?: string) => {
  let acumulado = 0n
  for (const fila of filas) {
    if (fila.tipo !== tipo || (tipo === 'COSECHA' ? fila.unidad !== unidad : fila.moneda !== moneda)) continue
    if (tipo === 'VENTA' && fila.importe === null) continue
    const n = decimalEscalado(tipo === 'COSECHA' ? fila.cantidad : fila.importe!, tipo === 'COSECHA' ? 3 : 2)
    if (n === null || n < 0n) throw Error('CIR-13: cantidad o importe inválido en el detalle.')
    acumulado += n
  }
  return acumulado
}

/** Las cifras se contrastan en milésimas y centavos; no se mezclan unidades o monedas. */
export function prepararTrazabilidadSemestral(informe: InformeSemestralExcel): {
  filas: FilaDetalleSemestral[]; conciliacion: ConciliacionDetalle[]
} {
  const filas: FilaDetalleSemestral[] = []
  for (const dato of informe.detalleCosechas) {
    filas.push({
      tipo: 'COSECHA', registroId: leerNumero(dato, 'cosechaId'), detalleId: leerNumero(dato, 'id'),
      cosechaId: leerNumero(dato, 'cosechaId'), cicloId: leerNumero(dato, 'cicloId'),
      cultivoId: leerNumero(dato, 'cultivoId'), cultivo: leerTexto(dato, 'cultivo'),
      familiaId: leerNumero(dato, 'familiaId'), familia: leerTexto(dato, 'familia'),
      comunidadId: leerNumeroOpcional(dato, 'comunidadId'), comunidad: leerTexto(dato, 'comunidad'),
      huertoId: leerNumeroOpcional(dato, 'huertoId'), huerto: leerOpcional(dato, 'huerto'),
      visitaOrigenId: leerNumeroOpcional(dato, 'visitaOrigenId'),
      fecha: leerTexto(dato, 'fechaInicio'), fechaFin: leerOpcional(dato, 'fechaFin'),
      unidad: leerTexto(dato, 'unidad'), cantidad: leerTexto(dato, 'cantidad'),
      precioUnitario: null, moneda: null, importe: null,
      observaciones: leerOpcional(dato, 'observaciones'),
    })
  }
  for (const dato of informe.detalleVentas) {
    filas.push({
      tipo: 'VENTA', registroId: leerNumero(dato, 'id'), detalleId: null,
      cosechaId: leerNumero(dato, 'cosechaId'), cicloId: leerNumero(dato, 'cicloId'),
      cultivoId: leerNumero(dato, 'cultivoId'), cultivo: leerTexto(dato, 'cultivo'),
      familiaId: leerNumero(dato, 'familiaId'), familia: leerTexto(dato, 'familia'),
      comunidadId: leerNumeroOpcional(dato, 'comunidadId'), comunidad: leerTexto(dato, 'comunidad'),
      huertoId: leerNumeroOpcional(dato, 'huertoId'), huerto: leerOpcional(dato, 'huerto'),
      visitaOrigenId: leerNumeroOpcional(dato, 'visitaOrigenId'),
      fecha: leerTexto(dato, 'fecha'), fechaFin: null,
      unidad: leerTexto(dato, 'unidad'), cantidad: leerTexto(dato, 'cantidadVendida'),
      precioUnitario: leerOpcional(dato, 'precioUnitario'), moneda: leerOpcional(dato, 'moneda'),
      importe: leerOpcional(dato, 'importe'), observaciones: leerOpcional(dato, 'observaciones'),
    })
  }
  // Orden estable para identificar fácilmente la venta con su cosecha aunque pertenezcan a semestres distintos.
  filas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.cosechaId - b.cosechaId ||
    a.tipo.localeCompare(b.tipo) || a.registroId - b.registroId || (a.detalleId ?? 0) - (b.detalleId ?? 0))

  const conceptos = [
    { concepto: 'unidades' as const, total: sumar(filas, 'COSECHA', 'unidades'), resumen: informe.resumen.cantidades.unidades, escala: 3 },
    { concepto: 'kg' as const, total: sumar(filas, 'COSECHA', 'kg'), resumen: informe.resumen.cantidades.kg, escala: 3 },
    { concepto: 'manojos' as const, total: sumar(filas, 'COSECHA', 'manojos'), resumen: informe.resumen.cantidades.manojos, escala: 3 },
    { concepto: 'GTQ' as const, total: sumar(filas, 'VENTA', '', 'GTQ'), resumen: informe.resumen.totalVentasOriginalGTQ, escala: 2 },
    { concepto: 'USD' as const, total: sumar(filas, 'VENTA', '', 'USD'), resumen: informe.resumen.totalVentasOriginalUSD, escala: 2 },
  ]
  const conciliacion = conceptos.map(item => {
    const esperado = decimalEscalado(item.resumen, item.escala)
    if (esperado === null || item.total !== esperado) {
      throw Error(`CIR-13: el detalle de ${item.concepto} no concuerda con el resumen institucional.`)
    }
    return { concepto: item.concepto, detalle: item.escala === 3 ? expresarCantidad(item.total) : expresarImporte(item.total),
      resumen: item.resumen }
  })
  return { filas, conciliacion }
}
