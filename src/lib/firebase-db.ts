// Lazy load Firebase Firestore only in browser context
let db: any = null
let doc: any = null
let getDoc: any = null
let setDoc: any = null
let updateDoc: any = null
let onSnapshot: any = null
let collection: any = null
let query: any = null
let getDocs: any = null
let where: any = null
let addDoc: any = null
let serverTimestamp: any = null
let orderBy: any = null
let limit: any = null
let deleteDoc: any = null

async function loadFirestore() {
  if (typeof window === 'undefined') return false
  
  try {
    const firebaseModule = await import('./firebase')
    const firestoreModule = await import('firebase/firestore')
    
    db = firebaseModule.db
    doc = firestoreModule.doc
    getDoc = firestoreModule.getDoc
    setDoc = firestoreModule.setDoc
    updateDoc = firestoreModule.updateDoc
    onSnapshot = firestoreModule.onSnapshot
    collection = firestoreModule.collection
    query = firestoreModule.query
    getDocs = firestoreModule.getDocs
    where = firestoreModule.where
    addDoc = firestoreModule.addDoc
    serverTimestamp = firestoreModule.serverTimestamp
    orderBy = firestoreModule.orderBy
    limit = firestoreModule.limit
    deleteDoc = firestoreModule.deleteDoc
    
    return true
  } catch (error) {
    console.error('Failed to load Firestore:', error)
    return false
  }
}

// Test Accounts Functions
export async function syncTestAccountToFirebase(data: { name: string; email: string; role: string; profilePicture?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    await loadFirestore()
    const q = query(collection(db, 'test_accounts'), where('email', '==', data.email))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      await addDoc(collection(db, 'test_accounts'), {
        ...data,
        created_at: serverTimestamp(),
      })
    } else {
      await updateDoc(querySnapshot.docs[0].ref, {
        ...data,
        updated_at: serverTimestamp(),
      })
    }
    
    return { success: true }
  } catch (error) {
    console.error('Failed to sync test account to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getTestAccountsFromFirebase(): Promise<{ success: boolean; data: Record<string, any>[]; error?: string }> {
  try {
    const q = query(collection(db, 'test_accounts'), orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get test accounts from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

// Real-time subscription to test accounts
export function subscribeToTestAccounts(callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, 'test_accounts'), orderBy('created_at', 'desc'))
  return onSnapshot(q, (snapshot: any) => {
    const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// Real Accounts Functions
export async function syncRealAccountToFirebase(data: { name: string; email: string; role: string; profilePicture?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const q = query(collection(db, 'real_accounts'), where('email', '==', data.email))
    const querySnapshot = await getDocs(q)
    
    if (querySnapshot.empty) {
      await addDoc(collection(db, 'real_accounts'), {
        ...data,
        created_at: serverTimestamp(),
      })
    } else {
      await updateDoc(querySnapshot.docs[0].ref, {
        ...data,
        updated_at: serverTimestamp(),
      })
    }
    
    return { success: true }
  } catch (error) {
    console.error('Failed to sync real account to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getRealAccountsFromFirebase(): Promise<{ success: boolean; data: Record<string, any>[]; error?: string }> {
  try {
    const q = query(collection(db, 'real_accounts'), orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get real accounts from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

// Real-time subscription to real accounts
export function subscribeToRealAccounts(callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, 'real_accounts'), orderBy('created_at', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// Registration Alerts Functions
export async function syncRegistrationAlertToFirebase(data: { type: string; name: string; email: string; tier?: string; message: string; is_test_account: boolean }): Promise<{ success: boolean; error?: string }> {
  try {
    await addDoc(collection(db, 'registration_alerts'), {
      ...data,
      is_read: false,
      created_at: serverTimestamp(),
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to sync registration alert to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getRegistrationAlertsFromFirebase(): Promise<{ success: boolean; data: Record<string, any>[]; error?: string }> {
  try {
    const q = query(collection(db, 'registration_alerts'), orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get registration alerts from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

// Real-time subscription to registration alerts
export function subscribeToRegistrationAlerts(callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, 'registration_alerts'), orderBy('created_at', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

export async function markAlertReadInFirebase(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const alertRef = doc(db, 'registration_alerts', id)
    await updateDoc(alertRef, { is_read: true })
    return { success: true }
  } catch (error) {
    console.error('Failed to mark alert as read in Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function clearAllAlertsInFirebase(): Promise<{ success: boolean; error?: string }> {
  try {
    const q = query(collection(db, 'registration_alerts'), where('is_read', '==', true))
    const querySnapshot = await getDocs(q)
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
    await Promise.all(deletePromises)
    
    return { success: true }
  } catch (error) {
    console.error('Failed to clear alerts in Firebase:', error)
    return { success: false, error: String(error) }
  }
}

// User Updates Collection for Realtime Dashboard (Option A)
export async function addUserUpdate(data: { userId: string; userEmail: string; action: string; details: Record<string, unknown> }): Promise<{ success: boolean; error?: string }> {
  try {
    await addDoc(collection(db, 'user_updates'), {
      ...data,
      created_at: serverTimestamp(),
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to add user update to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

// Real-time subscription to user updates (Option A - Realtime Dashboard)
export function subscribeToUserUpdates(callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, 'user_updates'), orderBy('created_at', 'desc'), limit(100))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// FCM Token Management for Push Notifications (Option B)
export async function saveFCMToken(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenRef = doc(db, 'fcm_tokens', token)
    await setDoc(tokenRef, {
      userId,
      token,
      created_at: serverTimestamp(),
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to save FCM token to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getFCMTokensForUser(userId: string): Promise<{ success: boolean; data: string[]; error?: string }> {
  try {
    const q = query(collection(db, 'fcm_tokens'), where('userId', '==', userId))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => doc.data().token as string)
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get FCM tokens for user from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

export async function removeFCMToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const tokenRef = doc(db, 'fcm_tokens', token)
    await deleteDoc(tokenRef)
    return { success: true }
  } catch (error) {
    console.error('Failed to remove FCM token from Firebase:', error)
    return { success: false, error: String(error) }
  }
}

// Admin-specific FCM tokens (for Option B - Push Alerts)
export async function getAdminFCMTokens(): Promise<{ success: boolean; data: string[]; error?: string }> {
  try {
    // Get all admin users
    const usersQuery = query(collection(db, 'users'), where('role', '==', 'admin'))
    const usersSnapshot = await getDocs(usersQuery)
    const adminIds = usersSnapshot.docs.map(doc => doc.id)
    
    // Get FCM tokens for admin users
    if (adminIds.length === 0) {
      return { success: true, data: [] }
    }
    
    const tokensQuery = query(collection(db, 'fcm_tokens'), where('userId', 'in', adminIds))
    const tokensSnapshot = await getDocs(tokensQuery)
    const data = tokensSnapshot.docs.map(doc => doc.data().token as string)
    
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get admin FCM tokens from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

// Notification Collection for tracking sent notifications (Option C - Hybrid)
export async function logNotification(data: { recipientId: string; type: string; title: string; body: string; data?: Record<string, unknown> }): Promise<{ success: boolean; error?: string }> {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...data,
      created_at: serverTimestamp(),
      read: false,
    })
    return { success: true }
  } catch (error) {
    console.error('Failed to log notification to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

// Real-time subscription to notifications (Option C - Hybrid)
export function subscribeToNotifications(userId: string, callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, 'notifications'), where('recipientId', '==', userId), orderBy('created_at', 'desc'), limit(50))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// Generic real-time subscription helper
export function subscribeToCollection(collectionName: string, constraints: any[], callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, collectionName), ...constraints)
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE TABLE SYNC FUNCTIONS
// These functions sync all Supabase tables to Firebase Firestore
// ═══════════════════════════════════════════════════════════════════════════════

// Users Table Sync
export async function syncUserToFirebase(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    await loadFirestore()
    const userRef = doc(db, 'users', data.id)
    await setDoc(userRef, {
      ...data,
      updated_at: serverTimestamp(),
    }, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('Failed to sync user to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getUsersFromFirebase(): Promise<{ success: boolean; data: Record<string, any>[]; error?: string }> {
  try {
    const q = query(collection(db, 'users'), orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get users from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

export function subscribeToUsers(callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, 'users'), orderBy('created_at', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// Agents Table Sync
export async function syncAgentToFirebase(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    await loadFirestore()
    const agentRef = doc(db, 'agents', data.id)
    await setDoc(agentRef, {
      ...data,
      updated_at: serverTimestamp(),
    }, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('Failed to sync agent to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getAgentsFromFirebase(): Promise<{ success: boolean; data: Record<string, any>[]; error?: string }> {
  try {
    const q = query(collection(db, 'agents'), orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get agents from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

export function subscribeToAgents(callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, 'agents'), orderBy('created_at', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// Customers Table Sync
export async function syncCustomerToFirebase(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    await loadFirestore()
    const customerRef = doc(db, 'customers', data.id)
    await setDoc(customerRef, {
      ...data,
      updated_at: serverTimestamp(),
    }, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('Failed to sync customer to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getCustomersFromFirebase(): Promise<{ success: boolean; data: Record<string, any>[]; error?: string }> {
  try {
    const q = query(collection(db, 'customers'), orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get customers from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

export function subscribeToCustomers(callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, 'customers'), orderBy('created_at', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// Transactions Table Sync
export async function syncTransactionToFirebase(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    await loadFirestore()
    const transactionRef = doc(db, 'transactions', data.id)
    await setDoc(transactionRef, {
      ...data,
      updated_at: serverTimestamp(),
    }, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('Failed to sync transaction to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getTransactionsFromFirebase(): Promise<{ success: boolean; data: Record<string, any>[]; error?: string }> {
  try {
    const q = query(collection(db, 'transactions'), orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get transactions from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

export function subscribeToTransactions(callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, 'transactions'), orderBy('created_at', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// Float Requests Table Sync
export async function syncFloatRequestToFirebase(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    await loadFirestore()
    const floatRequestRef = doc(db, 'float_requests', data.id)
    await setDoc(floatRequestRef, {
      ...data,
      updated_at: serverTimestamp(),
    }, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('Failed to sync float request to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getFloatRequestsFromFirebase(): Promise<{ success: boolean; data: Record<string, any>[]; error?: string }> {
  try {
    const q = query(collection(db, 'float_requests'), orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get float requests from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

export function subscribeToFloatRequests(callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, 'float_requests'), orderBy('created_at', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// Float Exchanges Table Sync
export async function syncFloatExchangeToFirebase(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    await loadFirestore()
    const floatExchangeRef = doc(db, 'float_exchanges', data.id)
    await setDoc(floatExchangeRef, {
      ...data,
      updated_at: serverTimestamp(),
    }, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('Failed to sync float exchange to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getFloatExchangesFromFirebase(): Promise<{ success: boolean; data: Record<string, any>[]; error?: string }> {
  try {
    const q = query(collection(db, 'float_exchanges'), orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get float exchanges from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

export function subscribeToFloatExchanges(callback: (data: Record<string, any>[]) => void): () => void {
  const q = query(collection(db, 'float_exchanges'), orderBy('created_at', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// Audit Log Table Sync
export async function syncAuditLogToFirebase(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    await loadFirestore()
    const auditLogRef = doc(db, 'audit_log', data.id)
    await setDoc(auditLogRef, {
      ...data,
    }, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('Failed to sync audit log to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getAuditLogsFromFirebase(): Promise<{ success: boolean; data: Record<string, any>[]; error?: string }> {
  try {
    const q = query(collection(db, 'audit_log'), orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get audit logs from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

// Password Reset Requests Table Sync
export async function syncPasswordResetRequestToFirebase(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    await loadFirestore()
    const resetRef = doc(db, 'password_reset_requests', data.id)
    await setDoc(resetRef, {
      ...data,
      updated_at: serverTimestamp(),
    }, { merge: true })
    return { success: true }
  } catch (error) {
    console.error('Failed to sync password reset request to Firebase:', error)
    return { success: false, error: String(error) }
  }
}

export async function getPasswordResetRequestsFromFirebase(): Promise<{ success: boolean; data: Record<string, any>[]; error?: string }> {
  try {
    const q = query(collection(db, 'password_reset_requests'), orderBy('requested_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get password reset requests from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK SYNC FUNCTIONS
// Sync all tables from Supabase to Firebase via Cloudflare Worker
// ═══════════════════════════════════════════════════════════════════════════════

export async function syncAllTablesToFirebase(): Promise<{ success: boolean; results?: any; error?: string }> {
  try {
    const syncServiceUrl = import.meta.env.VITE_SYNC_SERVICE_URL || 'https://theordertz-sync-service.workers.dev'
    const response = await fetch(`${syncServiceUrl}/sync/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!response.ok) {
      throw new Error(`Sync service responded: ${response.statusText}`)
    }
    
    const result = await response.json()
    return { success: true, results: result }
  } catch (error) {
    console.error('Failed to sync all tables:', error)
    return { success: false, error: String(error) }
  }
}

export async function syncTableToFirebase(tableName: string): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const syncServiceUrl = import.meta.env.VITE_SYNC_SERVICE_URL || 'https://theordertz-sync-service.workers.dev'
    const response = await fetch(`${syncServiceUrl}/sync/${tableName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    if (!response.ok) {
      throw new Error(`Sync service responded: ${response.statusText}`)
    }
    
    const result = await response.json()
    return { success: true, result: result }
  } catch (error) {
    console.error(`Failed to sync table ${tableName}:`, error)
    return { success: false, error: String(error) }
  }
}

export async function getSyncStatus(): Promise<{ success: boolean; status?: any; error?: string }> {
  try {
    const syncServiceUrl = import.meta.env.VITE_SYNC_SERVICE_URL || 'https://theordertz-sync-service.workers.dev'
    const response = await fetch(`${syncServiceUrl}/sync/status`)
    
    if (!response.ok) {
      throw new Error(`Sync service responded: ${response.statusText}`)
    }
    
    const status = await response.json()
    return { success: true, status }
  } catch (error) {
    console.error('Failed to get sync status:', error)
    return { success: false, error: String(error) }
  }
}
