// Fechas de calendario y agrupación mensual en horario de Guatemala.
export function fechaLocalGuatemala(fecha: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(fecha)
}

export function periodoDashboard(fecha: Date, meses: number) {
  const hoy = fechaLocalGuatemala(fecha)
  const [anio, mes] = hoy.split('-').map(Number)
  const inicio = new Date(Date.UTC(anio, mes - meses, 1, 12))
  const claves = Array.from({ length: meses }, (_, i) => {
    const fechaMes = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + i, 1, 12))
    return fechaMes.toISOString().slice(0, 7)
  })
  return { hoy, desde: `${claves[0]}-01`, claves }
}

export function agruparPorMes(claves: string[], visitas: Array<{ fecha: Date; estado: string }>, capacitaciones: Array<{ fecha: Date }>) {
  return claves.map(mes => ({
    mes,
    etiqueta: new Intl.DateTimeFormat('es-GT', { month: 'short', timeZone: 'UTC' }).format(new Date(`${mes}-15T12:00:00Z`)),
    visitas: visitas.filter(v => v.fecha.toISOString().slice(0, 7) === mes && v.estado === 'REALIZADA').length,
    capacitaciones: capacitaciones.filter(c => c.fecha.toISOString().slice(0, 7) === mes).length,
  }))
}
