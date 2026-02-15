// Service Worker for Web Push Notifications
// Handles push events and notification clicks

self.addEventListener('push', function (event) {
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data = { title: 'Celestia', body: event.data.text() }
    }
  }

  const title = data.title || 'Celestia'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    badge: '/badge.png',
    data: {
      url: data.url || '/dashboard',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/dashboard'

  event.waitUntil(clients.openWindow(url))
})
