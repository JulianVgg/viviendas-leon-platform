import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import PageMeta from '@/components/common/PageMeta'
import PageHeader from '@/components/common/PageHeader'
import { useAuth } from '@/features/auth/AuthProvider'
import NotificacionItem from '../components/NotificacionItem'
import ReminderPreferences from '../components/ReminderPreferences'
import CrearInvitacionButton, { puedeGestionarInvitaciones } from '../components/CrearInvitacionButton'
import InvitacionDetalleDialog from '../components/InvitacionDetalleDialog'
import SeguimientoInvitaciones from '../components/SeguimientoInvitaciones'
import { eventoDeNotificacion } from '../services/invitationsService'
import {
  emitirCambioNotificaciones, marcarNotificacionLeida, marcarTodasNotificacionesLeidas,
  obtenerNotificaciones, type EstadoNotificacion, type ListadoNotificaciones, type Notificacion,
} from '../services/notificationsService'
import { obtenerDestinoSeguro } from '../utils/notificationUtils'

const TABS: { etiqueta: string; estado: EstadoNotificacion }[] = [
  { etiqueta: 'Todas', estado: 'todas' },
  { etiqueta: 'No leídas', estado: 'no_leidas' },
  { etiqueta: 'Invitaciones', estado: 'invitaciones' },
  { etiqueta: 'Leídas', estado: 'leidas' },
]

export default function NotificacionesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { usuario } = useAuth()
  const gestionar = Boolean(usuario && puedeGestionarInvitaciones(usuario.roles))
  const [estado, setEstado] = useState<EstadoNotificacion>('todas')
  const [pagina, setPagina] = useState(1)
  const [data, setData] = useState<ListadoNotificaciones | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [procesandoId, setProcesandoId] = useState<number | null>(null)
  const [marcandoTodas, setMarcandoTodas] = useState(false)
  const [revision, setRevision] = useState(0)
  const [invitacionId, setInvitacionId] = useState<number | null>(null)
  const param = searchParams.get('invitacion')
  const idParam = Number(param)
  const idDesdeUrl = param && /^[1-9]\d*$/.test(param) && Number.isSafeInteger(idParam) && idParam <= 2_147_483_647 ? idParam : null
  const invitacionAbierta = invitacionId ?? idDesdeUrl

  const recargar = useCallback(() => setRevision(actual => actual + 1), [])
  const cerrarInvitacion = () => {
    setInvitacionId(null)
    if (param !== null) {
      const siguiente = new URLSearchParams(searchParams)
      siguiente.delete('invitacion')
      setSearchParams(siguiente, { replace: true })
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    setCargando(true)
    setError('')
    void obtenerNotificaciones({ estado, pagina, limite: 20, signal: controller.signal })
      .then(result => {
        if (!controller.signal.aborted) {
          setData(result)
          if (pagina > 1 && result.paginacion.totalPaginas < pagina) setPagina(Math.max(1, result.paginacion.totalPaginas))
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('No se pudieron cargar las notificaciones. Revisa tu conexión.')
      })
      .finally(() => { if (!controller.signal.aborted) setCargando(false) })
    return () => controller.abort()
  }, [estado, pagina, revision, usuario?.id])

  async function activarNotificacion(item: Notificacion) {
    if (procesandoId !== null || marcandoTodas) return
    const destino = obtenerDestinoSeguro(item.referencia, usuario)
    setError('')
    if (!item.fechaLectura) {
      setProcesandoId(item.id)
      try {
        await marcarNotificacionLeida(item.id)
        emitirCambioNotificaciones()
        recargar()
      } catch {
        setError('No fue posible marcar la notificación como leída. Intenta nuevamente.')
        return
      } finally {
        setProcesandoId(null)
      }
    }
    const eventoId = eventoDeNotificacion(item)
    if (eventoId !== null) { setInvitacionId(eventoId); return }
    if (destino) navigate(destino)
  }

  async function marcarTodas() {
    if (marcandoTodas || procesandoId !== null) return
    setMarcandoTodas(true)
    setError('')
    try {
      await marcarTodasNotificacionesLeidas()
      emitirCambioNotificaciones()
      recargar()
    } catch {
      setError('No se pudieron marcar todas las notificaciones como leídas.')
    } finally {
      setMarcandoTodas(false)
    }
  }

  return <div>
    <PageMeta title="Notificaciones | Viviendas León" description="Centro de notificaciones personales" />
    <PageHeader title="Notificaciones" description="Consulta tus avisos, recordatorios y actividades asignadas." />
    <CrearInvitacionButton />
    <div className={gestionar ? 'grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]' : ''}>
    <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-5 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map(tab => <button key={tab.estado} type="button" aria-pressed={estado === tab.estado} className={`layout-focus rounded-lg px-3 py-2 text-sm font-medium transition-colors ${estado === tab.estado ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'}`} onClick={() => { setEstado(tab.estado); setPagina(1) }}>{tab.etiqueta}</button>)}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Actualizar notificaciones" onClick={recargar} disabled={cargando} className="layout-focus flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"><RefreshCw size={16} /></button>
          {(data?.noLeidas ?? 0) > 0 && <button type="button" disabled={marcandoTodas || procesandoId !== null} className="layout-focus inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:text-sm dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" onClick={() => void marcarTodas()}>{marcandoTodas ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCheck size={16} />}Marcar todas como leídas</button>}
        </div>
      </div>
      {error && <div role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-500/10 dark:text-red-300">{error} <button type="button" className="layout-focus ms-1 underline" onClick={recargar}>Reintentar</button></div>}
      {cargando ? <div role="status" className="flex items-center justify-center gap-2 px-4 py-16 text-sm text-gray-500 dark:text-gray-400"><LoaderCircle className="animate-spin" size={18} />Cargando notificaciones...</div> : data?.notificaciones.length ? <ul className="px-2 sm:px-4">{data.notificaciones.map(item => <NotificacionItem key={item.id} notificacion={item} destino={obtenerDestinoSeguro(item.referencia, usuario)} procesando={procesandoId === item.id} onActivar={() => void activarNotificacion(item)} />)}</ul> : !error ? <div className="flex flex-col items-center gap-3 px-5 py-16 text-center text-sm text-gray-500 dark:text-gray-400"><Bell size={30} /><p>{estado === 'no_leidas' ? 'No tienes notificaciones pendientes de lectura.' : estado === 'leidas' ? 'Todavía no tienes notificaciones leídas.' : 'No tienes notificaciones por el momento.'}</p></div> : null}
      {data && data.paginacion.totalPaginas > 1 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-4 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">Página {pagina} de {data.paginacion.totalPaginas} · {data.paginacion.total} notificaciones</p>
        <div className="flex gap-2">
          <button type="button" disabled={pagina === 1 || cargando} onClick={() => setPagina(actual => actual - 1)} className="layout-focus inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"><ChevronLeft size={16} />Anterior</button>
          <button type="button" disabled={pagina >= data.paginacion.totalPaginas || cargando} onClick={() => setPagina(actual => actual + 1)} className="layout-focus inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300">Siguiente<ChevronRight size={16} /></button>
        </div>
      </div>}
    </div>
    {gestionar && <SeguimientoInvitaciones />}
    </div>
    <div className="mt-5"><ReminderPreferences usuarioId={usuario?.id} /></div>
    <InvitacionDetalleDialog eventoId={invitacionAbierta} onClose={cerrarInvitacion}
      onResponded={() => { emitirCambioNotificaciones(); recargar() }} />
  </div>
}
