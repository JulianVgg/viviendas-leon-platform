import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, RefreshCw, AlertTriangle } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card, { CardBody } from '@/components/ui/Card'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import {
  consultarOpcionesReporte, consultarReporteSemestral, descargarReporteSemestral,
  type InformeSemestral,
} from '../services/semesterReportService'
import { familiasDeComunidad, querySemestral, type FiltrosReporte, type OpcionesReporte } from '../services/semesterReportFilters'

const selector = 'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
const numero = (valor: number | string) => new Intl.NumberFormat('es-GT', { maximumFractionDigits: 3 }).format(Number(valor))
const importe = (valor: string, moneda: 'GTQ' | 'USD') =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(Number(valor))
const anioActual = new Date().getFullYear()
const semestreActual: 1 | 2 = new Date().getMonth() < 6 ? 1 : 2

export default function ProduccionSemestralReportPage() {
  const { usuario } = useAuth()
  const online = useOnlineStatus()
  const autorizado = Boolean(usuario && canViewPath(usuario, '/reportes/reportes'))
  const [anio, setAnio] = useState(anioActual)
  const [semestre, setSemestre] = useState<1 | 2>(semestreActual)
  const [comunidadId, setComunidadId] = useState<number | undefined>()
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

  const filtros = useMemo<FiltrosReporte>(() => ({ anio, semestre,
    ...(comunidadId ? { comunidadId } : {}), ...(familiaId ? { familiaId } : {}),
  }), [anio, semestre, comunidadId, familiaId])
  const consultaActual = useMemo(() => querySemestral(filtros), [filtros])
  const informeVigente = consultaActual === consultaAplicada ? informe : null
  const familiasVisibles = useMemo(() => familiasDeComunidad(opciones, comunidadId), [opciones, comunidadId])
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
    if (!autorizado || !online) { setCargando(false); setInforme(null); return }
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
  }, [autorizado, online, filtros, reintento])

  const exportar = async () => {
    if (!informeVigente || descargando || !online) return
    setDescargando(true)
    setErrorDescarga('')
    try { await descargarReporteSemestral(filtros) }
    catch (cause) { setErrorDescarga(cause instanceof Error ? cause.message : 'No se pudo descargar el Excel.') }
    finally { setDescargando(false) }
  }

  if (!autorizado) return <main className="p-6 text-sm text-error-600" role="alert">No tienes permiso para consultar reportes institucionales.</main>

  return <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <PageMeta title="Reportes | ViviendasLeón" description="Producciones agrícolas semestrales" />
    <PageHeader title="Reportes" description="Producciones agrícolas semestrales" actions={<Button variant="secondary" onClick={actualizar} disabled={!online || cargando || cargandoOpciones}><RefreshCw size={16}/> Actualizar</Button>} />

    {!online && <div role="status" className="rounded-xl border border-warning-300 bg-warning-50 p-4 text-sm text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200">Se necesita conexión para consultar o exportar reportes.</div>}

    <Card><CardBody>
      <div className="mb-5 flex items-center gap-3"><FileSpreadsheet size={21} className="text-brand-500"/><h2 className="text-base font-semibold text-gray-900 dark:text-white">Producciones agrícolas</h2></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      {errorOpciones && <p role="alert" className="mt-3 text-sm text-error-600">{errorOpciones} <button className="underline" type="button" onClick={actualizar}>Reintentar</button></p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
        <div className="text-sm text-gray-500 dark:text-gray-400">{informeVigente ? `${informeVigente.periodo.desde} al ${informeVigente.periodo.hasta}` : 'Selecciona el período del informeVigente.'}</div>
        <Button onClick={() => void exportar()} disabled={!online || !informeVigente || cargando || descargando}>
          <Download size={17}/>{descargando ? 'Generando Excel…' : 'Exportar Excel'}
        </Button>
      </div>
      {errorDescarga && <p role="alert" className="mt-3 text-sm text-error-600">{errorDescarga}</p>}
    </CardBody></Card>

    {cargando && online ? <div role="status" className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">Consultando producción semestral…</div> : null}
    {errorReporte && <div role="alert" className="rounded-xl border border-error-300 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300">{errorReporte} <button type="button" className="ml-2 underline" onClick={actualizar}>Reintentar</button></div>}

    {informeVigente && !cargando && <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resumen del semestre</h2>
        <span className="rounded-full border border-warning-200 bg-warning-50 px-3 py-1 text-xs font-medium text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200">{informeVigente.estadoValidacion === 'PRELIMINAR' ? 'Pendiente de validación' : informeVigente.estadoValidacion}</span>
      </div>
      <section aria-label="Totales del semestre" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Cosechas', numero(informeVigente.resumen.cosechas)],
          ['Producción (kg)', numero(informeVigente.resumen.cantidades.kg)],
          ['Ventas (GTQ)', importe(informeVigente.resumen.totalVentasOriginalGTQ, 'GTQ')],
          ['Ventas (USD)', importe(informeVigente.resumen.totalVentasOriginalUSD, 'USD')],
        ].map(([label, valor]) => <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"><p className="text-xs text-gray-500 dark:text-gray-400">{label}</p><p className="mt-2 break-words text-xl font-semibold text-gray-900 dark:text-white">{valor}</p></div>)}
      </section>
      <Card><CardBody>
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Producción por cultivo</h3>
        {!informeVigente.porCultivo.length ? <p className="rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500 dark:border-gray-800">No hay cosechas ni ventas verificables para el período seleccionado.</p> :
          <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="border-b border-gray-200 text-xs text-gray-500 dark:border-gray-800"><th className="px-3 py-3 font-medium">Cultivo</th><th className="px-3 py-3 text-right font-medium">kg</th><th className="px-3 py-3 text-right font-medium">Unidades</th><th className="px-3 py-3 text-right font-medium">Manojos</th><th className="px-3 py-3 text-right font-medium">Ventas (Q)</th><th className="px-3 py-3 text-right font-medium">Ventas ($)</th></tr></thead><tbody>{informeVigente.porCultivo.map(fila => <tr key={fila.cultivoId} className="border-b border-gray-100 text-gray-700 last:border-0 dark:border-gray-800 dark:text-gray-200"><td className="px-3 py-3 font-medium">{fila.cultivo}</td><td className="px-3 py-3 text-right tabular-nums">{numero(fila.kg)}</td><td className="px-3 py-3 text-right tabular-nums">{numero(fila.unidades)}</td><td className="px-3 py-3 text-right tabular-nums">{numero(fila.manojos)}</td><td className="px-3 py-3 text-right tabular-nums">{importe(fila.totalVentasOriginalGTQ, 'GTQ')}</td><td className="px-3 py-3 text-right tabular-nums">{importe(fila.totalVentasOriginalUSD, 'USD')}</td></tr>)}</tbody></table></div>}
      </CardBody></Card>
      {(informeVigente.advertencias.length > 0 || informeVigente.resumen.datosIncompletos > 0 || informeVigente.resumen.excluidasCrucePeriodo > 0 || informeVigente.resumen.posiblesDuplicados > 0) &&
        <section className="rounded-xl border border-warning-300 bg-warning-50 p-4 dark:border-warning-500/30 dark:bg-warning-500/10" aria-label="Observaciones del reporte">
          <div className="flex items-center gap-2 font-medium text-warning-800 dark:text-warning-200"><AlertTriangle size={18}/> Datos por revisar</div>
          <p className="mt-2 text-sm text-warning-800 dark:text-warning-200">{informeVigente.resumen.datosIncompletos} incompletos · {informeVigente.resumen.excluidasCrucePeriodo} fuera del semestre · {informeVigente.resumen.posiblesDuplicados} posibles duplicados. El Excel conservará el estado preliminar.</p>
          {informeVigente.advertencias.length > 0 && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-warning-800 dark:text-warning-200">{informeVigente.advertencias.slice(0, 5).map((item, idx) => <li key={`${item.codigo}-${item.referencia}-${idx}`}>{item.mensaje} (registro #{item.referencia})</li>)}</ul>}
          {informeVigente.advertencias.length > 5 && <p className="mt-2 text-xs text-warning-700 dark:text-warning-300">{informeVigente.advertencias.length - 5} observaciones adicionales disponibles en los datos del reporte.</p>}
        </section>}
    </>}
  </main>
}
