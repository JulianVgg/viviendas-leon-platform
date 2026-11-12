import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { DownloadCloud, RefreshCcw, ShieldCheck } from 'lucide-react'
import PageHeader from '@/components/common/PageHeader'
import PageMeta from '@/components/common/PageMeta'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import Card, { CardBody } from '@/components/ui/Card'
import { useAuth } from '@/features/auth/AuthProvider'
import { esTecnicoCampo } from '@/features/auth/calendarAccess'
import { useConnectivityStatus } from '@/hooks/useConnectivityStatus'
import { enableFieldAccess, fieldAccessActive } from '@/features/auth/services/fieldAccess'
import { getFieldDownload, prepareFieldData, type FieldDownload } from '../services/prepareFieldData'
import { listQueueOperations } from '@/services/pendingOperations'
import { VISIT_SYNC_KIND, syncPendingVisits } from '@/features/visits/services/visitService'

export default function FieldPreparationPage() {
  const { usuario, modoAcceso } = useAuth()
  const connection = useConnectivityStatus()
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [summary, setSummary] = useState<FieldDownload | null>(null)
  const [pending, setPending] = useState<number | null>(null)
  const userId = usuario?.id
  const configured = Boolean(userId && fieldAccessActive(userId))

  useEffect(() => {
    if (!userId) return
    let active = true
    Promise.all([getFieldDownload(userId).catch(() => null), listQueueOperations()]).then(([value, operations]) => {
      if (!active) return
      setSummary(value)
      setPending(operations.filter(op => op.kind === VISIT_SYNC_KIND && op.status !== 'synced' && (op.payload as {ownerId?: number})?.ownerId === userId).length)
    }).catch(() => {})
    return () => { active = false }
  }, [userId])

  async function prepare(event: FormEvent) {
    event.preventDefault()
    if (!usuario || busy || modoAcceso !== 'online') return
    if (connection.status !== 'connected') { setError('Primero necesitas conexión con la API.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      setProgress('Protegiendo el acceso local…')
      await enableFieldAccess(usuario, pin)
      const result = await prepareFieldData(usuario.id, setProgress)
      setSummary(result)
      window.dispatchEvent(new Event('viviendas-leon:field-prepared'))
      setNotice('Datos descargados. Se actualizarán automáticamente mientras tengas sesión y conexión.')
      setPin('')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible preparar el dispositivo.') }
    finally { setProgress(''); setBusy(false) }
  }

  async function syncNow() {
    if (!usuario || busy || modoAcceso !== 'online' || connection.status !== 'connected') return
    setBusy(true); setError('')
    try {
      await syncPendingVisits(usuario.id)
      const ops = await listQueueOperations()
      const remaining = ops.filter(op => op.kind === VISIT_SYNC_KIND && op.status !== 'synced' && (op.payload as {ownerId?: number})?.ownerId === usuario.id)
      setPending(remaining.length)
      setNotice(remaining.length ? 'Quedan registros pendientes o rechazados. Revisa Historial de visitas.' : 'No quedan visitas pendientes de sincronizar.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo sincronizar.') }
    finally { setBusy(false) }
  }

  return <>
    <PageMeta title="Modo de campo | ViviendasLeón" description="Preparación offline del dispositivo." />
    <PageHeader title="Modo de campo" description="" actions={<Link className="text-sm font-medium text-brand-600" to="/visitas/nueva">Registrar visita</Link>} />
    {!usuario || !esTecnicoCampo(usuario) ? <Alert variant="warning">El modo de campo solo está disponible para personal técnico.</Alert> : <div className="grid gap-5 lg:grid-cols-2">
      <Card><CardBody className="space-y-5">
        <div className="flex items-center gap-3"><ShieldCheck size={24} className="text-brand-600"/><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Preparar dispositivo</h2></div>
        <p className="text-sm text-slate-600 dark:text-slate-300">Configura una clave local una vez en este dispositivo. Después, los datos se actualizan solos cuando tengas conexión.</p>
        {summary && <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <p className="font-semibold">Última descarga: {new Date(summary.downloadedAt).toLocaleString('es-GT')}</p>
          <p className="mt-1">{summary.families} familias · {summary.visits} visitas · {summary.cycles} ciclos · {summary.followUps} compromisos</p>
          {summary.storage === 'session' && <p className="mt-2">Solo disponible mientras la aplicación permanezca abierta. Configura la clave local para conservar los datos al cerrarla.</p>}
        </div>}
        {modoAcceso === 'offline' && <Alert variant="warning">Estás trabajando sin conexión. Puedes seguir registrando visitas; la descarga requiere conectividad.</Alert>}
        {modoAcceso === 'online' && <form onSubmit={(event) => void prepare(event)} className="space-y-3">
          <label htmlFor="field-key" className="block text-sm font-medium">{configured ? 'Clave de campo (para actualizar manualmente)' : 'Crear clave de campo (8 a 64 caracteres)'}</label>
          <input id="field-key" type="password" autoComplete="new-password" minLength={8} maxLength={64} required value={pin} onChange={event => setPin(event.target.value)} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900" />
          <Button type="submit" disabled={busy || connection.status !== 'connected'}><DownloadCloud size={17}/> {busy ? 'Preparando…' : summary ? 'Actualizar datos de campo' : 'Preparar para trabajar sin conexión'}</Button>
        </form>}
        {progress && <p role="status" className="text-sm text-brand-600">{progress}</p>}
        {error && <Alert variant="error">{error}</Alert>}
        {notice && <Alert variant="success">{notice}</Alert>}
        <p className="text-xs text-slate-500">La actualización es automática en sesiones abiertas y autorizadas. La clave se solicita al reabrir sin internet; la autorización vence a las 48 horas. Usa un teléfono con bloqueo de pantalla.</p>
      </CardBody></Card>
      <Card><CardBody className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Sincronización</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">{pending === null ? 'Consultando pendientes…' : `${pending} registro(s) por sincronizar o revisar`}</p>
        <Button type="button" variant="secondary" disabled={busy || connection.status !== 'connected' || modoAcceso !== 'online'} onClick={() => void syncNow()}><RefreshCcw size={17}/> Sincronizar ahora</Button>
        <Link to="/visitas/historial" className="block text-sm font-medium text-brand-600 underline">Ver historial de visitas</Link>
      </CardBody></Card>
    </div>}
  </>
}
