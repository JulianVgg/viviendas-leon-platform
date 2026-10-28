import { useEffect, useState } from 'react'
import { BellRing, BellOff, LoaderCircle, Trash2 } from 'lucide-react'
import {
  convertirClaveVapid, eliminarDispositivoPush, enviarPruebaPush, hashEndpoint,
  listarDispositivosPush, navegadorPermitePush, obtenerClavePublicaPush,
  registrarDispositivoPush, suscripcionDelNavegador,
  type DispositivoPush,
} from '../services/pushService'

/** NTF-11: los permisos solo se solicitan al hacer clic en Activar. */
export default function PushPreferences({ usuarioId }: { usuarioId?: number }) {
  const [dispositivos, setDispositivos] = useState<DispositivoPush[]>([])
  const [hashActual, setHashActual] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [revision, setRevision] = useState(0)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const compatible = navegadorPermitePush()
  const permiso = compatible ? Notification.permission : 'denied'
  const dispositivoActual = dispositivos.find(item => item.endpointHash === hashActual)
  const otraCuenta = hashActual !== null && !dispositivoActual

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      try {
        const lista = await listarDispositivosPush()
        const local = await suscripcionDelNavegador()
        const hash = local ? await hashEndpoint(local.endpoint) : null
        if (activo) {
          setDispositivos(lista)
          setHashActual(hash)
        }
      } catch {
        if (activo) setError('No se pudo consultar la configuración push. Comprueba tu conexión.')
      } finally {
        if (activo) setCargando(false)
      }
    }
    if (usuarioId) void cargar()
    else setCargando(false)
    return () => { activo = false }
  }, [usuarioId, revision])

  // Si cambia el Service Worker o regresamos a esta pestaña, actualizar el
  // estado real del navegador. No asumir que una fila remota es este dispositivo.
  useEffect(() => {
    if (!usuarioId) return
    const actualizar = () => setRevision(actual => actual + 1)
    window.addEventListener('focus', actualizar)
    navigator.serviceWorker?.addEventListener('controllerchange', actualizar)
    return () => {
      window.removeEventListener('focus', actualizar)
      navigator.serviceWorker?.removeEventListener('controllerchange', actualizar)
    }
  }, [usuarioId])

  async function ejecutar(accion: () => Promise<string>) {
    setOcupado(true)
    setMensaje('')
    setError('')
    try {
      setMensaje(await accion())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la operación.')
    } finally {
      setOcupado(false)
      setRevision(actual => actual + 1)
    }
  }

  async function activar() {
    await ejecutar(async () => {
      if (!compatible) throw new Error('Este navegador o contexto no admite notificaciones push.')
      if (Notification.permission === 'denied') {
        throw new Error('El permiso está bloqueado. Habilítalo en la configuración de tu navegador.')
      }
      if (otraCuenta) {
        throw new Error('Este navegador conserva una suscripción de otra cuenta. Desvincúlala primero.')
      }
      if (!navigator.serviceWorker.controller) {
        throw new Error('La PWA no tiene un Service Worker activo. Abre la versión compilada y recarga la página.')
      }
      // La autorización se solicita directamente como consecuencia del clic.
      const autorizado = await Notification.requestPermission()
      if (autorizado !== 'granted') {
        throw new Error('No se concedió permiso para mostrar notificaciones.')
      }
      const registro = await navigator.serviceWorker.getRegistration()
      if (!registro?.active) {
        throw new Error('La PWA aún no tiene Service Worker activo. Instala/abre la versión compilada y recarga.')
      }
      const clavePublica = await obtenerClavePublicaPush()
      let suscripcion = await registro.pushManager.getSubscription()
      const nueva = !suscripcion
      if (!suscripcion) {
        suscripcion = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertirClaveVapid(clavePublica),
        })
      }
      try {
        await registrarDispositivoPush(suscripcion)
      } catch (error) {
        // No conservar suscripciones nuevas si falló el registro en PostgreSQL.
        if (nueva) await suscripcion.unsubscribe().catch(() => false)
        throw error
      }
      return 'Notificaciones activadas para este dispositivo.'
    })
  }

  async function desactivarActual() {
    await ejecutar(async () => {
      const local = await suscripcionDelNavegador()
      if (!local) return 'No hay una suscripción activa en este navegador.'
      const hash = await hashEndpoint(local.endpoint)
      const propio = dispositivos.find(item => item.endpointHash === hash)
      if (propio) await eliminarDispositivoPush(propio.id)
      const eliminado = await local.unsubscribe()
      if (!eliminado) {
        throw new Error('No se pudo cancelar la suscripción local. Revisa los permisos del navegador.')
      }
      return propio ? 'Notificaciones desactivadas en este dispositivo.'
        : 'Suscripción local anterior desvinculada. Ya puedes activar la de tu cuenta.'
    })
  }

  async function probarEnvio() {
    await ejecutar(async () => {
      const resultado = await enviarPruebaPush()
      if (resultado.aceptadas === 0) {
        throw new Error('Ningún servicio push aceptó el envío. Revisa el backend y los permisos.')
      }
      return `Prueba aceptada por ${resultado.aceptadas} de ${resultado.intentos} servicio(s) push. ` +
        'Comprueba si aparece el aviso en tus dispositivos.' +
        (resultado.caducadas ? ` Se eliminaron ${resultado.caducadas} suscripciones caducadas.` : '')
    })
  }

  async function quitarDispositivo(id: number) {
    await ejecutar(async () => {
      await eliminarDispositivoPush(id)
      return 'Dispositivo eliminado del registro de notificaciones.'
    })
  }

  return <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900" aria-label="Notificaciones push">
    <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 dark:text-gray-100">
      <BellRing size={18} /> Notificaciones push
    </h2>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
      Recibe avisos de Viviendas León aunque la página no esté abierta, cuando el dispositivo sea compatible.
    </p>
    {!compatible && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">
      Este navegador o conexión no admite Web Push. Utiliza HTTPS o localhost y un navegador compatible.
      En iPhone/iPad, añade la PWA a la pantalla de inicio.
    </p>}
    {compatible && permiso === 'denied' && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">
      Las notificaciones están bloqueadas por el navegador. Debes habilitarlas desde sus ajustes.
    </p>}
    {cargando ? <p className="mt-3 flex items-center gap-2 text-sm text-gray-500"><LoaderCircle size={16} className="animate-spin" /> Cargando dispositivos…</p> : <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {dispositivoActual ? <button type="button" disabled={ocupado} onClick={() => void desactivarActual()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          <BellOff size={16} /> Desactivar en este dispositivo
        </button> : otraCuenta ? <button type="button" disabled={ocupado} onClick={() => void desactivarActual()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200">
          <BellOff size={16} /> Desvincular suscripción anterior
        </button> : <button type="button" disabled={!compatible || permiso === 'denied' || ocupado || !usuarioId}
          onClick={() => void activar()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
          <BellRing size={16} /> Activar notificaciones
        </button>}
        {ocupado && <LoaderCircle size={16} className="animate-spin text-gray-500" aria-label="Procesando" />}
      </div>
      {compatible && !dispositivoActual && !otraCuenta && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Se solicitará tu autorización solamente cuando pulses «Activar notificaciones».
      </p>}
      {compatible && !dispositivoActual && !otraCuenta && dispositivos.length > 0 && <p role="status" className="mt-2 text-sm text-amber-700 dark:text-amber-300">
        Esta página no detecta una suscripción activa en el navegador actual. La lista puede incluir otros
        navegadores o instalaciones. Para recibir avisos aquí, abre Viviendas León desde su dirección
        habitual y activa las notificaciones en este navegador.
      </p>}
      {dispositivos.length > 0 && <div className="mt-3">
        <button type="button" disabled={ocupado || !usuarioId} onClick={() => void probarEnvio()}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
          <BellRing size={16} /> Enviar notificación de prueba a mis dispositivos
        </button>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Máximo una prueba por minuto. La confirmación indica aceptación por el servicio push, no entrega garantizada.
        </p>
      </div>}
      <h3 className="mt-5 text-sm font-semibold text-gray-800 dark:text-gray-100">Mis dispositivos registrados</h3>
      {dispositivos.length === 0 ? <p className="mt-2 text-sm text-gray-500">Aún no tienes dispositivos registrados.</p>
        : <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
          {dispositivos.map(dispositivo => <li key={dispositivo.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{dispositivo.navegador || 'Navegador'}
                {dispositivo.endpointHash === hashActual && <span className="ml-2 text-xs font-normal text-emerald-600">Este dispositivo</span>}
              </p>
              <p className="text-xs text-gray-500">Registrado: {new Date(dispositivo.fechaCreacion).toLocaleDateString('es-GT')}</p>
            </div>
            <button type="button" disabled={ocupado} aria-label={`Eliminar ${dispositivo.navegador || 'dispositivo'}`}
              onClick={() => dispositivo.endpointHash === hashActual
                ? void desactivarActual() : void quitarDispositivo(dispositivo.id)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200">
              <Trash2 size={14} /> Eliminar
            </button>
          </li>)}
        </ul>}
    </>}
    {mensaje && <p role="status" className="mt-3 text-sm text-emerald-600">{mensaje}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </section>
}
