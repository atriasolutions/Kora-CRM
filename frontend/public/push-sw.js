/* global self, clients */
/**
 * Handlers Web Push importados por el SW generado (Workbox).
 * Payload JSON: { title, body, href?, tag?, notificationId? }
 */
self.addEventListener('push', (event) => {
  let data = {
    title: 'Kora CRM',
    body: 'Tienes una notificación nueva',
    href: '/inicio',
    tag: 'kora-notification',
  }
  try {
    if (event.data) {
      const parsed = event.data.json()
      data = {
        title: parsed.title || data.title,
        body: parsed.body || data.body,
        href: parsed.href || data.href,
        tag: parsed.tag || parsed.notificationId || data.tag,
      }
    }
  } catch {
    try {
      const text = event.data?.text()
      if (text) data.body = text
    } catch {
      /* ignore */
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa/icon-192.png',
      badge: '/pwa/icon-192.png',
      tag: String(data.tag),
      renotify: true,
      requireInteraction: false,
      data: { href: data.href },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const href =
    (event.notification.data && event.notification.data.href) || '/inicio'
  const targetUrl = new URL(href, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus().then((focused) => {
            if (focused && 'navigate' in focused) {
              return focused.navigate(targetUrl)
            }
            return focused
          })
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
      return undefined
    }),
  )
})
