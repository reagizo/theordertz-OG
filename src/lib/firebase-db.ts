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
let DocumentData: any = null
let Query: any = null

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
    DocumentData = firestoreModule.DocumentData
    Query = firestoreModule.Query
    
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

export async function getTestAccountsFromFirebase(): Promise<{ success: boolean; data: DocumentData[]; error?: string }> {
  try {
    const q = query(collection(db, 'test_accounts'), orderBy('created_at', 'desc'))
    const querySnapshot = await getDocs(q)
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return { success: true, data }
  } catch (error) {
    console.error('Failed to get test accounts from Firebase:', error)
    return { success: false, error: String(error), data: [] }
  }
}

// Real-time subscription to test accounts
export function subscribeToTestAccounts(callback: (data: DocumentData[]) => void): () => void {
  const q = query(collection(db, 'test_accounts'), orderBy('created_at', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
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

export async function getRealAccountsFromFirebase(): Promise<{ success: boolean; data: DocumentData[]; error?: string }> {
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
export function subscribeToRealAccounts(callback: (data: DocumentData[]) => void): () => void {
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

export async function getRegistrationAlertsFromFirebase(): Promise<{ success: boolean; data: DocumentData[]; error?: string }> {
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
export function subscribeToRegistrationAlerts(callback: (data: DocumentData[]) => void): () => void {
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
export function subscribeToUserUpdates(callback: (data: DocumentData[]) => void): () => void {
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
export function subscribeToNotifications(userId: string, callback: (data: DocumentData[]) => void): () => void {
  const q = query(collection(db, 'notifications'), where('recipientId', '==', userId), orderBy('created_at', 'desc'), limit(50))
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}

// Generic real-time subscription helper
export function subscribeToCollection(collectionName: string, constraints: any[], callback: (data: DocumentData[]) => void): () => void {
  const q = query(collection(db, collectionName), ...constraints)
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    callback(data)
  })
}
