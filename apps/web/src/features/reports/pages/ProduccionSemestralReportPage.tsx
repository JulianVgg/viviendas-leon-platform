import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ArrowUpRight, CalendarRange, Download, RefreshCw,
  AlertTriangle, Sprout, PackageCheck, Coins,
} from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { ProAreaChart, ProBarChart } from '@/features/dashboard/charts/TailAdminCharts'
import CultivosDonut from '../components/CultivosDonut'
import {
  consultarOpcionesReporte, consultarReporteSemestral, descargarReporteSemestral,
  type InformeSemestral,
} from '../services/semesterReportService'
import { prepararGraficasReporte } from '../services/semesterReportCharts'
import { familiasDeComunidad, leerEnlaceReportesDashboard, querySemestral, type FiltrosReporte, type OpcionesReporte } from '../services/semesterReportFilters'

const selector = 'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
const numero = (valor: number | string) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 3 }).format(Number(valor))
const importe = (valor: string, moneda: 'GTQ' | 'USD') => new Intl.NumberFormat('es-GT', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(Number(valor))
const anioActual = new Date().getFullYear()
// El período predeterminado es el último semestre cerrado; se pueden consultar semestres aún abiertos.
const semestreCerrado = new Date().getMonth() < 6 ? 2 : 1
const anioCerrado = new Date().getMonth() < 6 ? anioActual - 1 : anioActual
const vacio = <p className="flex min-h-54 items-center justify-center rounded-xl border border-dashed border-gray-200 px-5 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">No hay datos registrados para este período.</p>

export default function ProduccionSemestralReportPage() {
  const { usuario } = useAuth()
  const online = useOnlineStatus()
  const autorizado = Boolean(usuario && canViewPath(usuario, '/reportes/reportes'))
  const coordinacion = Boolean(usuario?.roles.some(rol => ['coordinadora del programa agroforestal', 'coordinador del programa agroforestal', 'coordinacion'].includes(
    rol.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase(),
  )))
  const [searchParams] = useSearchParams()
  const [rangoDashboard] = useState(() => leerEnlaceReportesDashboard(searchParams.toString()))
  const [modo, setModo] = useState<'semestre' | 'rango'>(rangoDashboard ? 'rango' : 'semestre')
  const [anio, setAnio] = useState(rangoDashboard ? Number(rangoDashboard.desde.slice(0, 4)) : anioCerrado)
  const [semestre, setSemestre] = useState<1 | 2>(rangoDashboard ? (Number(rangoDashboard.desde.slice(5, 7)) <= 6 ? 1 : 2) : semestreCerrado)
  const [desde, setDesde] = useState(rangoDashboard?.desde ?? `${anioActual}-01-01`)
  const [hasta, setHasta] = useState(rangoDashboard?.hasta ?? new Date().toISOString().slice(0, 10))
  const [comunidadId, setComunidadId] = useState<number | undefined>(rangoDashboard?.comunidadId)
  const [familiaId, setFamiliaId] = useState<number | undefined>()
  const [opciones, setOpciones] = useState<OpcionesReporte>({ comunidades: [], familias: [] })
  const [errorOpciones, setErrorOpciones] = useState('')
  const [errorReporte, setErrorReporte] = useState('')
  const [errorDescarga, setErrorDescarga] = useState('')
  const [cargando, setCargando] = useState(true)
  const [cargandoOpciones, setCargandoOpciones] = useState(true)
  const [descargando, setDescargando] = useState(false)
  const [reintento, setReintento] = useState(0)
  const [informe, setInforme] = useState<InformeSemestral | null>(null)
  const [consultaAplicada, setConsultaAplicada] = useState('')
  const [monedaGrafica, setMonedaGrafica] = useState<'GTQ' | 'USD'>('GTQ')

  const rangoValido = modo === 'semestre' || Boolean(desde && hasta && desde <= hasta &&
    (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000 <= 730)
  const filtros = useMemo<FiltrosReporte>(() => ({ anio, semestre,
    ...(modo === 'rango' && rangoValido ? { desde, hasta } : {}),
    ...(comunidadId ? { comunidadId } : {}), ...(familiaId ? { familiaId } : {}),
  }), [anio, semestre, modo, desde, hasta, rangoValido, comunidadId, familiaId])
  const consultaActual = useMemo(() => querySemestral(filtros), [filtros])
  const informeVigente = rangoValido && consultaActual === consultaAplicada ? informe : null
  const familiasVisibles = useMemo(() => familiasDeComunidad(opciones, comunidadId), [opciones, comunidadId])
  const graficas = useMemo(() => informeVigente ? prepararGraficasReporte(informeVigente) : null, [informeVigente])
  const actualizar = useCallback(() => setReintento(n => n + 1), [])

  useEffect(() => {
    if (!autorizado || !online) { setCargandoOpciones(false); return }
    const controller = new AbortController()
    setCargandoOpciones(true)
    setErrorOpciones('')
    void consultarOpcionesReporte(controller.signal).then(datos => {
      if (!controller.signal.aborted) setOpciones(datos)
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setErrorOpciones(cause instanceof Error ? cause.message : 'No se pudieron cargar los filtros.')
    }).finally(() => { if (!controller.signal.aborted) setCargandoOpciones(false) })
    return () => controller.abort()
  }, [autorizado, online, reintento])

  useEffect(() => {
    if (!autorizado || !online || !rangoValido) { setCargando(false); setInforme(null); return }
    const controller = new AbortController()
    setCargando(true)
    setErrorReporte('')
    setInforme(null)
    setConsultaAplicada('')
    void consultarReporteSemestral(filtros, controller.signal).then(datos => {
      if (!controller.signal.aborted) { setInforme(datos); setConsultaAplicada(querySemestral(filtros)) }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setErrorReporte(cause instanceof Error ? cause.message : 'No se pudo consultar el reporte.')
    }).finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [autorizado, online, rangoValido, filtros, reintento])

  const exportar = async () => {
    if (!informeVigente || !coordinacion || descargando || !online) return
    setDescargando(true)
    setErrorDescarga('')
    try { await descargarReporteSemestral(filtros) }
    catch (cause) { setErrorDescarga(cause instanceof Error ? cause.message : 'No se pudo descargar el Excel.') }
    finally { setDescargando(false) }
  }
  const resumenTitulo = modo === 'rango' ? 'Resumen del período' : anio === anioCerrado && semestre === semestreCerrado
    ? 'Resumen del último semestre' : 'Resumen del semestre seleccionado'
  const resumenCards = informeVigente ? [
    { titulo: 'Cosechas', valor: numero(informeVigente.resumen.cosechas), icono: PackageCheck, ruta: '/gestion-agricola/produccion' },
    { titulo: 'Producción (kg)', valor: numero(informeVigente.resumen.cantidades.kg), icono: Sprout, ruta: '/gestion-agricola/ciclos' },
    { titulo: 'Ventas (GTQ)', valor: importe(informeVigente.resumen.totalVentasOriginalGTQ, 'GTQ'), icono: Coins, ruta: '/gestion-agricola/ciclos' },
    { titulo: 'Ventas (USD)', valor: importe(informeVigente.resumen.totalVentasOriginalUSD, 'USD'), icono: Coins, ruta: '/gestion-agricola/ciclos' },
  ] : []

  if (!autorizado) return <main className="p-6 text-sm text-error-600" role="alert">No tienes permiso para consultar reportes.</main>
  return <main className="dashboard-page-enter mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <PageMeta title="Reportes | ViviendasLeón" description="Reportes de producción agrícola" />
    <PageHeader title="Reportes" description="" actions={<Button variant="secondary" onClick={actualizar} disabled={!online || cargando || cargandoOpciones}><RefreshCw size={16}/> Actualizar</Button>} />
    {!online && <div role="status" className="rounded-xl border border-warning-300 bg-warning-50 p-4 text-sm text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200">Se necesita conexión para consultar o exportar reportes.</div>}

    <Card><CardBody>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-3"><CalendarRange size={20} className="text-brand-500"/><h2 className="text-base font-semibold text-gray-900 dark:text-white">Período del reporte</h2></div>
        <div className="inline-flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800" aria-label="Modo de consulta">
          <button type="button" onClick={() => setModo('semestre')} className={`rounded-md px-3 py-2 text-sm transition-colors ${modo === 'semestre' ? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>Semestre</button>
          <button type="button" onClick={() => setModo('rango')} className={`rounded-md px-3 py-2 text-sm transition-colors ${modo === 'rango' ? 'bg-white font-medium text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>Rango de fechas</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modo === 'semestre' ? <>
          <label className="space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Año
            <select className={selector} value={anio} onChange={e => setAnio(Number(e.target.value))}>
              {Array.from({ length: Math.max(1, anioActual - 2024 + 2) }, (_, i) => anioActual + 1 - i).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Semestre
            <select className={selector} value={semestre} onChange={e => setSemestre(Number(e.target.value) as 1 | 2)}>
              <option value={1}>Enero – junio</option><option value={2}>Julio – diciembre</option>
            </select>
          </label>
        </> : <>
          <label className="space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Desde
            <input type="date" className={selector} value={desde} onChange={e => setDesde(e.target.value)} />
          </label>
          <label className="space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Hasta
            <input type="date" className={selector} value={hasta} min={desde || undefined} onChange={e => setHasta(e.target.value)} />
          </label>
        </>}
        <label className="space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Comunidad
          <select className={selector} disabled={!online || cargandoOpciones || !!errorOpciones} value={comunidadId ?? ''} onChange={e => { setComunidadId(e.target.value ? Number(e.target.value) : undefined); setFamiliaId(undefined) }}>
            <option value="">Todas las comunidades</option>
            {opciones.comunidades.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">Familia
          <select className={selector} disabled={!online || cargandoOpciones || !!errorOpciones} value={familiaId ?? ''} onChange={e => setFamiliaId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Todas las familias</option>
            {familiasVisibles.map(item => <option key={item.id} value={item.id}>{item.nombreReferencia}</option>)}
          </select>
        </label>
      </div>
      {!rangoValido && <p role="alert" className="mt-3 text-sm text-error-600">Selecciona un rango válido de hasta 731 días.</p>}
      {errorOpciones && <p role="alert" className="mt-3 text-sm text-error-600">{errorOpciones} <button className="underline" type="button" onClick={actualizar}>Reintentar</button></p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">{informeVigente ? `${informeVigente.periodo.desde} al ${informeVigente.periodo.hasta}` : 'Selecciona un período para consultar.'}</p>
        {coordinacion ? <Button onClick={() => void exportar()} disabled={!online || !informeVigente || cargando || descargando}><Download size={17}/>{descargando ? 'Generando Excel…' : 'Exportar Excel'}</Button> : <p className="text-xs text-gray-500 dark:text-gray-400">La exportación corresponde a Coordinación.</p>}
      </div>
      {errorDescarga && <p role="alert" className="mt-3 text-sm text-error-600">{errorDescarga}</p>}
    </CardBody></Card>

    {cargando && online && rangoValido && <div role="status" className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">Consultando producción…</div>}
    {errorReporte && <div role="alert" className="rounded-xl border border-error-300 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">{errorReporte} <button type="button" className="ml-2 underline" onClick={actualizar}>Reintentar</button></div>}

    {informeVigente && !cargando && <>
      <section aria-label="Resumen de producción" className="dashboard-content-enter space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{resumenTitulo}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {resumenCards.map(({ titulo, valor, icono: Icono, ruta }) => {
            const permitido = Boolean(usuario && canViewPath(usuario, ruta))
            const contenido = <><div className="mb-3 flex items-start justify-between"><span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Icono size={20}/></span>{permitido && <ArrowUpRight size={16} className="text-gray-400"/>}</div><p className="text-sm text-gray-500 dark:text-gray-400">{titulo}</p><p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{valor}</p></>
            return permitido ? <Link key={titulo} to={ruta} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-theme-sm motion-reduce:transform-none dark:border-gray-800 dark:bg-white/[0.03]" aria-label={`${titulo}: ${valor}. Abrir módulo relacionado`}>{contenido}</Link> : <div key={titulo} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">{contenido}</div>
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2" aria-label="Gráficas de producción">
        <Card className="dashboard-content-enter"><CardHeader title="Evolución de cosechas" description="Kilogramos registrados por mes."/><CardBody>
          {graficas && graficas.kilos.some(v => v > 0) ? <ProAreaChart labels={graficas.etiquetas} series={[{ name: 'Producción', data: graficas.kilos }]} unit="kg" ariaLabel="Evolución de kilogramos cosechados por mes" height={290}/> : vacio}
        </CardBody></Card>
        <Card className="dashboard-content-enter"><CardHeader title="Ventas por mes" actions={<select className={`${selector} w-28`} aria-label="Moneda de la gráfica de ventas" value={monedaGrafica} onChange={e => setMonedaGrafica(e.target.value as 'GTQ' | 'USD')}><option value="GTQ">GTQ</option><option value="USD">USD</option></select>}/><CardBody>
          {graficas && (monedaGrafica === 'GTQ' ? graficas.gtq : graficas.usd).some(v => v > 0) ? <ProBarChart labels={graficas.etiquetas} series={[{ name: monedaGrafica, data: monedaGrafica === 'GTQ' ? graficas.gtq : graficas.usd }]} unit={monedaGrafica} ariaLabel={`Ventas mensuales en ${monedaGrafica}`} height={290}/> : vacio}
        </CardBody></Card>
        <Card className="dashboard-content-enter"><CardHeader title="Cultivos con mayor producción" description="Comparación por kilogramos."/><CardBody>
          {graficas && graficas.cultivos.length > 0 ? <ProBarChart labels={graficas.cultivos.map(c => c.nombre)} series={[{ name: 'Kilogramos', data: graficas.cultivos.map(c => c.kg) }]} horizontal unit="kg" ariaLabel="Cultivos con mayor producción en kilogramos" height={300}/> : vacio}
        </CardBody></Card>
        <Card className="dashboard-content-enter"><CardHeader title="Distribución de la producción" description="Participación de cada cultivo en los kilogramos cosechados."/><CardBody>
          {graficas && graficas.cultivos.length > 0 ? <CultivosDonut cultivos={graficas.cultivos}/> : vacio}
        </CardBody></Card>
      </section>

      {(informeVigente.advertencias.length > 0 || informeVigente.resumen.datosIncompletos > 0 || informeVigente.resumen.excluidasCrucePeriodo > 0 || informeVigente.resumen.posiblesDuplicados > 0) &&
        <section className="rounded-xl border border-warning-300 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10" aria-label="Observaciones del reporte">
          <div className="flex items-center gap-2 font-medium text-warning-800 dark:text-warning-200"><AlertTriangle size={18}/> Datos por revisar</div>
          <p className="mt-2 text-sm text-warning-800 dark:text-warning-200">{informeVigente.resumen.datosIncompletos} incompletos · {informeVigente.resumen.excluidasCrucePeriodo} períodos cruzados · {informeVigente.resumen.posiblesDuplicados} posibles duplicados.</p>
          {informeVigente.advertencias.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-warning-800 dark:text-warning-200">{informeVigente.advertencias.slice(0, 5).map((item, idx) => <li key={`${item.codigo}-${item.referencia}-${idx}`}>{item.mensaje} (registro #{item.referencia})</li>)}</ul>}
        </section>}
    </>}
  </main>
}
