/* NTF-11: manejador Web Push adicional al Service Worker generado por Workbox.
 * No modifica el sistema offline ni sus caches.
 */
self.addEventListener('push', event => {
  // Mostrar solo texto genérico: una pantalla bloqueada podría ser visible a terceros.
  event.waitUntil(self.registration.showNotification('Viviendas León', {
    body: 'Tienes un nuevo aviso. Abre Viviendas León para consultarlo.',
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/pwa-192x192.png',
    data: { url: '/notificaciones' },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const destino = new URL('/notificaciones', self.location.origin).href
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const ventana = ventanas.find(cliente => new URL(cliente.url).origin === self.location.origin)
    if (ventana) {
      await ventana.navigate(destino)
      await ventana.focus()
    } else {
      await self.clients.openWindow(destino)
    }
  })())
})
