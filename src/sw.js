import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Usar NetworkFirst para HTML: siempre intenta traer la última versión del servidor
// Si no hay conexión, usa la última guardada en caché.
registerRoute(
  new NavigationRoute(new NetworkFirst({
    cacheName: 'html-cache',
    networkTimeoutSeconds: 3
  }))
)

self.addEventListener('message', (e) => {
  if (e.data && 'SKIP_WAITING' === e.data.type) self.skipWaiting()

  // Badge en Android mediante notificación: ahora con el título y un
  // extracto de la descripción de cada recordatorio permanente.
  if (e.data && e.data.type === 'SET_PERMANENT_BADGE') {
    const count = e.data.count || 0
    const items = Array.isArray(e.data.items) ? e.data.items : []
    if (count > 0) {
      const MAX_ITEMS = 5
      const shown = items.slice(0, MAX_ITEMS)
      const lines = shown.map(it => (
        `• ${it.title}${it.description ? ` — ${it.description}` : ''}`
      ))
      const rest = count - shown.length
      if (rest > 0) lines.push(`… y ${rest} más`)

      const title = count === 1
        ? `📌 ${shown[0]?.title || '1 recordatorio permanente'}`
        : `📌 ${count} recordatorios permanentes`
      const body = count === 1
        ? (shown[0]?.description || 'Recordatorio permanente — ábrelo para ver los detalles')
        : lines.join('\n')

      e.waitUntil(
        self.registration.showNotification(title, {
          body,
          icon: '/recordatorios/icon-192x192.png',
          badge: '/recordatorios/icon-192x192.png',
          tag: 'permanent-badge',
          silent: true,
          requireInteraction: true,
          data: { clickAction: '/recordatorios/' }
        })
      )
    } else {
      e.waitUntil(
        self.registration.getNotifications({ tag: 'permanent-badge' })
          .then(notifs => notifs.forEach(n => n.close()))
      )
    }
    return
  }

  // Al abrir la app, cerrar la notificación del badge
  if (e.data && e.data.type === 'CLEAR_PERMANENT_BADGE') {
    e.waitUntil(
      self.registration.getNotifications({ tag: 'permanent-badge' })
        .then(notifs => notifs.forEach(n => n.close()))
    )
    return
  }

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
  let title = 'Recordatorio'
  let body = 'Tienes un nuevo aviso'
  let icon = '/recordatorios/icon-192x192.png'

  try {
    const data = e.data.json()
    // FCM Web Push format or generic JSON format
    title = data.notification?.title || data.title || title
    body = data.notification?.body || data.body || JSON.stringify(data).substring(0, 50)
    icon = data.notification?.icon || data.icon || icon
  } catch (err) {
    // If it's not JSON, it might be raw text
    body = e.data.text() || 'Cuerpo del mensaje ilegible'
  }

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/recordatorios/icon-192x192.png',
      vibrate: [200, 100, 200],
      requireInteraction: true,
      data: { clickAction: '/recordatorios/' }
    })
  )
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

