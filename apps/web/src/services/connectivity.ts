/**
 * OFF-05. Estado compartido de conectividad para toda la PWA.
 * navigator.onLine indica conectividad del navegador, no salud de la API.
 * Se comprueba /api/health usando la misma ruta relativa que el frontend.
 */
export type ConnectivityStatus =
  | 'checking'
  | 'connected'
  | 'offline'
  | 'server-unavailable'

export type ConnectivitySnapshot = {
  status: ConnectivityStatus
  lastCheckedAt: string | null
  recoveredAt: string | null
}

type Listener = () => void
type RecoveryHandler = () => void | Promise<void>

const CHECK_INTERVAL_MS = 15000
const CHECK_TIMEOUT_MS = 5000

const initialStatus: ConnectivityStatus =
  typeof navigator !== 'undefined' && !navigator.onLine
    ? 'offline'
    : 'checking'

let snapshot: ConnectivitySnapshot = {
  status: initialStatus,
  lastCheckedAt: null,
  recoveredAt: null,
}
let lastStableStatus: 'connected' | 'offline' | 'server-unavailable' | null =
  initialStatus === 'offline' ? 'offline' : null

const listeners = new Set<Listener>()
const recoveryHandlers = new Set<RecoveryHandler>()
let running = false
let timer: ReturnType<typeof setInterval> | undefined
let currentController: AbortController | undefined
let requestSequence = 0

export function getConnectivitySnapshot(): ConnectivitySnapshot {
  return snapshot
}

function broadcast() {
  for (const listener of listeners) listener()
}

function publish(status: ConnectivityStatus, checked = false) {
  const recovered = status === 'connected' &&
    (lastStableStatus === 'offline' || lastStableStatus === 'server-unavailable')

  if (status !== 'checking') lastStableStatus = status

  snapshot = {
    status,
    lastCheckedAt: checked ? new Date().toISOString() : snapshot.lastCheckedAt,
    recoveredAt: recovered ? new Date().toISOString() : snapshot.recoveredAt,
  }
  broadcast()

  if (recovered) {
    for (const handler of recoveryHandlers) {
      try {
        // El callback se activa tras verificar la API. No marca operaciones
        // como sincronizadas: eso exige acuse válido de la API real.
        void Promise.resolve(handler()).catch(() => {
          // Cada consumidor debe gestionar sus propios errores.
        })
      } catch {
        // No permitir que un consumidor rompa la detección de conectividad.
      }
    }
  }
}

/** Comprobar manualmente o automáticamente conectividad + salud de API. */
export async function checkConnectivityNow(): Promise<void> {
  if (!running) return

  const sequence = ++requestSequence
  currentController?.abort()
  currentController = undefined

  if (!navigator.onLine) {
    publish('offline', true)
    return
  }

  if (snapshot.status !== 'connected') publish('checking')

  const controller = new AbortController()
  currentController = controller
  const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)

  try {
    const response = await fetch('/api/health', {
      cache: 'no-store',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error('La API no respondió correctamente.')

    // Evita un falso positivo si el servidor está mal configurado y entrega
    // index.html (HTTP 200) en vez de la API.
    const body: unknown = await response.json()
    if (
      typeof body !== 'object' || body === null ||
      !('status' in body) || body.status !== 'ok'
    ) throw new Error('La respuesta de la API no es válida.')

    if (running && sequence === requestSequence) {
      publish(navigator.onLine ? 'connected' : 'offline', true)
    }
  } catch {
    if (running && sequence === requestSequence) {
      publish(navigator.onLine ? 'server-unavailable' : 'offline', true)
    }
  } finally {
    clearTimeout(timeout)
    if (currentController === controller) currentController = undefined
  }
}

function handleOffline() {
  ++requestSequence
  currentController?.abort()
  currentController = undefined
  publish('offline', true)
}

function handleOnline() {
  void checkConnectivityNow()
}

function handleVisibility() {
  if (document.visibilityState === 'visible') void checkConnectivityNow()
}

function start() {
  if (running) return
  running = true
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  window.addEventListener('focus', handleOnline)
  document.addEventListener('visibilitychange', handleVisibility)
  timer = setInterval(() => void checkConnectivityNow(), CHECK_INTERVAL_MS)
  void checkConnectivityNow()
}

function stop() {
  if (!running) return
  running = false
  ++requestSequence
  currentController?.abort()
  currentController = undefined
  if (timer) clearInterval(timer)
  timer = undefined
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('focus', handleOnline)
  document.removeEventListener('visibilitychange', handleVisibility)
}

/** Un único monitor compartido para cualquier número de componentes. */
export function subscribeConnectivity(listener: Listener): () => void {
  listeners.add(listener)
  if (listeners.size === 1) start()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) stop()
  }
}

/**
 * Punto de integración para la sincronización real futura.
 * Se invoca una sola vez por transición desconectado/API caída -> API disponible.
 * No se invoca al abrir inicialmente una página que ya tiene conexión.
 */
export function subscribeConnectionRecovery(handler: RecoveryHandler): () => void {
  recoveryHandlers.add(handler)
  return () => { recoveryHandlers.delete(handler) }
}
