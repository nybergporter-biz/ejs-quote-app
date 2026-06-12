/* Web Push handlers — pulled into the generated Workbox service worker via
   vite-plugin-pwa's `importScripts`. Pushes are sent by the notify-lead
   Supabase Edge Function whenever a lead_requests row is inserted. */

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data && event.data.text() } }
  const title = data.title || 'New lead — Elite Junk Solutions'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'Someone requested a pickup on elitejunkut.com',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || 'ejs-lead',
      renotify: true,
      data: { url: data.url || '/?view=leads' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/?view=leads'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(url)
          return
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
