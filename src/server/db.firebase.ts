import { createServerFn } from '@tanstack/react-start'

// Lazy load Firebase DB functions only in browser context
let firebaseDb: any = null

async function getFirebaseDb() {
  if (typeof window === 'undefined') {
    // Server-side: return empty implementation
    return {
      syncTestAccountToFirebase: async () => ({ success: false, error: 'Server context' }),
      getTestAccountsFromFirebase: async () => [],
      syncRealAccountToFirebase: async () => ({ success: false, error: 'Server context' }),
      getRealAccountsFromFirebase: async () => [],
      syncRegistrationAlertToFirebase: async () => ({ success: false, error: 'Server context' }),
      getRegistrationAlertsFromFirebase: async () => [],
      markAlertReadInFirebase: async () => ({ success: false, error: 'Server context' }),
      clearAllAlertsInFirebase: async () => ({ success: false, error: 'Server context' })
    }
  }
  
  if (!firebaseDb) {
    firebaseDb = await import('@/lib/firebase-db')
  }
  
  return firebaseDb
}

// Test Accounts Functions
export const syncTestAccount = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; email: string; role: string; profilePicture?: string }) => data)
  .handler(async ({ data }) => {
    const firebaseDb = await getFirebaseDb()
    const result = await firebaseDb.syncTestAccountToFirebase(data)
    return result
  })

export const getTestAccounts = createServerFn({ method: 'GET' })
  .handler(async () => {
    const firebaseDb = await getFirebaseDb()
    const result = await firebaseDb.getTestAccountsFromFirebase()
    return result
  })

// Real Accounts Functions
export const syncRealAccount = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; email: string; role: string; profilePicture?: string }) => data)
  .handler(async ({ data }) => {
    const firebaseDb = await getFirebaseDb()
    const result = await firebaseDb.syncRealAccountToFirebase(data)
    return result
  })

export const getRealAccounts = createServerFn({ method: 'GET' })
  .handler(async () => {
    const firebaseDb = await getFirebaseDb()
    const result = await firebaseDb.getRealAccountsFromFirebase()
    return result
  })

// Registration Alerts Functions
export const syncRegistrationAlert = createServerFn({ method: 'POST' })
  .inputValidator((data: { type: string; name: string; email: string; tier?: string; message: string; is_test_account: boolean }) => data)
  .handler(async ({ data }) => {
    const firebaseDb = await getFirebaseDb()
    const result = await firebaseDb.syncRegistrationAlertToFirebase(data)
    return result
  })

export const getRegistrationAlerts = createServerFn({ method: 'GET' })
  .handler(async () => {
    const firebaseDb = await getFirebaseDb()
    const result = await firebaseDb.getRegistrationAlertsFromFirebase()
    return result
  })

export const markAlertRead = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const firebaseDb = await getFirebaseDb()
    const result = await firebaseDb.markAlertReadInFirebase(data.id)
    return result
  })

export const clearAllAlerts = createServerFn({ method: 'POST' })
  .handler(async () => {
    const firebaseDb = await getFirebaseDb()
    const result = await firebaseDb.clearAllAlertsInFirebase()
    return result
  })
