import type { InformeSemestral } from './semesterReportService'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const mesClave = (fecha: string) => fecha.slice(0, 7)

export function prepararGraficasReporte(informe: Pick<InformeSemestral, 'periodo' | 'detalleCosechas' | 'detalleVentas' | 'porCultivo'>) {
  const { desde, hasta } = informe.periodo
  const fechas: string[] = []
  let year = Number(desde.slice(0, 4))
  let month = Number(desde.slice(5, 7))
  const maximo = mesClave(hasta)
  while (`${year}-${String(month).padStart(2, '0')}` <= maximo && fechas.length < 24) {
    fechas.push(`${year}-${String(month).padStart(2, '0')}`)
    month++
    if (month === 13) { month = 1; year++ }
  }
  const kilos = new Map(fechas.map(f => [f, 0]))
  const gtq = new Map(fechas.map(f => [f, 0]))
  const usd = new Map(fechas.map(f => [f, 0]))

  for (const c of informe.detalleCosechas) {
    const mes = mesClave(c.fechaInicio)
    if (c.unidad !== 'kg' || !kilos.has(mes)) continue
    kilos.set(mes, (kilos.get(mes) ?? 0) + Number(c.cantidad))
  }
  for (const v of informe.detalleVentas) {
    const mes = mesClave(v.fecha)
    const moneda = v.moneda === 'GTQ' ? gtq : v.moneda === 'USD' ? usd : null
    if (!moneda || v.importe === null || !moneda.has(mes)) continue
    moneda.set(mes, (moneda.get(mes) ?? 0) + Number(v.importe))
  }
  const cultivos = [...informe.porCultivo].filter(f => Number(f.kg) > 0)
    .sort((a, b) => Number(b.kg) - Number(a.kg))
  const top = cultivos.slice(0, 6)
  const resto = cultivos.slice(6).reduce((sum, f) => sum + Number(f.kg), 0)
  return {
    etiquetas: fechas.map(f => `${MONTHS[Number(f.slice(5, 7)) - 1]} ${f.slice(0, 4)}`),
    kilos: fechas.map(f => kilos.get(f) ?? 0),
    gtq: fechas.map(f => gtq.get(f) ?? 0),
    usd: fechas.map(f => usd.get(f) ?? 0),
    cultivos: [...top.map(f => ({ nombre: f.cultivo, kg: Number(f.kg) })), ...(resto > 0 ? [{ nombre: 'Otros', kg: resto }] : [])],
  }
}
