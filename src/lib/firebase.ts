// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDUvBxKrKbNvvzj3fy55wXKh8hiV9P1Ifg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'the-ordertz.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'the-ordertz',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'the-ordertz.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '560732997727',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:560732997727:web:bed58f306c49ff6299b3ea',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-381TZ0T2H1',
}

// Only initialize Firebase in browser context
let app: any = null
let auth: any = null
let db: any = null
let messaging: any = null

async function initializeFirebase() {
  if (typeof window === 'undefined') return false

  try {
    // Firebase v12 uses ES modules
    const { initializeApp, getApps } = await import('firebase/app')
    const { getFirestore } = await import('firebase/firestore')
    const { getMessaging } = await import('firebase/messaging')

    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    db = getFirestore(app)

    // Messaging only works in browser with service worker
    try {
      messaging = getMessaging(app)
    } catch (e) {
      console.warn('Firebase Messaging not available:', e)
    }

    // Note: Firebase Auth is NOT initialized since we use Supabase for authentication
    // Only initialize Firebase Auth if explicitly needed for specific features
    return true
  } catch (error) {
    console.error('Firebase initialization error:', error)
    return false
  }
}

// Initialize Firebase when module loads (without Auth)
if (typeof window !== 'undefined') {
  initializeFirebase()
}

export { app, auth, db, messaging, initializeFirebase }
