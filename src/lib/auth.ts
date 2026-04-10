// Simple local authentication fallback (no Netlify). Stores user state in localStorage.
export type User = {
  id: string
  email: string
  name?: string
  role?: 'super_agent' | 'admin' | 'agent' | 'customer'
  app_metadata?: { roles?: string[]; isTestAccount?: boolean }
  user_metadata?: { full_name?: string; profilePicture?: string }
}

const MOCK_USERS: Array<{ email: string; password: string; role: string; name?: string; isTestAccount?: boolean }> = []

// Test accounts — unlimited usage, isolated demo data, no real audit trail pollution
const TEST_ACCOUNTS: Array<{ email: string; password: string; role: string; name?: string }> = [
  { email: 'rkaijage@gmail.com', password: '@Eva0191!', role: 'admin', name: 'REAGAN ROBERT KAIJAGE' },
  { email: 'admin@example.com', password: 'admin', role: 'admin', name: 'Owner - Administrator' },
]

// Password reset requests storage
const PASSWORD_RESET_KEY = 'mock.password.reset.requests'

export type PasswordResetRequest = {
  id: string
  email: string
  newPassword: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  processedAt?: string
  processedBy?: string
}

function loadPasswordResetRequests(): PasswordResetRequest[] {
  const ls = getLocalStorage()
  if (!ls) return []
  try {
    const raw = ls.getItem(PASSWORD_RESET_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PasswordResetRequest[]
  } catch {
    return []
  }
}

function savePasswordResetRequests(list: PasswordResetRequest[]) {
  const ls = getLocalStorage()
  if (ls) ls.setItem(PASSWORD_RESET_KEY, JSON.stringify(list))
}

export function requestPasswordReset(email: string, newPassword: string): PasswordResetRequest {
  const ls = getLocalStorage()
  const requests = loadPasswordResetRequests()
  const existing = requests.find(r => r.email === email && r.status === 'pending')
  if (existing) return existing
  
  const request: PasswordResetRequest = {
    id: crypto.randomUUID(),
    email,
    newPassword,
    status: 'pending',
    requestedAt: new Date().toISOString(),
  }
  requests.push(request)
  savePasswordResetRequests(requests)
  return request
}

export function listPendingPasswordResets(): PasswordResetRequest[] {
  return loadPasswordResetRequests().filter(r => r.status === 'pending')
}

export function approvePasswordReset(requestId: string): boolean {
  const requests = loadPasswordResetRequests()
  const request = requests.find(r => r.id === requestId)
  if (!request || request.status !== 'pending') return false
  
  // Update the user's password in MOCK_USERS
  const user = MOCK_USERS.find(u => u.email === request.email)
  if (user) {
    user.password = request.newPassword
  } else {
    // Check test accounts
    const testUser = TEST_ACCOUNTS.find(u => u.email === request.email)
    if (testUser) {
      testUser.password = request.newPassword
    }
  }
  
  request.status = 'approved'
  request.processedAt = new Date().toISOString()
  savePasswordResetRequests(requests)
  return true
}

export function rejectPasswordReset(requestId: string): boolean {
  const requests = loadPasswordResetRequests()
  const request = requests.find(r => r.id === requestId)
  if (!request || request.status !== 'pending') return false
  
  request.status = 'rejected'
  request.processedAt = new Date().toISOString()
  savePasswordResetRequests(requests)
  return true
}

// Helper to safely access localStorage only in the browser
const getLocalStorage = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export async function login(email: string, password: string): Promise<User> {
  const found = MOCK_USERS.find(u => u.email === email && u.password === password)
  const testFound = TEST_ACCOUNTS.find(u => u.email === email && u.password === password)

  if (!found && !testFound) {
    const err: any = new Error('Invalid email or password.')
    err.status = 401
    throw err
  }

  const source = found || testFound!
  const isTest = !!testFound

  const user: User = {
    id: (isTest ? 'test-' : 'mock-') + email,
    email,
    name: source.name,
    app_metadata: { roles: [source.role], isTestAccount: isTest },
  }
  
  const ls = getLocalStorage()
  if (ls) ls.setItem('mock.user', JSON.stringify(user))
  
  return user
}

// --- Pending registrations (admin approval) ---
export type PendingRegistration = { email: string; role: 'agent' | 'customer'; name?: string; isTestAccount?: boolean }
const PENDING_KEY = 'mock.pending.registrations'

function loadPending(): PendingRegistration[] {
  const ls = getLocalStorage()
  if (!ls) return []
  try {
    const raw = ls.getItem(PENDING_KEY)
    if (!raw) return []
    return JSON.parse(raw) as PendingRegistration[]
  } catch {
    return []
  }
}

function savePending(list: PendingRegistration[]) {
  const ls = getLocalStorage()
  if (ls) ls.setItem(PENDING_KEY, JSON.stringify(list))
}

export async function requestRegistration(email: string, role: 'agent' | 'customer', meta?: Record<string, unknown>): Promise<void> {
  const pending = loadPending()
  if (pending.find(p => p.email === email)) return
  pending.push({ email, role, name: meta?.name as string | undefined, isTestAccount: meta?.isTestAccount as boolean | undefined })
  savePending(pending)
}

export async function listPendingRegistrations(): Promise<PendingRegistration[]> {
  return loadPending()
}

export async function approveRegistration(email: string): Promise<User | null> {
  const pending = loadPending()
  const foundIndex = pending.findIndex(p => p.email === email)
  if (foundIndex === -1) return null
  const p = pending[foundIndex]
  const isTest = !!p.isTestAccount
  const newUser: User = {
    id: (isTest ? 'test-' : 'mock-') + email,
    email,
    name: p.name,
    app_metadata: { roles: [p.role], isTestAccount: isTest },
  }
  MOCK_USERS.push({ email: email, password: 'Temp123!', role: p.role, name: p.name, isTestAccount: isTest })
  pending.splice(foundIndex, 1)
  savePending(pending)
  const ls = getLocalStorage()
  if (ls) ls.setItem('mock.user', JSON.stringify(newUser))
  return newUser
}

export async function signup(email: string, _password: string, meta: Record<string, unknown>): Promise<User> {
  const isTest = !!meta?.isTestAccount
  const user: User = {
    id: (isTest ? 'test-' : 'mock-') + email,
    email,
    name: meta?.full_name as string | undefined,
    app_metadata: { roles: ['customer'], isTestAccount: isTest },
    user_metadata: { full_name: meta?.full_name as string | undefined },
  }
  const ls = getLocalStorage()
  if (ls) ls.setItem('mock.user', JSON.stringify(user))
  return user
}

export function getCurrentUser(): User | null {
  const ls = getLocalStorage()
  if (!ls) return null
  const raw = ls.getItem('mock.user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setCurrentUser(u: User): void {
  const ls = getLocalStorage()
  if (ls) ls.setItem('mock.user', JSON.stringify(u))
}

export function logout(): void {
  const ls = getLocalStorage()
  if (ls) ls.removeItem('mock.user')
}

export function isTestUser(user?: User | null): boolean {
  return !!user?.app_metadata?.isTestAccount
}

export function getTestAccounts() {
  return TEST_ACCOUNTS.map(a => ({ ...a, isTestAccount: true }))
}

// Seed live data (live onboarding flow) for testing without demo seeds
export async function seedLiveData(): Promise<void> {
  const pending = loadPending()
  const seedPending: Array<{ email: string; role: 'agent' | 'customer'; name?: string }> = [
    { email: 'live-agent1@example.com', role: 'agent', name: 'Live Agent One' },
    { email: 'live-customer1@example.com', role: 'customer', name: 'Live Customer One' },
  ]
  for (const s of seedPending) {
    const exists = pending.find(p => p.email === s.email)
    if (!exists) await requestRegistration(s.email, s.role, { name: s.name })
  }
  const existsAdmin = MOCK_USERS.find(u => u.email === 'live-admin@example.com')
  if (!existsAdmin) {
    MOCK_USERS.push({ email: 'live-admin@example.com', password: 'LivePwd!', role: 'admin', name: 'Live Admin' })
  }
  const existsAgent = MOCK_USERS.find(u => u.email === 'live-agent1@example.com')
  if (!existsAgent) {
    MOCK_USERS.push({ email: 'live-agent1@example.com', password: 'LivePwd!', role: 'agent', name: 'Live Agent One' })
  }
  const existsCustomer = MOCK_USERS.find(u => u.email === 'live-customer1@example.com')
  if (!existsCustomer) {
    MOCK_USERS.push({ email: 'live-customer1@example.com', password: 'LivePwd!', role: 'customer', name: 'Live Customer One' })
  }
}

export async function seedProductionLiveData(): Promise<void> {
  await seedLiveData()
  const additionalPending: Array<{ email: string; role: 'agent' | 'customer'; name?: string }> = [
    { email: 'live-agent2@example.com', role: 'agent', name: 'Live Agent Two' },
    { email: 'live-agent3@example.com', role: 'agent', name: 'Live Agent Three' },
    { email: 'live-customer2@example.com', role: 'customer', name: 'Live Customer Two' },
  ]
  const pending = loadPending()
  for (const a of additionalPending) {
    const exists = pending.find(p => p.email === a.email)
    if (!exists) await requestRegistration(a.email, a.role, { name: a.name })
  }
  const toAdd: Array<{ email: string; password: string; role: 'admin'|'agent'|'customer'; name?: string }> = [
    { email: 'live-admin2@example.com', password: 'LivePwd!', role: 'admin', name: 'Live Admin 2' },
    { email: 'live-agent2@example.com', password: 'LivePwd!', role: 'agent', name: 'Live Agent Two' },
    { email: 'live-customer2@example.com', password: 'LivePwd!', role: 'customer', name: 'Live Customer Two' },
  ]
  for (const u of toAdd) {
    const exists = MOCK_USERS.find(x => x.email === u.email)
    if (!exists) {
      MOCK_USERS.push({ email: u.email, password: u.password, role: u.role, name: u.name })
    }
  }
}

export function getRegisteredAccountsCount(): number {
  return MOCK_USERS.length
}