import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, BanknoteArrowDown, BanknoteArrowUp, ChartNoAxesCombined, FileText, Landmark, RefreshCw, WalletCards, HeartPulse, ReceiptText } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'
import { ProAreaChart } from '@/features/dashboard/charts/TailAdminCharts'
import { saludoGuatemala, formatoFechaHoraGuatemala } from '@/features/dashboard/lib/guatemalaDateTime'
import { request } from '../services/financeApi'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

type ResumenFinanciero = {
  periodo: { desde: string; hastaExclusivo: string; meses: number }
  cuentas: { tipo: string; cuentas: number; saldo: string }[]
  meses: { mes: string; ingresos: string; egresos: string; movimientos: number }[]
  categorias: { categoria: string; egresos: string; movimientos: number }[]
  comprobantesPendientes: number
}
const moneda = (valor: string | number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 2 }).format(Number(valor))
const tarjeta = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900'
const destinoTipo: Record<string, string> = { BANCO: '/finanzas/bancos', CAJA_CHICA: '/finanzas/caja-chica', FONDO_MEDICO: '/finanzas/fondos-medicos' }
const tituloTipo: Record<string, string> = { BANCO: 'Bancos', CAJA_CHICA: 'Caja chica', FONDO_MEDICO: 'Fondos médicos' }
const iconosTipo = { BANCO: Landmark, CAJA_CHICA: WalletCards, FONDO_MEDICO: HeartPulse }

export default function FinanceDashboardPage() {
  const { usuario } = useAuth()
  const online = useOnlineStatus()
  const [periodo, setPeriodo] = useState<3 | 6 | 12>(6)
  const [revision, setRevision] = useState(0)
  const [resumen, setResumen] = useState<ResumenFinanciero | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ahora, setAhora] = useState(() => new Date())

  useEffect(() => {
    const reloj = window.setInterval(() => setAhora(new Date()), 60_000)
    return () => window.clearInterval(reloj)
  }, [])
  useEffect(() => {
    if (!online) { setCargando(false); return }
    const controller = new AbortController()
    setCargando(true); setError('')
    void request<ResumenFinanciero>(`/dashboard?meses=${periodo}`, { signal: controller.signal })
      .then(datos => { if (!controller.signal.aborted) setResumen(datos) })
      .catch(cause => { if (!controller.signal.aborted) { setResumen(null); setError(cause instanceof Error ? cause.message : 'No se pudo consultar el resumen financiero.') } })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [periodo, revision, online])

  const ingresos = resumen?.meses.reduce((s, m) => s + Number(m.ingresos), 0) ?? 0
  const egresos = resumen?.meses.reduce((s, m) => s + Number(m.egresos), 0) ?? 0
  const movimientos = resumen?.meses.reduce((s, m) => s + m.movimientos, 0) ?? 0
  const series = resumen?.meses ?? []
  const tieneMovimientos = movimientos > 0
  const cuentas = (['BANCO', 'CAJA_CHICA', 'FONDO_MEDICO'] as const).map(tipo => ({
    tipo, cuenta: resumen?.cuentas.find(x => x.tipo === tipo), Icono: iconosTipo[tipo],
  }))
  const rutas = [
    { titulo: 'Bancos', ruta: '/finanzas/bancos', Icono: Landmark },
    { titulo: 'Caja chica', ruta: '/finanzas/caja-chica', Icono: WalletCards },
    { titulo: 'Fondos médicos', ruta: '/finanzas/fondos-medicos', Icono: HeartPulse },
    { titulo: 'Informe mensual', ruta: '/finanzas/informe-mensual', Icono: FileText },
  ].filter(item => usuario && canViewPath(usuario, item.ruta))
  return <main className="dashboard-page-enter mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
    <PageMeta title="Inicio contable | Viviendas León" description="Situación financiera y movimientos registrados"/>
    <header className={`${tarjeta} dashboard-welcome-card relative overflow-hidden px-6 py-7 sm:px-8`}>
      <h1 className="relative text-2xl font-semibold text-gray-900 dark:text-white sm:text-3xl">{saludoGuatemala(ahora)}{usuario?.nombre ? <>, <span className="text-brand-600 dark:text-brand-300">{usuario.nombre.trim()}</span></> : null}</h1>
      <p className="relative mt-2 text-xs text-gray-500 dark:text-gray-400">{formatoFechaHoraGuatemala(ahora)} · Hora de Guatemala</p>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Resumen financiero</h2>
      <div className="flex items-center gap-2">
        <label htmlFor="fin-dashboard-periodo" className="sr-only">Período del resumen</label>
        <select id="fin-dashboard-periodo" value={periodo} onChange={e => setPeriodo(Number(e.target.value) as 3 | 6 | 12)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white">
          <option value={3}>3 meses</option><option value={6}>6 meses</option><option value={12}>12 meses</option>
        </select>
        <button type="button" onClick={() => setRevision(n => n + 1)} disabled={cargando || !online} aria-label="Actualizar información financiera" className="layout-focus rounded-lg border border-gray-300 p-2.5 text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"><RefreshCw size={18} className={cargando ? 'animate-spin' : ''}/></button>
      </div>
    </div>
    {!online && <p role="status" className="text-sm text-amber-700">Conéctate para actualizar los datos financieros.</p>}
    {cargando && !resumen && <p role="status" className={`${tarjeta} py-14 text-center text-sm text-gray-500`}>Cargando datos financieros…</p>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {resumen && <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { titulo: 'Ingresos externos', importe: ingresos, Icono: BanknoteArrowDown },
          { titulo: 'Egresos externos', importe: egresos, Icono: BanknoteArrowUp },
          { titulo: 'Diferencia del período', importe: ingresos - egresos, Icono: ChartNoAxesCombined },
        ].map(indicador => <div key={indicador.titulo} className={tarjeta}><indicador.Icono size={21} className="text-brand-600 dark:text-brand-300"/><p className="mt-4 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{moneda(indicador.importe)}</p><p className="mt-1 text-sm text-gray-500">{indicador.titulo}</p></div>)}
        <div className={tarjeta}><ReceiptText size={21} className="text-amber-600"/><p className="mt-4 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{resumen.comprobantesPendientes}</p><p className="mt-1 text-sm text-gray-500">Movimientos sin comprobante</p></div>
      </div>
      <section aria-label="Saldos por tipo de cuenta" className="grid gap-4 md:grid-cols-3">
        {cuentas.map(({tipo,cuenta,Icono}) => <Link key={tipo} to={destinoTipo[tipo]} className={`${tarjeta} group transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md`}>
          <div className="flex items-center justify-between"><Icono size={21} className="text-brand-600"/><ArrowUpRight size={17} className="text-gray-400 group-hover:text-brand-600"/></div>
          <p className="mt-4 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{moneda(cuenta?.saldo ?? 0)}</p>
          <p className="mt-1 text-sm text-gray-500">{tituloTipo[tipo]} · {cuenta?.cuentas ?? 0} cuenta(s)</p>
        </Link>)}
      </section>
      <section className={tarjeta} aria-label="Ingresos y egresos mensuales">
        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Ingresos y egresos por mes</h3>
        {!tieneMovimientos ? <p className="py-14 text-center text-sm text-gray-500">Aún no hay movimientos externos registrados en este período.</p>
          : <ProAreaChart labels={series.map(m => m.mes)} series={[
            { name: 'Ingresos', data: series.map(m => Number(m.ingresos)) },
            { name: 'Egresos', data: series.map(m => Number(m.egresos)) },
          ]} ariaLabel="Comparación mensual de ingresos y egresos externos en quetzales" height={280}/>}
      </section>
      <section className={tarjeta} aria-label="Principales egresos">
        <h3 className="mb-4 font-semibold text-gray-900 dark:text-white">Principales categorías de egresos</h3>
        {!resumen.categorias.length ? <p className="py-5 text-sm text-gray-500">Sin egresos registrados en este período.</p>
          : <div className="space-y-4">{resumen.categorias.map(item => <div key={item.categoria}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm"><span className="font-medium text-gray-700 dark:text-gray-200">{item.categoria} <span className="text-xs text-gray-400">({item.movimientos})</span></span><strong className="tabular-nums text-gray-900 dark:text-white">{moneda(item.egresos)}</strong></div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"><div className="h-full rounded-full bg-brand-500" style={{ width: `${egresos > 0 ? Math.min(100, Number(item.egresos) / egresos * 100) : 0}%` }}/></div>
          </div>)}</div>}
      </section>
      <section className="space-y-3" aria-label="Accesos contables"><h3 className="font-semibold text-gray-900 dark:text-white">Accesos rápidos</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{rutas.map(({titulo,ruta,Icono}) => <Link key={ruta} to={ruta} className={`${tarjeta} group flex items-center justify-between gap-2 text-sm font-medium text-gray-700 transition hover:border-brand-200 hover:text-brand-700 dark:text-gray-200`}><span className="flex items-center gap-2"><Icono size={18} className="text-brand-500"/>{titulo}</span><ArrowUpRight size={17} className="text-gray-400 group-hover:text-brand-500"/></Link>)}</div>
      </section>
      <p className="text-xs text-gray-500 dark:text-gray-400">Las transferencias internas no se contabilizan como ingresos ni egresos externos. Los saldos reflejan los registros disponibles hasta el cierre del mes actual.</p>
    </>}
  </main>
}
