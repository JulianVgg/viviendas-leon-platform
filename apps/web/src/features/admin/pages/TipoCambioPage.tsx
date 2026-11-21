import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeftRight, RefreshCw, Save } from 'lucide-react'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import Card, { CardBody } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { useAuth } from '@/features/auth/AuthProvider'
import { canViewPath, isDireccionGeneral } from '@/features/auth/screenPermissions'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const API = (import.meta.env.VITE_API_URL?.trim() || '/api').replace(/\/$/, '')
type Rate = { quetzalesPorDolar: string; actualizadoEn: string }
async function request(init?: RequestInit): Promise<Rate> {
  const response = await fetch(`${API}/v1/administracion/tipo-cambio`, {
    credentials: 'same-origin', cache: 'no-store', ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error?.message || 'No fue posible consultar el tipo de cambio.')
  if (!body?.data?.quetzalesPorDolar) throw new Error('Respuesta de tipo de cambio incompleta.')
  return body.data as Rate
}

export default function TipoCambioPage() {
  const { usuario } = useAuth()
  const online = useOnlineStatus()
  const permitido = Boolean(usuario && canViewPath(usuario, '/administracion/tipo-cambio'))
  const puedeEditar = Boolean(usuario && (isDireccionGeneral(usuario) || usuario.permisos.includes('TIPO_CAMBIO_WRITE')))
  const [rate, setRate] = useState<Rate | null>(null)
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!permitido || !online) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true); setError('')
    void request({ signal: controller.signal }).then(next => {
      if (!controller.signal.aborted) { setRate(next); setValue(next.quetzalesPorDolar) }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No fue posible consultar la tasa.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [permitido, online, refresh])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!puedeEditar || saving || !online) return
    if (!/^(?:\d+)(?:\.\d{1,6})?$/.test(value) || Number(value) < 0.01 || Number(value) > 100) {
      setError('Ingresa un valor entre Q0.01 y Q100, con hasta 6 decimales.'); return
    }
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await request({ method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quetzalesPorDolar: value }) })
      setRate(result); setValue(result.quetzalesPorDolar); setNotice('Tipo de cambio actualizado.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible guardar la tasa.') }
    finally { setSaving(false) }
  }
  if (!permitido) return <Alert variant="error">No tienes permiso para consultar esta configuración.</Alert>
  return <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
    <PageMeta title="Tipo de cambio | ViviendasLeón" description="Conversión institucional de reportes." />
    <PageHeader title="Tipo de cambio" description="" actions={<Button variant="secondary" disabled={!online || loading} onClick={() => setRefresh(n => n + 1)}><RefreshCw size={16}/> Actualizar</Button>} />
    {!online && <Alert variant="warning">Se necesita conexión para actualizar la tasa.</Alert>}
    {error && <Alert variant="error">{error}</Alert>}
    {notice && <Alert variant="success">{notice}</Alert>}
    <Card><CardBody>
      <div className="flex items-center gap-3"><div className="rounded-xl bg-brand-50 p-3 text-brand-600 dark:bg-brand-500/15"><ArrowLeftRight size={22}/></div>
        <div><h2 className="text-base font-semibold text-gray-900 dark:text-white">Valor del dólar</h2><p className="text-sm text-gray-500">Tasa institucional para reportes.</p></div>
      </div>
      <form onSubmit={event => void save(event)} className="mt-6 max-w-md space-y-4">
        <label className="block space-y-2"><span className="text-sm font-medium text-gray-700 dark:text-gray-200">Quetzales por 1 USD</span>
          <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-brand-200 dark:border-gray-700 dark:bg-gray-900">
            <span className="flex items-center bg-gray-50 px-4 font-semibold text-gray-700 dark:bg-gray-800 dark:text-white">Q</span>
            <input aria-label="Quetzales por dólar" className="min-h-11 w-full bg-transparent px-3 text-base text-gray-900 outline-none dark:text-white"
              type="text" inputMode="decimal" maxLength={12} required value={value} disabled={!puedeEditar || loading || saving || !online}
              onChange={event => setValue(event.target.value.replace(',', '.'))} placeholder="7.60" />
          </div>
        </label>
        <p className="text-sm text-gray-600 dark:text-gray-400">{rate ? `Tasa vigente: Q ${rate.quetzalesPorDolar} por USD` : loading ? 'Cargando…' : 'Sin datos'}</p>
        {puedeEditar && <Button type="submit" disabled={!online || saving || loading}><Save size={17}/>{saving ? 'Guardando…' : 'Guardar cambio'}</Button>}
      </form>
      <p className="mt-5 text-xs text-gray-500 dark:text-gray-400">La equivalencia en dólares se calcula con esta tasa. Las ventas originales y las cotizaciones históricas no se modifican.</p>
    </CardBody></Card>
  </main>
}
