// NTF-11: suscripciones push del usuario autenticado.
const BASE = '/api/v1/notificaciones/push'

// Solo se guarda la decisión del usuario, nunca las claves ni el endpoint.
// Está separada por usuario y por origen (cada navegador tiene su propio storage).
const CLAVE_CONSENTIMIENTO = 'viviendas-leon:push:recordar:'
export function recordarActivacionPush(usuarioId: number, activada: boolean): void {
  if (!Number.isSafeInteger(usuarioId) || usuarioId < 1) return
  try {
    const clave = `${CLAVE_CONSENTIMIENTO}${usuarioId}`
    if (activada) localStorage.setItem(clave, '1')
    else localStorage.removeItem(clave)
  } catch { /* El almacenamiento privado podría estar bloqueado. */ }
}
export function activacionPushRecordada(usuarioId: number): boolean {
  if (!Number.isSafeInteger(usuarioId) || usuarioId < 1) return false
  try { return localStorage.getItem(`${CLAVE_CONSENTIMIENTO}${usuarioId}`) === '1' }
  catch { return false }
}

/** Restaura una suscripción del mismo usuario al entrar de nuevo.
 * Nunca solicita permiso en segundo plano ni reutiliza suscripciones de otra cuenta.
 * En navegadores que exijan interacción, el usuario puede activarla manualmente.
 */
export async function restaurarPushRecordado(usuarioId: number): Promise<boolean> {
  if (!activacionPushRecordada(usuarioId) || !navegadorPermitePush() ||
    Notification.permission !== 'granted') return false
  const registro = await navigator.serviceWorker.getRegistration()
  if (!registro?.active || !navigator.serviceWorker.controller ||
    await registro.pushManager.getSubscription()) return false
  const clavePublica = await obtenerClavePublicaPush()
  const suscripcion = await registro.pushManager.subscribe({
    userVisibleOnly: true, applicationServerKey: convertirClaveVapid(clavePublica),
  })
  try { await registrarDispositivoPush(suscripcion) }
  catch (error) {
    await suscripcion.unsubscribe().catch(() => false)
    throw error
  }
  return true
}

export type DispositivoPush = {
  id: number
  endpointHash: string
  navegador: string | null
  fechaCreacion: string
  fechaActualizacion: string
}

async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...opciones,
  })
  if (!respuesta.ok) {
    const mensaje = respuesta.status === 401
      ? 'Inicia sesión nuevamente para administrar las notificaciones.'
      : respuesta.status === 409
        ? 'Este dispositivo ya está vinculado con otra cuenta o alcanzaste el límite de dispositivos.'
        : respuesta.status === 503
          ? 'Web Push todavía no está configurado en este servidor.'
          : 'No se pudo completar la operación de notificaciones push.'
    throw new Error(mensaje)
  }
  return respuesta.json() as Promise<T>
}

export async function obtenerClavePublicaPush(): Promise<string> {
  const { publicKey } = await solicitar<{ publicKey: string }>('/clave-publica')
  return publicKey
}

export async function listarDispositivosPush(): Promise<DispositivoPush[]> {
  const { dispositivos } = await solicitar<{ dispositivos: DispositivoPush[] }>('/suscripciones')
  return dispositivos
}

export type PreferenciasEnvioPush = {
  habilitadas: boolean
  silencioInicio: string | null
  silencioFin: string | null
}

/** Las preferencias afectan a envíos automáticos, no a la prueba manual de NTF-11. */
export function consultarPreferenciasEnvioPush(): Promise<PreferenciasEnvioPush> {
  return solicitar<PreferenciasEnvioPush>('/preferencias')
}

export function guardarPreferenciasEnvioPush(preferencias: PreferenciasEnvioPush): Promise<PreferenciasEnvioPush> {
  return solicitar<PreferenciasEnvioPush>('/preferencias', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify(preferencias),
  })
}

export async function registrarDispositivoPush(suscripcion: PushSubscription): Promise<void> {
  await solicitar('/suscripciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({
      subscription: suscripcion.toJSON(),
      navegador: await obtenerNombreNavegador(),
    }),
  })
}

export type ResultadoPruebaPush = {
  estado: 'procesada'
  intentos: number
  aceptadas: number
  fallidas: number
  caducadas: number
}

export async function enviarPruebaPush(): Promise<ResultadoPruebaPush> {
  const respuesta = await fetch(`${BASE}/prueba`, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
  if (respuesta.status === 429) {
    const datos = await respuesta.json() as { error?: { message?: string } }
    throw new Error(datos.error?.message || 'Espera un minuto antes de volver a probar.')
  }
  if (!respuesta.ok) {
    if (respuesta.status === 503) throw new Error('Falta configurar Web Push en el servidor.')
    if (respuesta.status === 409) throw new Error('Registra al menos un dispositivo antes de enviar una prueba.')
    throw new Error('No se pudo enviar la prueba. Comprueba la conexión y la configuración.')
  }
  return respuesta.json() as Promise<ResultadoPruebaPush>
}

export async function eliminarDispositivoPush(id: number): Promise<void> {
  await solicitar(`/suscripciones/${id}`, {
    method: 'DELETE',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
}

export function navegadorPermitePush(): boolean {
  return window.isSecureContext && 'serviceWorker' in navigator &&
    'PushManager' in window && 'Notification' in window &&
    typeof crypto !== 'undefined' && !!crypto.subtle
}

export function convertirClaveVapid(clave: string): ArrayBuffer {
  const relleno = '='.repeat((4 - (clave.length % 4)) % 4)
  const cadena = atob((clave + relleno).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(cadena.length)
  for (let i = 0; i < cadena.length; i += 1) bytes[i] = cadena.charCodeAt(i)
  return bytes.buffer
}

export async function hashEndpoint(endpoint: string): Promise<string> {
  const digesto = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return Array.from(new Uint8Array(digesto))
    .map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function suscripcionDelNavegador(): Promise<PushSubscription | null> {
  if (!navegadorPermitePush()) return null
  const registro = await navigator.serviceWorker.getRegistration()
  if (!registro?.active) return null
  return registro.pushManager.getSubscription()
}

async function obtenerNombreNavegador(): Promise<string> {
  const agente = navigator.userAgent
  // Brave se presenta como Chrome en userAgent. Distinguirlo cuando lo permita su API.
  let esBrave = false
  try {
    const brave = (navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } }).brave
    if (brave?.isBrave) esBrave = await brave.isBrave()
  } catch {
    // El nombre es informativo: si no es posible detectarlo, continuar normalmente.
  }
  const navegador = esBrave ? 'Brave' : /Edg\//.test(agente) ? 'Edge' : /Firefox\//.test(agente)
    ? 'Firefox' : /Chrome\//.test(agente) ? 'Chrome' : /Safari\//.test(agente)
      ? 'Safari' : 'Navegador'
  const dispositivo = /iPhone|iPad/.test(agente) ? 'iPhone/iPad'
    : /Android/.test(agente) ? 'Android' : /Windows/.test(agente)
      ? 'Windows' : /Macintosh/.test(agente) ? 'macOS' : 'Dispositivo'
  return `${navegador} - ${dispositivo}`
}

/** Desvincula el navegador al cerrar sesión, para no recibir avisos de la cuenta anterior. */
export async function desactivarPushAlCerrarSesion(): Promise<void> {
  const suscripcion = await suscripcionDelNavegador()
  if (!suscripcion) return

  // Revocar primero el registro del usuario en el servidor. Si no es posible,
  // no cerrar sesión dejando una suscripción todavía habilitada para recibir avisos.
  try {
    const hash = await hashEndpoint(suscripcion.endpoint)
    const dispositivos = await listarDispositivosPush()
    const actual = dispositivos.find(item => item.endpointHash === hash)
    if (actual) await eliminarDispositivoPush(actual.id)
  } catch {
    throw new Error('No se pudo desvincular este navegador del servidor. Comprueba la conexión y vuelve a intentar cerrar sesión.')
  }

  if (!(await suscripcion.unsubscribe())) {
    throw new Error('No se pudo cancelar la suscripción del navegador. Desactívala en Notificaciones antes de cerrar sesión.')
  }
}

/** Una cuenta diferente jamás debe heredar los avisos del usuario anterior. */
export async function desvincularPushDeOtraCuenta(usuarioId?: number): Promise<void> {
  const suscripcion = await suscripcionDelNavegador()
  if (!suscripcion) return
  const hash = await hashEndpoint(suscripcion.endpoint)
  const dispositivos = await listarDispositivosPush()
  if (dispositivos.some(item => item.endpointHash === hash)) {
    // Migrar sin pedir otro clic a quienes activaron push antes de este cambio.
    if (usuarioId) recordarActivacionPush(usuarioId, true)
    return
  }
  if (!(await suscripcion.unsubscribe())) {
    throw new Error('No se pudo desvincular una suscripción anterior del navegador.')
  }
}
