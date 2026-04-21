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

if (typeof window !== 'undefined') {
  import('firebase/app').then(({ initializeApp, getApps }) => {
    import('firebase/auth').then(({ getAuth }) => {
      import('firebase/firestore').then(({ getFirestore }) => {
        import('firebase/messaging').then(({ getMessaging }) => {
          app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
          auth = getAuth(app)
          db = getFirestore(app)
          messaging = getMessaging(app)
        }).catch(console.error)
      }).catch(console.error)
    }).catch(console.error)
  }).catch(console.error)
}

export { app, auth, db, messaging }
