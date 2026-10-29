/* NTF-12: Web Push solo transporta identificador y ruta segura; nunca datos personales.
 * Este script se importa desde el SW de Workbox y no modifica sus caches.
 */
// La ruta del aviso no es autorización: el Service Worker no conoce la sesión.
// La aplicación consultará el destino permitido para el usuario autenticado.
function destinoPushSeguro(id) {
  return Number.isSafeInteger(id) && id > 0 && id <= 2147483647
    ? `/notificaciones?pushId=${id}` : '/notificaciones'
}

self.addEventListener('push', event => {
  let id = null
  try {
    const payload = event.data ? event.data.json() : null
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      if (Number.isSafeInteger(payload.notificacionId) && payload.notificacionId > 0 && payload.notificacionId <= 2147483647) {
        id = payload.notificacionId
      }
    }
  } catch {
    // Los avisos de prueba de NTF-11 no tienen cuerpo. Se mantiene ruta segura.
  }
  // No revelar títulos, familiares, actividades ni nombres en pantallas bloqueadas.
  event.waitUntil(self.registration.showNotification('Viviendas León', {
    body: 'Tienes un nuevo aviso. Abre Viviendas León para consultarlo.',
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/pwa-192x192.png',
    ...(id ? { tag: `vvl-ntf-${id}` } : {}),
    data: { id },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const ruta = destinoPushSeguro(event.notification?.data?.id)
    const destino = new URL(ruta, self.location.origin).href
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const ventana = ventanas.find(cliente => {
      try { return new URL(cliente.url).origin === self.location.origin }
      catch { return false }
    })
    if (ventana) {
      try {
        const navegada = await ventana.navigate(destino)
        if (navegada) { await navegada.focus(); return }
      } catch {
        // Si no se puede navegar la pestaña existente, abrir una nueva.
      }
    }
    await self.clients.openWindow(destino)
  })())
})
