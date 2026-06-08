import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { createHandlerBoundToURL } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

self.addEventListener('message', (e) => {
  if (e.data && 'SKIP_WAITING' === e.data.type) self.skipWaiting()
})

self.addEventListener('push', (e) => {
  if (!e.data) return
  try {
    const data = e.data.json()
    self.registration.showNotification(data.title || 'Recordatorios', {
      body: data.body || '',
      icon: data.icon || '/recordatorios/icon-192x192.png',
      image: data.image,
      badge: '/recordatorios/icon-192x192.png',
      data: { clickAction: data.clickAction || '/' },
      vibrate: [200, 100, 200],
      requireInteraction: true
    })
  } catch {
    self.registration.showNotification('Recordatorios', {
      body: e.data.text(),
      icon: '/recordatorios/icon-192x192.png',
      badge: '/recordatorios/icon-192x192.png'
    })
  }
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.clickAction || '/recordatorios/'
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    for (const client of clientList) {
      if (client.url.includes(self.location.origin) && 'focus' in client) return client.focus()
    }
    if (clients.openWindow) return clients.openWindow(url)
  }))
})
