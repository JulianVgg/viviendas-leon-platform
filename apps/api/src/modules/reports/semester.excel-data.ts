// CIR-12: representación verificable del informe institucional, sin ExcelJS ni I/O.
// Los campos que no pueden justificarse en CIR-11 se mantienen vacíos (null).
import type { obtenerProduccionSemestral } from './semester.service.js'

export type InformeSemestralExcel = Awaited<ReturnType<typeof obtenerProduccionSemestral>>

export type FilaProduccionExcel = {
  numero: number
  cultivo: string
  plantasIniciales: number | null
  unidadesPorPlanta: null
  kgPorPlanta: null
  unidades: number | null
  kg: number | null
  precioGTQ: number | null
  precioUSD: number | null
  ventasGTQ: number | null
  ventasUSD: number | null
  observaciones: string
}

export const textoSeguroExcel = (valor: string): string => {
  const limpio = valor.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim()
  // Evita que contenido de las observaciones/nombres se interprete como fórmula.
  return /^[=+@\-\t\r]/.test(limpio) ? `'${limpio}` : limpio
}

const numeroValido = (dato: string | number | null | undefined): number | null => {
  if (dato === null || dato === undefined || dato === '') return null
  const valor = Number(dato)
  return Number.isFinite(valor) && valor >= 0 && valor <= 1e12 ? valor : null
}

const unidadTexto: Record<string, string> = { kg: 'kg', unidades: 'unidad', manojos: 'manojo' }

export function prepararFilasProduccionExcel(informe: InformeSemestralExcel): FilaProduccionExcel[] {
  return informe.porCultivo.map((grupo, i) => {
    const ventas = informe.detalleVentas.filter(venta => venta.cultivoId === grupo.cultivoId)
    const ventasValidas = ventas.filter(v => v.importe !== null && Number(v.importe) > 0)
    const precioUnico = (moneda: 'GTQ' | 'USD') => {
      const deMoneda = ventasValidas.filter(v => v.moneda === moneda)
      if (!deMoneda.length) return { precio: null, unidad: null, variable: false }
      const unidades = new Set(deMoneda.map(v => v.unidad))
      const precios = new Set(deMoneda.map(v => numeroValido(v.precioUnitario)?.toFixed(4)))
      if (unidades.size !== 1 || precios.size !== 1 || precios.has(undefined)) {
        return { precio: null, unidad: null, variable: true }
      }
      return { precio: numeroValido(deMoneda[0].precioUnitario), unidad: deMoneda[0].unidad, variable: false }
    }
    const gtq = precioUnico('GTQ')
    const usd = precioUnico('USD')
    const observaciones = new Set<string>()
    for (const cosecha of informe.detalleCosechas) {
      if (cosecha.cultivoId !== grupo.cultivoId) continue
      if (typeof cosecha.observaciones === 'string' && cosecha.observaciones.trim()) {
        observaciones.add(cosecha.observaciones.trim())
      }
    }
    if (numeroValido(grupo.manojos)) observaciones.add(`Manojos cosechados: ${grupo.manojos}`)
    for (const [moneda, dato] of [['GTQ', gtq], ['USD', usd]] as const) {
      if (dato.variable) observaciones.add(`Precios ${moneda} variables: consultar ventas`)
      else if (dato.precio !== null && dato.unidad) observaciones.add(`Precio ${moneda} por ${unidadTexto[dato.unidad] ?? dato.unidad}`)
    }
    const huboGTQ = ventasValidas.some(v => v.moneda === 'GTQ')
    const huboUSD = ventasValidas.some(v => v.moneda === 'USD')
    return {
      numero: i + 1,
      cultivo: textoSeguroExcel(grupo.cultivo),
      plantasIniciales: grupo.plantasInicialesRegistradas,
      unidadesPorPlanta: null,
      kgPorPlanta: null,
      unidades: numeroValido(grupo.unidades) || null,
      kg: numeroValido(grupo.kg) || null,
      precioGTQ: gtq.precio,
      precioUSD: usd.precio,
      ventasGTQ: huboGTQ ? numeroValido(grupo.totalVentasOriginalGTQ) : null,
      ventasUSD: huboUSD ? numeroValido(grupo.totalVentasOriginalUSD) : null,
      observaciones: textoSeguroExcel([...observaciones].join('; ').slice(0, 450)),
    }
  })
}

export function nombreArchivoProduccionExcel(informe: InformeSemestralExcel): string {
  const { anio, semestre } = informe.periodo
  const { comunidadId, familiaId } = informe.filtros
  const sufijo = `${comunidadId ? `_C${comunidadId}` : ''}${familiaId ? `_F${familiaId}` : ''}`
  const periodoArchivo = informe.periodo.personalizado
    ? `${informe.periodo.desde}_${informe.periodo.hasta}` : `${anio}_S${semestre}`
  return `Producciones_Agricolas_${periodoArchivo}${sufijo}.xlsx`
}
