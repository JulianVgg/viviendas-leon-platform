import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, RefreshCw, WalletCards, Receipt, Coins, CircleAlert } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Button from '@/components/ui/Button'
import Card, { CardBody, CardHeader } from '@/components/ui/Card'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

type Reporte = {
  periodo: { desde: string; hasta: string }
  resumen: { ventas: number; ventasConImporte: number; gtq: string; usd: string }
  cultivos: Array<{ nombre: string; ventas: number; gtq: string; usd: string }>
  movimientos: Array<{ id: number; fecha: string; cultivo: string; moneda: string | null; importe: string | null; cantidad: string; unidad: string; visitaId: number | null }>
}
const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white'
const dinero = (v: string, moneda: 'GTQ' | 'USD') => new Intl.NumberFormat('es-GT', { style: 'currency', currency: moneda }).format(Number(v))
const parametros = (year: number, tipo: 'mes' | 'semestre', periodo: number) => {
  const query = new URLSearchParams({ anio: String(year), semestre: String(tipo === 'semestre' ? periodo : periodo <= 6 ? 1 : 2) })
  if (tipo === 'mes') {
    const mes = String(periodo).padStart(2, '0')
    query.set('desde', `${year}-${mes}-01`)
    query.set('hasta', `${year}-${mes}-${String(new Date(Date.UTC(year, periodo, 0)).getUTCDate()).padStart(2, '0')}`)
  }
  return query.toString()
}

export default function ControlFinancieroPage() {
  const { usuario } = useAuth()
  const autorizado = Boolean(usuario && canViewPath(usuario, '/auditoria/control-financiero'))
  const online = useOnlineStatus()
  const [year, setYear] = useState(new Date().getFullYear())
  const [tipo, setTipo] = useState<'mes' | 'semestre'>('mes')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [semestre, setSemestre] = useState<1 | 2>(new Date().getMonth() < 6 ? 1 : 2)
  const [reload, setReload] = useState(0)
  const [reporte, setReporte] = useState<Reporte | null>(null)
  const [cargando, setCargando] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState('')
  const params = useMemo(() => parametros(year, tipo, tipo === 'mes' ? mes : semestre), [year, tipo, mes, semestre])
  const actualizar = useCallback(() => setReload(v => v + 1), [])

  useEffect(() => {
    if (!autorizado || !online) { setReporte(null); return }
    const controller = new AbortController()
    setCargando(true); setError(''); setReporte(null)
    void fetch(`/api/v1/auditoria/control-financiero?${params}`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => null)
        if (!response.ok) throw Error(data?.error?.message ?? 'No fue posible cargar el informe.')
        return data?.data as Reporte
      }).then(data => { if (!controller.signal.aborted) setReporte(data) })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el informe.') })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [autorizado, online, params, reload])

  const exportar = async () => {
    if (!reporte || !online || descargando) return
    setDescargando(true); setError('')
    try {
      const response = await fetch(`/api/v1/auditoria/control-financiero.xlsx?${params}`, { credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw Error(body?.error?.message ?? 'No se pudo generar el Excel.')
      }
      const blob = await response.blob()
      if (!blob.size) throw Error('El archivo está vacío.')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url; link.download = `Control_Ventas_Agricolas_${reporte.periodo.desde}_${reporte.periodo.hasta}.xlsx`
      document.body.appendChild(link); link.click(); link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Error al descargar.') }
    finally { setDescargando(false) }
  }

  if (!autorizado) return <main role="alert" className="p-6 text-sm text-error-600">No tienes acceso a control financiero.</main>
  const stats = reporte ? [
    { label: 'Ventas registradas', value: String(reporte.resumen.ventas), icon: Receipt },
    { label: 'Ventas con importe', value: String(reporte.resumen.ventasConImporte), icon: WalletCards },
    { label: 'Ventas en quetzales', value: dinero(reporte.resumen.gtq, 'GTQ'), icon: Coins },
    { label: 'Ventas en dólares', value: dinero(reporte.resumen.usd, 'USD'), icon: Coins },
  ] : []
  return <main className="dashboard-page-enter mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6">
    <PageMeta title="Control financiero | ViviendasLeón" description="Ventas agrícolas registradas" />
    <PageHeader title="Control financiero" description="Ventas agrícolas registradas" actions={<Button variant="secondary" onClick={actualizar} disabled={!online || cargando}><RefreshCw size={16}/> Actualizar</Button>} />
    <Card><CardBody>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="space-y-1 text-sm">Año
            <select className={inputClass} value={year} onChange={e => setYear(Number(e.target.value))}>{Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}</select>
          </label>
          <label className="space-y-1 text-sm">Período
            <select className={inputClass} value={tipo} onChange={e => setTipo(e.target.value as 'mes' | 'semestre')}><option value="mes">Mes</option><option value="semestre">Semestre</option></select>
          </label>
          <label className="col-span-2 space-y-1 text-sm">{tipo === 'mes' ? 'Mes' : 'Semestre'}
            {tipo === 'mes' ? <select className={inputClass} value={mes} onChange={e => setMes(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Intl.DateTimeFormat('es-GT', { month: 'long' }).format(new Date(Date.UTC(2026, i, 1)))}</option>)}
            </select> : <select className={inputClass} value={semestre} onChange={e => setSemestre(Number(e.target.value) as 1 | 2)}><option value={1}>Enero - junio</option><option value={2}>Julio - diciembre</option></select>}
          </label>
        </div>
        <Button onClick={() => void exportar()} disabled={!online || !reporte || descargando}><Download size={16}/>{descargando ? 'Generando…' : 'Exportar Excel'}</Button>
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Solo ventas agrícolas; no incluye bancos, pagos ni caja chica.</p>
    </CardBody></Card>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {!online && <p className="text-sm text-amber-700">Conéctate para consultar los registros.</p>}
    {cargando && <p role="status" className="text-sm text-gray-500">Cargando información…</p>}
    {reporte && <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Resumen de ventas">{stats.map(stat => <Card key={stat.label}><CardBody>
        <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10"><stat.icon size={20}/></span>
        <p className="text-sm text-gray-500">{stat.label}</p><p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
      </CardBody></Card>)}</section>
      {reporte.resumen.ventas > reporte.resumen.ventasConImporte && <p className="flex items-center gap-2 text-sm text-amber-700"><CircleAlert size={16}/> {reporte.resumen.ventas - reporte.resumen.ventasConImporte} venta(s) sin importe.</p>}
      <Card><CardHeader title="Ventas por cultivo"/><CardBody>
        {reporte.cultivos.length === 0 ? <p className="text-sm text-gray-500">Sin ventas registradas en este período.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-gray-200 text-gray-500"><th className="py-3">Cultivo</th><th>Ventas</th><th>Total GTQ</th><th>Total USD</th></tr></thead><tbody>{reporte.cultivos.map((r, i) => <tr key={`${r.nombre}-${i}`} className="border-b border-gray-100 dark:border-gray-800"><td className="py-3 font-medium">{r.nombre}</td><td>{r.ventas}</td><td>{dinero(r.gtq, 'GTQ')}</td><td>{dinero(r.usd, 'USD')}</td></tr>)}</tbody></table></div>}
      </CardBody></Card>
      <Card><CardHeader title="Últimos movimientos del período" description="Origen de los registros de ventas"/><CardBody>
        {reporte.movimientos.length === 0 ? <p className="text-sm text-gray-500">Sin movimientos registrados.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b border-gray-200 text-gray-500"><th className="py-3">Fecha</th><th>Cultivo</th><th>Cantidad</th><th>Importe</th><th>Visita</th></tr></thead><tbody>{[...reporte.movimientos].sort((a,b) => b.fecha.localeCompare(a.fecha)).slice(0, 30).map(v => <tr key={v.id} className="border-b border-gray-100 dark:border-gray-800"><td className="py-3">{v.fecha}</td><td>{v.cultivo}</td><td>{v.cantidad} {v.unidad}</td><td>{v.importe && (v.moneda === 'GTQ' || v.moneda === 'USD') ? dinero(v.importe, v.moneda) : 'Sin importe'}</td><td>{v.visitaId ? `#${v.visitaId}` : '—'}</td></tr>)}</tbody></table></div>}
        {reporte.movimientos.length > 30 && <p className="mt-3 text-xs text-gray-500">El Excel incluye todos los movimientos del período.</p>}
      </CardBody></Card>
    </>}
  </main>
}
