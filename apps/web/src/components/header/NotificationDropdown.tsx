import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, LoaderCircle, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/AuthProvider'
import NotificacionItem from '@/features/notifications/components/NotificacionItem'
import {
  emitirCambioNotificaciones, marcarNotificacionLeida, marcarTodasNotificacionesLeidas,
  NOTIFICACIONES_ACTUALIZADAS, obtenerContadorNotificaciones, obtenerNotificaciones,
  type Notificacion,
} from '@/features/notifications/services/notificationsService'
import { obtenerDestinoSeguro } from '@/features/notifications/utils/notificationUtils'
import { eventoDeNotificacion } from '@/features/notifications/services/invitationsService'

const CONSULTA_CADA_MS = 60_000

export default function NotificationDropdown() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [open, setOpen] = useState(false)
  const [noLeidas, setNoLeidas] = useState(0)
  const [items, setItems] = useState<Notificacion[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [procesandoId, setProcesandoId] = useState<number | null>(null)
  const [marcandoTodas, setMarcandoTodas] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const cargarContador = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await obtenerContadorNotificaciones(signal)
      if (!signal?.aborted) setNoLeidas(result.noLeidas)
    } catch { /* El contador no muestra un número simulado si falla la red. */ }
  }, [])

  const cargarRecientes = useCallback(async (signal?: AbortSignal) => {
    setCargando(true)
    setError('')
    try {
      const result = await obtenerNotificaciones({ limite: 10, signal })
      if (signal?.aborted) return
      setItems(result.notificaciones)
      setNoLeidas(result.noLeidas)
    } catch {
      if (!signal?.aborted) setError('No fue posible cargar las notificaciones. Comprueba la conexión.')
    } finally {
      if (!signal?.aborted) setCargando(false)
    }
  }, [])

  // Al cambiar de usuario se limpia inmediatamente la bandeja del anterior.
  useEffect(() => {
    setItems([])
    setNoLeidas(0)
    setOpen(false)
    if (!usuario) return
    const controller = new AbortController()
    const consultar = () => { if (document.visibilityState === 'visible') void cargarContador(controller.signal) }
    consultar()
    const intervalo = window.setInterval(consultar, CONSULTA_CADA_MS)
    window.addEventListener('focus', consultar)
    document.addEventListener('visibilitychange', consultar)
    window.addEventListener(NOTIFICACIONES_ACTUALIZADAS, consultar)
    return () => {
      controller.abort()
      window.clearInterval(intervalo)
      window.removeEventListener('focus', consultar)
      document.removeEventListener('visibilitychange', consultar)
      window.removeEventListener(NOTIFICACIONES_ACTUALIZADAS, consultar)
    }
  }, [usuario?.id, cargarContador]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    void cargarRecientes(controller.signal)
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !dropdownRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); buttonRef.current?.focus() }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      controller.abort()
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, cargarRecientes])

  async function activarNotificacion(notificacion: Notificacion) {
    if (procesandoId !== null || marcandoTodas) return
    const destino = obtenerDestinoSeguro(notificacion.referencia, usuario)
    setError('')
    if (!notificacion.fechaLectura) {
      setProcesandoId(notificacion.id)
      try {
        const resultado = await marcarNotificacionLeida(notificacion.id)
        setItems(actuales => actuales.map(item => item.id === notificacion.id ? { ...item, fechaLectura: resultado.fechaLectura } : item))
        setNoLeidas(actual => Math.max(0, actual - 1))
        emitirCambioNotificaciones()
      } catch {
        setError('No se pudo marcar la notificación como leída. Intenta nuevamente.')
        return
      } finally {
        setProcesandoId(null)
      }
    }
    const eventoId = eventoDeNotificacion(notificacion)
    if (eventoId !== null) { setOpen(false); navigate(`/notificaciones?invitacion=${eventoId}`); return }
    if (destino) { setOpen(false); navigate(destino) }
  }

  async function marcarTodas() {
    if (marcandoTodas || procesandoId !== null) return
    setMarcandoTodas(true)
    setError('')
    try {
      await marcarTodasNotificacionesLeidas()
      const fecha = new Date().toISOString()
      setItems(actuales => actuales.map(item => item.fechaLectura ? item : { ...item, fechaLectura: fecha }))
      setNoLeidas(0)
      emitirCambioNotificaciones()
    } catch {
      setError('No fue posible marcar todas como leídas. Intenta nuevamente.')
    } finally {
      setMarcandoTodas(false)
    }
  }

  return <div ref={dropdownRef} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <button
      ref={buttonRef}
      type="button"
      className="layout-icon-button layout-focus relative"
      aria-label={`Notificaciones${noLeidas ? `, ${noLeidas} sin leer` : ', ninguna sin leer'}`}
      aria-expanded={open}
      aria-controls="notification-panel"
      onClick={() => setOpen(value => !value)}
    >
      <Bell size={20} strokeWidth={1.7} aria-hidden="true" />
      {noLeidas > 0 && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex min-w-4 h-4 items-center justify-center rounded-full border-2 border-white bg-orange-400 px-0.5 text-[9px] font-semibold leading-none text-white dark:border-gray-900">{noLeidas > 99 ? '99+' : noLeidas}</span>}
    </button>
    {open && <section id="notification-panel" aria-label="Centro de notificaciones" className="fixed inset-x-3 top-16 z-50 flex max-h-[min(32rem,calc(100dvh-5rem))] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg sm:absolute sm:inset-x-auto sm:end-0 sm:top-auto sm:mt-4 sm:h-[30rem] sm:w-[23rem] dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-800">
        <div className="flex min-w-0 items-center gap-2"><h2 className="text-lg font-semibold text-gray-800 dark:text-white">Notificaciones</h2>{noLeidas > 0 && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">{noLeidas} nuevas</span>}</div>
        <button type="button" aria-label="Cerrar notificaciones" className="layout-focus flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" onClick={() => { setOpen(false); buttonRef.current?.focus() }}><X size={20} /></button>
      </div>
      <div className="flex items-center justify-between gap-2 px-1 py-2 text-xs text-gray-500 dark:text-gray-400">
        <span>Actividad reciente</span>
        {noLeidas > 0 && <button type="button" onClick={() => void marcarTodas()} disabled={marcandoTodas || procesandoId !== null} className="layout-focus inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-300 dark:hover:bg-brand-500/10">{marcandoTodas ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCheck size={14} />} Marcar todas como leídas</button>}
      </div>
      {error && <div role="alert" className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">{error} <button type="button" className="layout-focus ms-1 underline" onClick={() => void cargarRecientes()}>Reintentar</button></div>}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto" aria-busy={cargando}>
        {cargando ? <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500 dark:text-gray-400"><LoaderCircle size={18} className="animate-spin" />Cargando notificaciones...</div> : items.length ? <ul>{items.map(item => <NotificacionItem key={item.id} notificacion={item} destino={obtenerDestinoSeguro(item.referencia, usuario)} procesando={procesandoId === item.id} onActivar={() => void activarNotificacion(item)} />)}</ul> : !error ? <div className="flex flex-col items-center gap-3 px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400"><Bell size={28} className="text-gray-400" /><span>No tienes notificaciones por el momento.</span></div> : null}
      </div>
      <button type="button" className="layout-focus mt-3 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" onClick={() => { setOpen(false); navigate('/notificaciones') }}>Ver todas las notificaciones</button>
    </section>}
  </div>
}
