// Firebase Authentication functions
// Lazy load Firebase modules only in browser context
let auth: any = null
let db: any = null
let signInWithEmailAndPassword: any = null
let createUserWithEmailAndPassword: any = null
let signOut: any = null
let onAuthStateChanged: any = null
let sendPasswordResetEmail: any = null
let updateProfile: any = null
let doc: any = null
let setDoc: any = null
let getDoc: any = null
let getDocs: any = null
let addDoc: any = null
let serverTimestamp: any = null
let collection: any = null
let query: any = null
let where: any = null
let updateDoc: any = null
let FirebaseUser: any = null

async function loadFirebaseModules() {
  if (typeof window === 'undefined') return false
  
  try {
    const authModule = await import('firebase/auth')
    const firebaseModule = await import('./firebase')
    const firestoreModule = await import('firebase/firestore')
    
    auth = firebaseModule.auth
    db = firebaseModule.db
    FirebaseUser = authModule.User
    signInWithEmailAndPassword = authModule.signInWithEmailAndPassword
    createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword
    signOut = authModule.signOut
    onAuthStateChanged = authModule.onAuthStateChanged
    sendPasswordResetEmail = authModule.sendPasswordResetEmail
    updateProfile = authModule.updateProfile
    doc = firestoreModule.doc
    setDoc = firestoreModule.setDoc
    getDoc = firestoreModule.getDoc
    getDocs = firestoreModule.getDocs
    addDoc = firestoreModule.addDoc
    serverTimestamp = firestoreModule.serverTimestamp
    collection = firestoreModule.collection
    query = firestoreModule.query
    where = firestoreModule.where
    updateDoc = firestoreModule.updateDoc
    
    return true
  } catch (error) {
    console.error('Failed to load Firebase modules:', error)
    return false
  }
}

export type User = {
  id: string
  email: string
  name?: string
  role?: 'super_agent' | 'admin' | 'agent' | 'customer'
  app_metadata?: { roles?: string[]; isTestAccount?: boolean }
  user_metadata?: { full_name?: string; profilePicture?: string }
}

// Helper functions for backward compatibility
export function isTestUser(user?: User | null): boolean {
  return !!user?.app_metadata?.isTestAccount
}

export function getCurrentUserRole(user?: User | null): string {
  return user?.app_metadata?.roles?.[0] ?? 'guest'
}

// Password reset requests (now stored in Firestore)
export type PasswordResetRequest = {
  id: string
  email: string
  new_password_hash: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  processed_at?: string
  processed_by?: string
}

export async function requestPasswordReset(email: string, newPassword: string): Promise<PasswordResetRequest> {
  const passwordHash = newPassword // TODO: Implement proper hashing
  
  const docRef = await addDoc(collection(db, 'password_reset_requests'), {
    email,
    new_password_hash: passwordHash,
    status: 'pending',
    requested_at: serverTimestamp(),
  })
  
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) throw new Error('Failed to create password reset request')
  
  return {
    id: docSnap.id,
    ...docSnap.data(),
    requested_at: docSnap.data().requested_at?.toISOString() || new Date().toISOString(),
  } as PasswordResetRequest
}

export async function listPendingPasswordResets(): Promise<PasswordResetRequest[]> {
  const q = query(
    collection(db, 'password_reset_requests'),
    where('status', '==', 'pending')
  )
  const querySnapshot = await getDocs(q)
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    requested_at: doc.data().requested_at?.toISOString() || new Date().toISOString(),
  })) as PasswordResetRequest[]
}

export async function approvePasswordReset(requestId: string): Promise<boolean> {
  const requestRef = doc(db, 'password_reset_requests', requestId)
  const requestSnap = await getDoc(requestRef)
  
  if (!requestSnap.exists()) return false
  
  const requestData = requestSnap.data()
  
  // Update user password in users collection
  const usersQuery = query(collection(db, 'users'), where('email', '==', requestData.email))
  const usersSnapshot = await getDocs(usersQuery)
  
  if (!usersSnapshot.empty) {
    const userDoc = usersSnapshot.docs[0]
    await updateDoc(userDoc.ref, { password_hash: requestData.new_password_hash })
  }
  
  // Mark request as approved
  await updateDoc(requestRef, {
    status: 'approved',
    processed_at: serverTimestamp(),
  })
  
  return true
}

export async function rejectPasswordReset(requestId: string): Promise<boolean> {
  const requestRef = doc(db, 'password_reset_requests', requestId)
  await updateDoc(requestRef, {
    status: 'rejected',
    processed_at: serverTimestamp(),
  })
  
  return true
}

// Registration management (now uses Firestore)
export type PendingRegistration = { 
  email: string
  role: 'agent' | 'customer'
  name?: string
  is_test_account?: boolean
}

export async function requestRegistration(
  email: string, 
  role: 'agent' | 'customer', 
  meta?: Record<string, unknown>
): Promise<void> {
  // Check if user already exists
  const usersQuery = query(collection(db, 'users'), where('email', '==', email))
  const usersSnapshot = await getDocs(usersQuery)
  
  if (!usersSnapshot.empty) return
  
  // Create registration alert for admin
  await addDoc(collection(db, 'registration_alerts'), {
    alert_type: role,
    name: meta?.name as string || email,
    email,
    customer_tier: role === 'customer' ? 'd2d' : null,
    message: `New ${role} registration request from ${email}`,
    is_test_account: !!meta?.isTestAccount,
    is_read: false,
    created_at: serverTimestamp(),
  })
}

export async function listPendingRegistrations(): Promise<PendingRegistration[]> {
  const q = query(
    collection(db, 'registration_alerts'),
    where('is_read', '==', false)
  )
  const querySnapshot = await getDocs(q)
  
  return querySnapshot.docs.map(doc => ({
    email: doc.data().email,
    role: doc.data().alert_type as 'agent' | 'customer',
    name: doc.data().name,
    is_test_account: doc.data().is_test_account,
  })) as PendingRegistration[]
}

export async function approveRegistration(email: string): Promise<User | null> {
  const q = query(
    collection(db, 'registration_alerts'),
    where('email', '==', email),
    where('is_read', '==', false)
  )
  const querySnapshot = await getDocs(q)
  
  if (querySnapshot.empty) return null
  
  const alertDoc = querySnapshot.docs[0]
  const alertData = alertDoc.data()
  
  // Create user in users collection
  const tempPassword = 'Temp123!' // TODO: Send password reset email instead
  const userRef = await addDoc(collection(db, 'users'), {
    email,
    password_hash: tempPassword,
    full_name: alertData.name || email,
    role: alertData.alert_type,
    is_test_account: alertData.is_test_account,
    is_active: true,
    created_at: serverTimestamp(),
  })
  
  const userSnap = await getDoc(userRef)
  
  // Mark alert as read
  await updateDoc(alertDoc.ref, { is_read: true })
  
  if (!userSnap.exists()) return null
  
  return {
    id: userSnap.id,
    email: userSnap.data().email,
    name: userSnap.data().full_name,
    app_metadata: {
      roles: [userSnap.data().role],
      isTestAccount: userSnap.data().is_test_account,
    },
  }
}

// Sync Firebase Auth user to custom users collection
async function syncUserToCustomTable(authUser: FirebaseUser): Promise<void> {
  const userRef = doc(db, 'users', authUser.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    // User exists, update Firebase user profile if needed
    const userData = userSnap.data()
    if (!authUser.displayName && userData.full_name) {
      await updateProfile(authUser, { displayName: userData.full_name })
    }
    return
  }

  // Create user in custom collection
  await setDoc(userRef, {
    id: authUser.uid,
    email: authUser.email,
    password_hash: '',
    full_name: authUser.displayName || authUser.email || '',
    role: 'customer',
    is_test_account: false,
    is_active: true,
    created_at: serverTimestamp(),
  })
}

export async function login(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  if (!user) throw new Error('Login failed')

  // Fetch role from custom users collection
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  let role = 'customer'
  let isTestAccount = false

  // Determine the correct role based on email
  const getRoleForEmail = (email: string): string => {
    if (email === 'rkaijage@gmail.com' || email === 'admin@example.com') return 'admin'
    if (email.includes('agent')) return 'agent'
    if (email.includes('admin')) return 'admin'
    return 'customer'
  }

  const correctRole = getRoleForEmail(email)
  const correctIsTestAccount = email.includes('test') || email.includes('example.com')

  if (userSnap.exists()) {
    const userData = userSnap.data()
    role = userData.role || 'customer'
    isTestAccount = userData.is_test_account || false

    // Check if role is wrong and fix it
    if (role !== correctRole || isTestAccount !== correctIsTestAccount) {
      await updateDoc(userRef, { 
        role: correctRole,
        is_test_account: correctIsTestAccount
      })
      role = correctRole
      isTestAccount = correctIsTestAccount
    }
  } else {
    // User doesn't exist in custom collection, create them
    await setDoc(userRef, {
      id: user.uid,
      email: user.email,
      password_hash: '',
      full_name: user.displayName || user.email || '',
      role: correctRole,
      is_test_account: correctIsTestAccount,
      is_active: true,
      created_at: serverTimestamp(),
    })
    role = correctRole
    isTestAccount = correctIsTestAccount
  }

  return {
    id: user.uid,
    email: user.email ?? '',
    name: user.displayName ?? '',
    app_metadata: {
      roles: [role],
      isTestAccount,
    },
  }
}

export async function signup(email: string, password: string, meta: Record<string, unknown>): Promise<User> {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth is not available in server context')
  }
  
  if (!auth) {
    await loadFirebaseModules()
  }
  
  if (!auth || !createUserWithEmailAndPassword || !updateProfile) {
    throw new Error('Firebase Auth modules not loaded')
  }
  
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  if (!user) throw new Error('Signup failed')

  // Update profile
  if (meta.full_name) {
    await updateProfile(user, { displayName: meta.full_name as string })
  }

  // Create user in custom collection with is_active: false (pending approval)
  await setDoc(doc(db, 'users', user.uid), {
    id: user.uid,
    email: user.email,
    password_hash: '',
    full_name: meta.full_name || user.email || '',
    role: meta.role as string || 'customer',
    is_test_account: meta.isTestAccount || false,
    is_active: false, // Require admin approval before login
    created_at: serverTimestamp(),
  })

  return {
    id: user.uid,
    email: user.email || '',
    name: user.displayName || meta.full_name as string,
    app_metadata: {
      roles: [meta.role as string || 'customer'],
      isTestAccount: meta.isTestAccount as boolean || false,
    },
  }
}

export async function logout(): Promise<void> {
  await signOut(auth)
}

export async function getCurrentUser(): Promise<User | null> {
  const user = auth.currentUser

  if (!user) return null

  // Fetch additional data from custom collection
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  let role = 'customer'
  let isTestAccount = false

  if (userSnap.exists()) {
    const userData = userSnap.data()
    role = userData.role || 'customer'
    isTestAccount = userData.is_test_account || false
  }

  return {
    id: user.uid,
    email: user.email || '',
    name: user.displayName,
    app_metadata: {
      roles: [role],
      isTestAccount,
    },
  }
}

export async function seedLiveData(): Promise<void> {
  const pending = await listPendingRegistrations()
  const seedPending: Array<{ email: string; role: 'agent' | 'customer'; name?: string }> = [
    { email: 'live-agent1@example.com', role: 'agent', name: 'Live Agent One' },
    { email: 'live-customer1@example.com', role: 'customer', name: 'Live Customer One' },
  ]
  for (const s of seedPending) {
    const exists = pending.find(p => p.email === s.email)
    if (!exists) await requestRegistration(s.email, s.role, { name: s.name })
  }
  
  // Check and create admin
  const adminQuery = query(collection(db, 'users'), where('email', '==', 'live-admin@example.com'))
  const adminSnap = await getDocs(adminQuery)
  if (adminSnap.empty) {
    await addDoc(collection(db, 'users'), {
      email: 'live-admin@example.com',
      password_hash: 'LivePwd!',
      full_name: 'Live Admin',
      role: 'admin',
      is_test_account: false,
      is_active: true,
      created_at: serverTimestamp(),
    })
  }
  
  // Check and create agent
  const agentQuery = query(collection(db, 'users'), where('email', '==', 'live-agent1@example.com'))
  const agentSnap = await getDocs(agentQuery)
  if (agentSnap.empty) {
    await addDoc(collection(db, 'users'), {
      email: 'live-agent1@example.com',
      password_hash: 'LivePwd!',
      full_name: 'Live Agent One',
      role: 'agent',
      is_test_account: false,
      is_active: true,
      created_at: serverTimestamp(),
    })
  }
  
  // Check and create customer
  const customerQuery = query(collection(db, 'users'), where('email', '==', 'live-customer1@example.com'))
  const customerSnap = await getDocs(customerQuery)
  if (customerSnap.empty) {
    await addDoc(collection(db, 'users'), {
      email: 'live-customer1@example.com',
      password_hash: 'LivePwd!',
      full_name: 'Live Customer One',
      role: 'customer',
      is_test_account: false,
      is_active: true,
      created_at: serverTimestamp(),
    })
  }
}

export async function seedProductionLiveData(): Promise<void> {
  await seedLiveData()
  const additionalPending: Array<{ email: string; role: 'agent' | 'customer'; name?: string }> = [
    { email: 'live-agent2@example.com', role: 'agent', name: 'Live Agent Two' },
    { email: 'live-agent3@example.com', role: 'agent', name: 'Live Agent Three' },
    { email: 'live-customer2@example.com', role: 'customer', name: 'Live Customer Two' },
  ]
  const pending = await listPendingRegistrations()
  for (const a of additionalPending) {
    const exists = pending.find(p => p.email === a.email)
    if (!exists) await requestRegistration(a.email, a.role, { name: a.name })
  }
}

export function getRegisteredAccountsCount(): number {
  // TODO: Implement this function using Firestore
  return 0
}

// Function to check and sync data across Firestore collections
export async function checkAndSyncData() {
  console.log('=== Checking Firestore Collections ===\n')

  const results: Record<string, any> = {}

  // Check users collection
  const usersQuery = query(collection(db, 'users'))
  const usersSnapshot = await getDocs(usersQuery)
  const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  
  console.log('--- USERS COLLECTION ---')
  console.log(`Total users: ${users.length}`)
  users.forEach((u: any) => {
    console.log(`  - ${u.email} | Role: ${u.role} | Test: ${u.is_test_account} | Active: ${u.is_active}`)
  })
  results.users = users

  // Check agents collection
  const agentsQuery = query(collection(db, 'agents'))
  const agentsSnapshot = await getDocs(agentsQuery)
  const agents = agentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  
  console.log('\n--- AGENTS COLLECTION ---')
  console.log(`Total agents: ${agents.length}`)
  agents.forEach((a: any) => {
    console.log(`  - ${a.business_name || 'N/A'} | Status: ${a.status} | Float: ${a.float_balance} | Commission: ${a.commission_earned}`)
  })
  results.agents = agents

  // Check customers collection
  const customersQuery = query(collection(db, 'customers'))
  const customersSnapshot = await getDocs(customersQuery)
  const customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  
  console.log('\n--- CUSTOMERS COLLECTION ---')
  console.log(`Total customers: ${customers.length}`)
  customers.forEach((c: any) => {
    console.log(`  - ID: ${c.id} | Tier: ${c.tier} | Status: ${c.status} | Wallet: ${c.wallet_balance} | Credit: ${c.credit_used}/${c.credit_limit}`)
  })
  results.customers = customers

  // Check transactions collection
  const transactionsQuery = query(collection(db, 'transactions'))
  const transactionsSnapshot = await getDocs(transactionsQuery)
  const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, 10)
  
  console.log('\n--- TRANSACTIONS COLLECTION ---')
  console.log(`Total transactions: ${transactionsSnapshot.size} (showing last 10)`)
  transactions.forEach((t: any) => {
    console.log(`  - ID: ${t.id} | Service: ${t.service_type} | Amount: ${t.amount} | Status: ${t.status} | Date: ${t.created_at}`)
  })
  results.transactions = transactions

  // Check for orphaned records and sync them
  console.log('\n--- SYNCING ORPHANED RECORDS ---')
  
  const agentUsers = users.filter((u: any) => u.role === 'agent')
  const customerUsers = users.filter((u: any) => u.role === 'customer')
  
  let syncedAgents = 0
  let syncedCustomers = 0

  for (const agentUser of agentUsers) {
    const agentRef = doc(db, 'agents', agentUser.id)
    const agentSnap = await getDoc(agentRef)
    
    if (!agentSnap.exists()) {
      console.log(`  Creating agent record for ${agentUser.email}`)
      await setDoc(agentRef, {
        id: agentUser.id,
        business_name: agentUser.full_name || agentUser.email,
        status: 'approved',
        float_balance: 0,
        commission_rate: 2.50,
        commission_earned: 0,
        created_at: serverTimestamp(),
      })
      syncedAgents++
    }
  }

  for (const customerUser of customerUsers) {
    const customerRef = doc(db, 'customers', customerUser.id)
    const customerSnap = await getDoc(customerRef)
    
    if (!customerSnap.exists()) {
      console.log(`  Creating customer record for ${customerUser.email}`)
      await setDoc(customerRef, {
        id: customerUser.id,
        tier: 'd2d',
        status: 'approved',
        wallet_balance: 0,
        credit_limit: 0,
        credit_used: 0,
        created_at: serverTimestamp(),
      })
      syncedCustomers++
    }
  }

  console.log(`\nSynced ${syncedAgents} agent records`)
  console.log(`Synced ${syncedCustomers} customer records`)

  console.log('\n=== END OF CHECK ===')
  
  return {
    results,
    synced: { agents: syncedAgents, customers: syncedCustomers }
  }
}

// Activate user in Firebase (called by admin approval)
export async function activateUserInFirebase(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId)
    await updateDoc(userRef, { is_active: true })
    return true
  } catch (error) {
    console.error('Failed to activate user:', error)
    return false
  }
}

// Auth state change listener
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const user = await getCurrentUser()
      callback(user)
    } else {
      callback(null)
    }
  })
}
