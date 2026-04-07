// Simple local authentication fallback (no Netlify). Stores user state in localStorage.
export type User = {
  id: string
  email: string
  name?: string
  app_metadata?: { roles?: string[]; isTestAccount?: boolean }
  user_metadata?: { full_name?: string; profilePicture?: string }
}

const MOCK_USERS_KEY = 'mock.users.v1'

// Test accounts — unlimited usage, isolated demo data, no real audit trail pollution
const TEST_ACCOUNTS: Array<{ email: string; password: string; role: string; name?: string }> = [
  { email: 'rkaijage@gmail.com', password: '@Eva0191!', role: 'admin', name: 'REAGAN ROBERT KAIJAGE' },
  { email: 'admin@example.com', password: 'admin', role: 'test', name: 'Test Account' },
]

// Helper to safely access localStorage only in the browser
const getLocalStorage = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

function loadMockUsers(): Array<{ email: string; password: string; role: string; name?: string; isTestAccount?: boolean }> {
  const ls = getLocalStorage()
  if (!ls) return []
  try {
    const raw = ls.getItem(MOCK_USERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMockUsers(users: Array<{ email: string; password: string; role: string; name?: string; isTestAccount?: boolean }>) {
  const ls = getLocalStorage()
  if (ls) ls.setItem(MOCK_USERS_KEY, JSON.stringify(users))
}

function getUserFromSettings(email: string): { name?: string; profilePicture?: string } {
  const ls = getLocalStorage()
  if (!ls) return {}
  try {
    const raw = ls.getItem('app_settings_v3')
    if (!raw) return {}
    const settings = JSON.parse(raw) as { users?: Array<{ email: string; name?: string; profilePicture?: string }> }
    const found = settings.users?.find(u => u.email === email)
    return { name: found?.name, profilePicture: found?.profilePicture }
  } catch {
    return {}
  }
}

export async function login(email: string, password: string): Promise<User> {
  const ls = getLocalStorage()
  let found: { email: string; password: string; role: string; name?: string; isTestAccount?: boolean } | undefined

  // Always check localStorage first for persisted registered users
  if (ls) {
    try {
      const raw = ls.getItem(MOCK_USERS_KEY)
      if (raw) {
        const users = JSON.parse(raw) as Array<{ email: string; password: string; role: string; name?: string; isTestAccount?: boolean }>
        found = users.find(u => u.email === email && u.password === password)
      }
    } catch { /* ignore */ }
  }

  const testFound = TEST_ACCOUNTS.find(u => u.email === email && u.password === password)

  if (!found && !testFound) {
    const err: any = new Error('Invalid email or password.')
    err.status = 401
    throw err
  }

  const source = found || testFound!
  const isTest = !!testFound
  const { name: settingsName, profilePicture } = getUserFromSettings(email)

  const user: User = {
    id: (isTest ? 'test-' : 'mock-') + crypto.randomUUID(),
    email,
    name: source.name,
    app_metadata: { roles: [source.role], isTestAccount: isTest },
    user_metadata: { full_name: settingsName ?? source.name, profilePicture },
  }

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
  const { name: settingsName, profilePicture } = getUserFromSettings(email)
  const newUser: User = {
    id: (isTest ? 'test-' : 'mock-') + crypto.randomUUID(),
    email,
    name: p.name,
    app_metadata: { roles: [p.role], isTestAccount: isTest },
    user_metadata: { full_name: settingsName ?? p.name, profilePicture },
  }
  const users = loadMockUsers()
  const existing = users.find(u => u.email === email)
  if (!existing) {
    users.push({ email, password: 'Temp123!', role: p.role, name: p.name, isTestAccount: isTest })
    saveMockUsers(users)
  }
  pending.splice(foundIndex, 1)
  savePending(pending)
  const ls = getLocalStorage()
  if (ls) ls.setItem('mock.user', JSON.stringify(newUser))
  return newUser
}

export async function signup(email: string, password: string, meta: Record<string, unknown>): Promise<User> {
  const isTest = !!meta?.isTestAccount
  const role = (meta?.role as string) ?? 'customer'
  const user: User = {
    id: isTest ? `test-${crypto.randomUUID()}` : crypto.randomUUID(),
    email,
    name: meta?.name as string | undefined,
    app_metadata: { roles: [role], isTestAccount: isTest },
    user_metadata: { full_name: meta?.name as string | undefined, profilePicture: meta?.profilePicture as string | undefined },
  }
  const ls = getLocalStorage()
  if (ls) ls.setItem('mock.user', JSON.stringify(user))
  // Persist to localStorage so user survives logout/refresh
  const users = loadMockUsers()
  const existing = users.find(u => u.email === email)
  if (!existing) {
    users.push({ email, password, role, name: meta?.name as string | undefined, isTestAccount: isTest })
    saveMockUsers(users)
  }
  return user
}

export function getCurrentUser(): User | null {
  const ls = getLocalStorage()
  if (!ls) return null
  const raw = ls.getItem('mock.user')
  if (!raw) return null
  try {
    const user = JSON.parse(raw) as User
    const { name: settingsName, profilePicture } = getUserFromSettings(user.email)
    user.user_metadata = {
      full_name: settingsName ?? user.user_metadata?.full_name,
      profilePicture: profilePicture ?? user.user_metadata?.profilePicture,
    }
    return user
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
  const users = loadMockUsers()
  const existsAdmin = users.find(u => u.email === 'live-admin@example.com')
  if (!existsAdmin) {
    users.push({ email: 'live-admin@example.com', password: 'LivePwd!', role: 'admin', name: 'Live Admin' })
    saveMockUsers(users)
  }
  const existsAgent = users.find(u => u.email === 'live-agent1@example.com')
  if (!existsAgent) {
    users.push({ email: 'live-agent1@example.com', password: 'LivePwd!', role: 'agent', name: 'Live Agent One' })
    saveMockUsers(users)
  }
  const existsCustomer = users.find(u => u.email === 'live-customer1@example.com')
  if (!existsCustomer) {
    users.push({ email: 'live-customer1@example.com', password: 'LivePwd!', role: 'customer', name: 'Live Customer One' })
    saveMockUsers(users)
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
  const users = loadMockUsers()
  const toAdd: Array<{ email: string; password: string; role: 'admin'|'agent'|'customer'; name?: string }> = [
    { email: 'live-admin2@example.com', password: 'LivePwd!', role: 'admin', name: 'Live Admin 2' },
    { email: 'live-agent2@example.com', password: 'LivePwd!', role: 'agent', name: 'Live Agent Two' },
    { email: 'live-customer2@example.com', password: 'LivePwd!', role: 'customer', name: 'Live Customer Two' },
  ]
  for (const u of toAdd) {
    const exists = users.find(x => x.email === u.email)
    if (!exists) {
      users.push({ email: u.email, password: u.password, role: u.role, name: u.name })
      saveMockUsers(users)
    }
  }
}

export function getRegisteredAccountsCount(): number {
  return loadMockUsers().length
}
