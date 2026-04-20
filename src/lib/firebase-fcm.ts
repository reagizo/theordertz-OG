// Firebase Cloud Messaging (FCM) for push notifications
// Lazy load Firebase messaging only in browser context
let messaging: any = null
let getToken: any = null
let onMessage: any = null
let deleteToken: any = null

async function loadMessaging() {
  if (typeof window === 'undefined') return false
  
  try {
    const firebaseModule = await import('./firebase')
    const messagingModule = await import('firebase/messaging')
    
    messaging = firebaseModule.messaging
    getToken = messagingModule.getToken
    onMessage = messagingModule.onMessage
    deleteToken = messagingModule.deleteToken
    
    return true
  } catch (error) {
    console.error('Failed to load Firebase messaging:', error)
    return false
  }
}

// Lazy load firebase-db functions
async function loadFirebaseDb() {
  if (typeof window === 'undefined') {
    // Server-side: return empty implementation
    return {
      saveFCMToken: async () => {},
      removeFCMToken: async () => {},
      getAdminFCMTokens: async () => [],
      logNotification: async () => {}
    }
  }
  
  const firebaseDb = await import('./firebase-db')
  return firebaseDb
}

// VAPID key for web push notifications - replace with your actual VAPID key
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

// Request notification permission and get FCM token
export async function requestNotificationPermission(userId: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    if (!('Notification' in window)) {
      return { success: false, error: 'This browser does not support notifications' }
    }

    const permission = await Notification.requestPermission()
    
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission denied' }
    }

    await loadMessaging()
    if (!messaging || !getToken) {
      return { success: false, error: 'Firebase messaging not initialized' }
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    if (!token) {
      return { success: false, error: 'Failed to get FCM token' }
    }

    // Save token to Firebase
    const firebaseDb = await loadFirebaseDb()
    await firebaseDb.saveFCMToken(userId, token)

    return { success: true, token }
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return { success: false, error: `${error}` }
  }
}

// Get current FCM token (without requesting permission)
export async function getCurrentToken(): Promise<string | null> {
  try {
    await loadMessaging()
    if (!messaging || !getToken) {
      return null
    }

    const token = await getToken(messaging, { vapidKey: VAPID_KEY })
    return token
  } catch (error) {
    console.error('Error getting current FCM token:', error)
    return null
  }
}

// Remove FCM token
export async function unregisterFCM(): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getCurrentToken()
    if (token) {
      const firebaseDb = await loadFirebaseDb()
      await firebaseDb.removeFCMToken(token)
      await deleteToken(messaging)
    }
    return { success: true }
  } catch (error) {
    console.error('Error unregistering FCM:', error)
    return { success: false, error: String(error) }
  }
}

// Listen for incoming FCM messages when app is in foreground
export function onForegroundMessage(callback: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void): () => void {
  return onMessage(messaging, (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => {
    console.log('Received foreground message:', payload)
    callback(payload)
  })
}

// Send push notification to admin users (Option B - Push Alerts)
export async function sendPushNotificationToAdmins(title: string, body: string, data?: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    // Get admin FCM tokens
      return { success: false, error: 'No admin FCM tokens found' }
    }

    // Log the notification
    await logNotification({
      recipientId: 'admins',
      type: data.type,
      message: data.message,
      payload: data.payload,
    })

    return { success: true }
  } catch (error) {
    console.error('Error sending push notification to admins:', error)
    return { success: false, error: `${error}` }
  }
}

// Check notification permission status
export function getNotificationPermission(): NotificationPermission {
  if ('Notification' in window) {
    return Notification.permission
  }
  return 'denied'
}

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}
