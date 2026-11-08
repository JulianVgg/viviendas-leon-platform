// CIR-11: reglas puras de consolidación institucional. No incluye estimaciones de visitas.
// Las cantidades se calculan en milésimas y las ventas en centavos (sin floats monetarios).
export type TipoCosechaUnidad = 'kg' | 'unidades' | 'manojos' | 'otra'
export type MonedaReporte = 'GTQ' | 'USD'

export type FiltrosSemestrales = { anio: number; semestre: 1 | 2; comunidadId?: number; familiaId?: number }
export type PeriodoSemestral = {
  anio: number; semestre: 1 | 2; desde: string; hasta: string; hastaExclusivo: string
}
export type CosechaFuente = {
  id: number; cicloId: number; cultivoId: number; cultivo: string; familiaId: number; familia: string
  comunidadId: number; comunidad: string; huertoId?: number | null; huerto?: string | null
  cantidadPlantas: number | null; visitaOrigenId?: number | null
  fechaInicio: string; fechaFin: string; observaciones: string | null
  esDatoPrueba: boolean
  detalles: Array<{ id: number; cantidad: string; tipo: TipoCosechaUnidad; unidadCodigo: string }>
}
export type VentaFuente = {
  id: number; cosechaId: number; cicloId: number; cultivoId: number; cultivo: string
  familiaId: number; familia: string; comunidadId: number; comunidad: string
  huertoId?: number | null; huerto?: string | null; visitaOrigenId?: number | null
  observaciones?: string | null
  fecha: string; cantidad: string; tipo: TipoCosechaUnidad; unidadCodigo: string
  precioUnitario: string | null; moneda: string | null; cantidadPrecios: number
  esDatoPrueba: boolean
}

const parseId = (value: unknown): number | undefined => {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !/^[1-9]\d{0,8}$/.test(value)) throw Error('Identificador de filtro inválido.')
  const id = Number(value)
  if (!Number.isSafeInteger(id)) throw Error('Identificador de filtro inválido.')
  return id
}
export function validarFiltrosSemestrales(query: Record<string, unknown>): FiltrosSemestrales {
  if (typeof query.anio !== 'string' || !/^20\d{2}$/.test(query.anio)) throw Error('Selecciona un año entre 2000 y 2099.')
  if (query.semestre !== '1' && query.semestre !== '2') throw Error('Selecciona el primer o segundo semestre.')
  return {
    anio: Number(query.anio), semestre: query.semestre === '1' ? 1 : 2,
    ...(parseId(query.comunidadId) ? { comunidadId: parseId(query.comunidadId) } : {}),
    ...(parseId(query.familiaId) ? { familiaId: parseId(query.familiaId) } : {}),
  }
}
export function definirPeriodo({ anio, semestre }: FiltrosSemestrales): PeriodoSemestral {
  const inicio = semestre === 1 ? '01-01' : '07-01'
  const fin = semestre === 1 ? '06-30' : '12-31'
  return {
    anio, semestre, desde: `${anio}-${inicio}`, hasta: `${anio}-${fin}`,
    hastaExclusivo: semestre === 1 ? `${anio}-07-01` : `${anio + 1}-01-01`,
  }
}

// Se aceptan los decimales documentados: 3 para cantidades y 4 para precios.
export function decimalEscalado(texto: string, decimales: number): bigint | null {
  if (typeof texto !== 'string' || !/^\d{1,12}(?:\.\d{1,4})?$/.test(texto)) return null
  const [entero, fraccion = ''] = texto.split('.')
  if (fraccion.length > decimales) return null
  return BigInt(entero) * 10n ** BigInt(decimales) + BigInt(fraccion.padEnd(decimales, '0') || '0')
}
export function expresarCantidad(milesimas: bigint): string {
  const signo = milesimas < 0n ? '-' : ''
  const valor = milesimas < 0n ? -milesimas : milesimas
  const fraccion = (valor % 1000n).toString().padStart(3, '0').replace(/0+$/, '')
  return signo + (valor / 1000n).toString() + (fraccion ? `.${fraccion}` : '')
}
export function expresarImporte(centavos: bigint): string {
  const signo = centavos < 0n ? '-' : ''
  const valor = centavos < 0n ? -centavos : centavos
  return `${signo}${valor / 100n}.${(valor % 100n).toString().padStart(2, '0')}`
}
export function calcularImporteVenta(cantidad: string, precio: string): bigint | null {
  const mil = decimalEscalado(cantidad, 3)
  const diezMil = decimalEscalado(precio, 4)
  if (mil === null || diezMil === null || mil <= 0n || diezMil <= 0n) return null
  // milésimas × diezmilésimas → centavos, HALF_UP por cada venta.
  return (mil * diezMil + 50_000n) / 100_000n
}

// Consulta paginada por clave primaria: no se pierde el registro 501 ni los siguientes.
export async function paginarPorId<T extends { id: number }>(
  consultar: (cursor: number | undefined, take: number) => Promise<T[]>, tamano = 400,
): Promise<T[]> {
  const resultado: T[] = []
  let cursor: number | undefined
  for (;;) {
    const lote = await consultar(cursor, tamano)
    if (lote.length === 0) break
    const ultimo = lote[lote.length - 1].id
    if (cursor !== undefined && ultimo <= cursor) throw Error('La paginación no avanzó.')
    resultado.push(...lote)
    cursor = ultimo
    if (lote.length < tamano) break
  }
  return resultado
}

const tiposValidos: TipoCosechaUnidad[] = ['kg', 'unidades', 'manojos']
const cantidades = () => ({ kg: 0n, unidades: 0n, manojos: 0n })
type Totales = ReturnType<typeof cantidades>
const mostrarTotales = (totales: Totales) => ({
  kg: expresarCantidad(totales.kg), unidades: expresarCantidad(totales.unidades),
  manojos: expresarCantidad(totales.manojos),
})
type Acumulado = {
  cultivoId: number; cultivo: string; cantidades: Totales; ventaGTQ: bigint; ventaUSD: bigint
  ciclosConProduccion: Map<number, number | null>; cosechas: Set<number>; ventas: Set<number>
}
const crearGrupo = (cultivoId: number, cultivo: string): Acumulado => ({
  cultivoId, cultivo, cantidades: cantidades(), ventaGTQ: 0n, ventaUSD: 0n,
  ciclosConProduccion: new Map(), cosechas: new Set(), ventas: new Set(),
})
const esFechaPeriodo = (fecha: string, periodo: PeriodoSemestral) =>
  fecha >= periodo.desde && fecha < periodo.hastaExclusivo
const reglaPlantas = (grupo: Acumulado) => {
  if (grupo.ciclosConProduccion.size === 0) return null
  const valores = [...grupo.ciclosConProduccion.values()]
  return valores.every(valor => valor !== null && Number.isInteger(valor) && valor > 0)
    ? valores.reduce<number>((total, valor) => total + (valor ?? 0), 0) : null
}

export function consolidarSemestre(periodo: PeriodoSemestral, cosechas: CosechaFuente[], ventas: VentaFuente[]) {
  const grupos = new Map<number, Acumulado>()
  const totales = cantidades()
  let gtq = 0n, usd = 0n, cosechasIncluidas = 0, ventasConImporte = 0
  let excluidasPrueba = 0, excluidasCrucePeriodo = 0, datosIncompletos = 0, posiblesDuplicados = 0
  const advertencias: Array<{ codigo: string; referencia: number; mensaje: string }> = []
  const detalleCosechas: Array<Record<string, string | number | null>> = []
  const detalleVentas: Array<Record<string, string | number | null>> = []
  const vistosCosechas = new Set<number>()
  const vistosVentas = new Set<number>()
  const firmasCosecha = new Map<string, number>()
  const firmasVenta = new Map<string, number>()
  const grupo = (id: number, nombre: string) => {
    let actual = grupos.get(id)
    if (!actual) { actual = crearGrupo(id, nombre); grupos.set(id, actual) }
    return actual
  }
  for (const cosecha of cosechas) {
    if (vistosCosechas.has(cosecha.id)) continue
    vistosCosechas.add(cosecha.id)
    if (cosecha.esDatoPrueba) { excluidasPrueba++; continue }
    if (!esFechaPeriodo(cosecha.fechaInicio, periodo) || !esFechaPeriodo(cosecha.fechaFin, periodo)) {
      excluidasCrucePeriodo++
      advertencias.push({ codigo: 'PERIODO_CRUZADO', referencia: cosecha.id,
        mensaje: 'La cosecha cruza semestres o contiene fechas inconsistentes; requiere revisión antes de sumarse.' })
      continue
    }
    const firmaCosecha = JSON.stringify([cosecha.cicloId, cosecha.fechaInicio, cosecha.fechaFin,
      [...cosecha.detalles].map(d => [d.tipo, d.cantidad, d.unidadCodigo]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))])
    const anteriorCosecha = firmasCosecha.get(firmaCosecha)
    if (anteriorCosecha !== undefined) {
      posiblesDuplicados++
      advertencias.push({ codigo: 'POSIBLE_COSECHA_DUPLICADA', referencia: cosecha.id,
        mensaje: `Coincide en ciclo, período y cantidades con la cosecha ${anteriorCosecha}; revisar origen. No se fusiona automáticamente.` })
    } else firmasCosecha.set(firmaCosecha, cosecha.id)
    const fila = grupo(cosecha.cultivoId, cosecha.cultivo)
    cosechasIncluidas++
    fila.cosechas.add(cosecha.id)
    fila.ciclosConProduccion.set(cosecha.cicloId, cosecha.cantidadPlantas)
    if (cosecha.detalles.length === 0) {
      datosIncompletos++
      advertencias.push({ codigo: 'COSECHA_SIN_DETALLES', referencia: cosecha.id,
        mensaje: 'El registro no contiene cantidades; requiere revisión.' })
    }
    for (const detalle of cosecha.detalles) {
      const n = decimalEscalado(detalle.cantidad, 3)
      if (n === null || n <= 0n || !tiposValidos.includes(detalle.tipo) ||
        (detalle.tipo !== 'kg' && n % 1000n !== 0n)) {
        datosIncompletos++
        advertencias.push({ codigo: 'UNIDAD_O_CANTIDAD_INVALIDA', referencia: cosecha.id,
          mensaje: `Revisar detalle de cosecha ${detalle.id}; no se agregó al total.` })
        continue
      }
      const tipo = detalle.tipo as keyof Totales
      fila.cantidades[tipo] += n
      totales[tipo] += n
      detalleCosechas.push({ id: detalle.id, cosechaId: cosecha.id, cicloId: cosecha.cicloId,
        cultivoId: cosecha.cultivoId, cultivo: cosecha.cultivo, familiaId: cosecha.familiaId, familia: cosecha.familia,
        comunidadId: cosecha.comunidadId, comunidad: cosecha.comunidad,
        huertoId: cosecha.huertoId ?? null, huerto: cosecha.huerto ?? null,
        visitaOrigenId: cosecha.visitaOrigenId ?? null,
        fechaInicio: cosecha.fechaInicio, fechaFin: cosecha.fechaFin,
        unidad: tipo, cantidad: expresarCantidad(n), observaciones: cosecha.observaciones })
    }
  }
  for (const venta of ventas) {
    if (vistosVentas.has(venta.id)) continue
    vistosVentas.add(venta.id)
    if (venta.esDatoPrueba) { excluidasPrueba++; continue }
    if (!esFechaPeriodo(venta.fecha, periodo)) continue
    const firmaVenta = JSON.stringify([venta.cosechaId, venta.fecha, venta.cantidad,
      venta.unidadCodigo, venta.precioUnitario, venta.moneda])
    const anteriorVenta = firmasVenta.get(firmaVenta)
    if (anteriorVenta !== undefined) {
      posiblesDuplicados++
      advertencias.push({ codigo: 'POSIBLE_VENTA_DUPLICADA', referencia: venta.id,
        mensaje: `Coincide con los datos de la venta ${anteriorVenta}; revisar origen. No se fusiona automáticamente.` })
    } else firmasVenta.set(firmaVenta, venta.id)
    const fila = grupo(venta.cultivoId, venta.cultivo)
    fila.ventas.add(venta.id)
    const moneda = venta.moneda?.toUpperCase()
    const cantidadMili = decimalEscalado(venta.cantidad, 3)
    const cantidadValida = cantidadMili !== null && cantidadMili > 0n &&
      (venta.tipo === 'kg' || cantidadMili % 1000n === 0n)
    const importe = venta.cantidadPrecios === 1 && (moneda === 'GTQ' || moneda === 'USD') &&
      tiposValidos.includes(venta.tipo) && cantidadValida &&
      venta.precioUnitario !== null ? calcularImporteVenta(venta.cantidad, venta.precioUnitario) : null
    if (importe === null || importe === 0n) {
      datosIncompletos++
      advertencias.push({ codigo: 'VENTA_INCOMPLETA', referencia: venta.id,
        mensaje: 'La venta no tiene un precio único oficial, unidad válida o cantidad verificable; no se suma dinero.' })
    } else if (moneda === 'GTQ') { fila.ventaGTQ += importe; gtq += importe; ventasConImporte++ }
    else { fila.ventaUSD += importe; usd += importe; ventasConImporte++ }
    detalleVentas.push({ id: venta.id, cosechaId: venta.cosechaId, cicloId: venta.cicloId,
      cultivoId: venta.cultivoId, cultivo: venta.cultivo, familiaId: venta.familiaId, familia: venta.familia,
      comunidadId: venta.comunidadId, comunidad: venta.comunidad,
      huertoId: venta.huertoId ?? null, huerto: venta.huerto ?? null,
      visitaOrigenId: venta.visitaOrigenId ?? null, observaciones: venta.observaciones ?? null,
      fecha: venta.fecha, unidad: venta.tipo,
      cantidadVendida: venta.cantidad, precioUnitario: venta.precioUnitario,
      moneda: moneda ?? null, importe: importe === null ? null : expresarImporte(importe) })
  }
  const porCultivo = [...grupos.values()].map(fila => {
    const plantas = reglaPlantas(fila)
    return {
      cultivoId: fila.cultivoId, cultivo: fila.cultivo, ciclosConCosecha: fila.ciclosConProduccion.size,
      cosechas: fila.cosechas.size, ventas: fila.ventas.size,
      plantasInicialesRegistradas: plantas, ...mostrarTotales(fila.cantidades),
      produccionPorPlanta: { kg: null, unidades: null, manojos: null,
        motivo: 'PLANTAS_PRODUCTIVAS_NO_VERIFICADAS' },
      totalVentasOriginalGTQ: expresarImporte(fila.ventaGTQ), totalVentasOriginalUSD: expresarImporte(fila.ventaUSD),
    }
  }).sort((a, b) => a.cultivo.localeCompare(b.cultivo, 'es'))
  return {
    periodo,
    resumen: { cosechas: cosechasIncluidas,
      ventas: detalleVentas.length, ventasConImporte, cantidades: mostrarTotales(totales),
      totalVentasOriginalGTQ: expresarImporte(gtq), totalVentasOriginalUSD: expresarImporte(usd),
      excluidasPrueba, excluidasCrucePeriodo, datosIncompletos, posiblesDuplicados },
    estadoValidacion: 'PRELIMINAR' as const,
    porCultivo, detalleCosechas, detalleVentas, advertencias,
    notas: [
      'Solo cosechas reales, nunca estimaciones de visitas.',
      'Las ventas se asignan por fecha de venta, aunque la cosecha sea anterior.',
      'Los totales GTQ y USD representan importes originales: no deben sumarse ni interpretarse como convertidos.',
      'La producción por planta permanece sin calcular: solo existen plantas iniciales, no plantas productivas verificadas.',
      'Los períodos que cruzan semestres se excluyen hasta contar con un desglose validado.',
      'Los registros posiblemente duplicados se señalan para conciliación sin eliminar movimientos que podrían ser legítimos.',
    ],
  }
}
