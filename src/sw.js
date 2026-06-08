import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { createHandlerBoundToURL } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

self.addEventListener('message', (e) => {
  if (e.data && 'SKIP_WAITING' === e.data.type) self.skipWaiting()

  // Soporte para notificaciones locales enviadas desde la app
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = e.data
    self.registration.showNotification(title || 'Recordatorio', {
      body: body || '',
      icon: '/recordatorios/icon-192x192.png',
      badge: '/recordatorios/icon-192x192.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag: tag || 'local-reminder',
      data: { clickAction: '/recordatorios/' }
    })
  }
})

self.addEventListener('push', (e) => {
  if (!e.data) return
  try {
    const data = e.data.json()
    const title = data.notification?.title || data.title || 'Recordatorios'
    const body = data.notification?.body || data.body || ''
    const icon = data.notification?.icon || data.icon || '/recordatorios/icon-192x192.png'
    const image = data.notification?.image || data.image
    const clickAction = data.notification?.click_action || data.data?.clickAction || '/'

    self.registration.showNotification(title, {
      body,
      icon,
      image,
      badge: '/recordatorios/icon-192x192.png',
      data: { clickAction },
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

