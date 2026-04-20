// Firebase Cloud Messaging Service Worker
// This file handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js')

// Initialize Firebase in the service worker
const firebaseConfig = {
  apiKey: 'AIzaSyDUvBxKrKbNvvzj3fy55wXKh8hiV9P1Ifg',
  authDomain: 'the-ordertz.firebaseapp.com',
  projectId: 'the-ordertz',
  storageBucket: 'the-ordertz.firebasestorage.app',
  messagingSenderId: '560732997727',
  appId: '1:560732997727:web:bed58f306c49ff6299b3ea',
  measurementId: 'G-381TZ0T2H1',
}

firebase.initializeApp(firebaseConfig)

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging()

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload)

  const notificationTitle = payload.notification?.title || 'New Notification'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data,
  }

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event)

  event.notification.close()

  // Navigate to the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})
