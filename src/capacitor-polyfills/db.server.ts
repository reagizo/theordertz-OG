// Capacitor-compatible db.server using localStorage instead of Node.js fs
import type {
  AgentProfile,
  CustomerProfile,
  Transaction,
  FloatRequest,
  FloatExchange,
  CreditPortfolio,
} from '@/lib/types'

// In-memory store for Capacitor (persists via localStorage)
interface StoreData {
  agents: Map<string, AgentProfile>
  customers: Map<string, CustomerProfile>
  transactions: Map<string, Transaction>
  floatRequests: Map<string, FloatRequest>
  floatExchanges: Map<string, FloatExchange>
}

const stores: StoreData = {
  agents: new Map(),
  customers: new Map(),
  transactions: new Map(),
  floatRequests: new Map(),
  floatExchanges: new Map(),
}

// Load from localStorage on init
try {
  const raw = localStorage.getItem('capacitor-store')
  if (raw) {
    const data = JSON.parse(raw)
    if (data.agents) Object.entries(data.agents).forEach(([k, v]) => stores.agents.set(k, v as AgentProfile))
    if (data.customers) Object.entries(data.customers).forEach(([k, v]) => stores.customers.set(k, v as CustomerProfile))
    if (data.transactions) Object.entries(data.transactions).forEach(([k, v]) => stores.transactions.set(k, v as Transaction))
    if (data.floatRequests) Object.entries(data.floatRequests).forEach(([k, v]) => stores.floatRequests.set(k, v as FloatRequest))
    if (data.floatExchanges) Object.entries(data.floatExchanges).forEach(([k, v]) => stores.floatExchanges.set(k, v as FloatExchange))
  }
} catch {}

// Save to localStorage
function persist() {
  try {
    localStorage.setItem('capacitor-store', JSON.stringify({
      agents: Object.fromEntries(stores.agents),
      customers: Object.fromEntries(stores.customers),
      transactions: Object.fromEntries(stores.transactions),
      floatRequests: Object.fromEntries(stores.floatRequests),
      floatExchanges: Object.fromEntries(stores.floatExchanges),
    }))
  } catch {}
}

function isTestEntity(item: { isTestAccount?: boolean } | { agentId?: string; customerId?: string } | { id?: string }): boolean {
  if ('isTestAccount' in item && item.isTestAccount) return true
  if ('agentId' in item && typeof item.agentId === 'string' && item.agentId.startsWith('test-')) return true
  if ('customerId' in item && typeof item.customerId === 'string' && item.customerId.startsWith('test-')) return true
  if ('id' in item && typeof item.id === 'string' && item.id.startsWith('test-')) return true
  return false
}

// ── Agents ──────────────────────────────────────────────────────────────────

export async function getAgentProfile(id: string): Promise<AgentProfile | null> {
  return stores.agents.get(id) || null
}

export async function saveAgentProfile(profile: AgentProfile): Promise<void> {
  stores.agents.set(profile.id, profile)
  persist()
}

export async function listAgents(testOnly?: boolean): Promise<AgentProfile[]> {
  const all = Array.from(stores.agents.values())
  return testOnly ? all.filter(isTestEntity) : all.filter(a => !isTestEntity(a))
}

export async function listAllAgents(): Promise<{ real: AgentProfile[]; test: AgentProfile[] }> {
  const all = Array.from(stores.agents.values())
  return {
    real: all.filter(a => !isTestEntity(a)),
    test: all.filter(isTestEntity),
  }
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function getCustomerProfile(id: string): Promise<CustomerProfile | null> {
  return stores.customers.get(id) || null
}

export async function saveCustomerProfile(profile: CustomerProfile): Promise<void> {
  stores.customers.set(profile.id, profile)
  persist()
}

export async function listCustomers(testOnly?: boolean): Promise<CustomerProfile[]> {
  const all = Array.from(stores.customers.values())
  return testOnly ? all.filter(isTestEntity) : all.filter(c => !isTestEntity(c))
}

export async function listAllCustomers(): Promise<{ real: CustomerProfile[]; test: CustomerProfile[] }> {
  const all = Array.from(stores.customers.values())
  return {
    real: all.filter(c => !isTestEntity(c)),
    test: all.filter(isTestEntity),
  }
}

export async function listCustomersByTier(tier: 'd2d' | 'premier', testOnly?: boolean): Promise<CustomerProfile[]> {
  const all = await listCustomers(testOnly)
  return all.filter(c => c.tier === tier)
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function getTransaction(id: string): Promise<Transaction | null> {
  return stores.transactions.get(id) || null
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  stores.transactions.set(tx.id, tx)
  persist()
}

export async function listTransactions(testOnly?: boolean): Promise<Transaction[]> {
  const all = Array.from(stores.transactions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return testOnly ? all.filter(isTestEntity) : all.filter(t => !isTestEntity(t))
}

export async function listAllTransactions(): Promise<{ real: Transaction[]; test: Transaction[] }> {
  const all = Array.from(stores.transactions.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return {
    real: all.filter(t => !isTestEntity(t)),
    test: all.filter(isTestEntity),
  }
}

export async function listTransactionsByAgent(agentId: string): Promise<Transaction[]> {
  const isTest = agentId.startsWith('test-')
  const all = await listTransactions(isTest)
  return all.filter(t => t.agentId === agentId)
}

export async function listTransactionsByCustomer(customerId: string): Promise<Transaction[]> {
  const isTest = customerId.startsWith('test-')
  const all = await listTransactions(isTest)
  return all.filter(t => t.customerId === customerId)
}

export async function listTransactionsByTier(tier: 'd2d' | 'premier', testOnly?: boolean): Promise<Transaction[]> {
  const all = await listTransactions(testOnly)
  return all.filter(t => t.customerTier === tier)
}

// ── Float Requests ──────────────────────────────────────────────────────────

export async function getFloatRequest(id: string): Promise<FloatRequest | null> {
  return stores.floatRequests.get(id) || null
}

export async function saveFloatRequest(req: FloatRequest): Promise<void> {
  stores.floatRequests.set(req.id, req)
  persist()
}

export async function listFloatRequests(testOnly?: boolean): Promise<FloatRequest[]> {
  const all = Array.from(stores.floatRequests.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return testOnly ? all.filter(isTestEntity) : all.filter(r => !isTestEntity(r))
}

export async function listAllFloatRequests(): Promise<{ real: FloatRequest[]; test: FloatRequest[] }> {
  const all = Array.from(stores.floatRequests.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return {
    real: all.filter(r => !isTestEntity(r)),
    test: all.filter(isTestEntity),
  }
}

export async function listFloatRequestsByAgent(agentId: string): Promise<FloatRequest[]> {
  const isTest = agentId.startsWith('test-')
  const all = await listFloatRequests(isTest)
  return all.filter(r => r.agentId === agentId)
}

// ── Float Exchange ───────────────────────────────────────────────────────────

export async function getFloatExchange(id: string): Promise<FloatExchange | null> {
  return stores.floatExchanges.get(id) || null
}

export async function saveFloatExchange(exchange: FloatExchange): Promise<void> {
  stores.floatExchanges.set(exchange.id, exchange)
  persist()
}

export async function listFloatExchanges(testOnly?: boolean): Promise<FloatExchange[]> {
  const all = Array.from(stores.floatExchanges.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return testOnly ? all.filter(isTestEntity) : all.filter(e => !isTestEntity(e))
}

export async function listAllFloatExchanges(): Promise<{ real: FloatExchange[]; test: FloatExchange[] }> {
  const all = Array.from(stores.floatExchanges.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return {
    real: all.filter(e => !isTestEntity(e)),
    test: all.filter(isTestEntity),
  }
}

export async function listFloatExchangesByAgent(agentId: string): Promise<FloatExchange[]> {
  const isTest = agentId.startsWith('test-')
  const all = await listFloatExchanges(isTest)
  return all.filter(e => e.agentId === agentId)
}

// ── Credit Portfolios ────────────────────────────────────────────────────────

export async function getCreditPortfolio(customerId: string): Promise<CreditPortfolio | null> {
  const customer = await getCustomerProfile(customerId)
  if (!customer) return null
  const txs = await listTransactionsByCustomer(customerId)
  const creditTxs = txs.filter(t => t.isOnCredit)
  const totalOnCredit = creditTxs.reduce((s, t) => s + t.amount, 0)
  const approvedCreditTxs = creditTxs.filter(t => t.status === 'approved')
  const totalPaid = approvedCreditTxs.reduce((s, t) => s + t.amount, 0)
  return {
    customerId,
    customerName: customer.fullName,
    customerTier: customer.tier,
    creditLimit: customer.creditLimit,
    creditUsed: totalOnCredit,
    creditAvailable: customer.creditLimit - totalOnCredit,
    totalTransactions: txs.length,
    totalOnCredit,
    totalPaid,
    outstandingBalance: totalOnCredit - totalPaid,
    transactions: txs,
  }
}

export async function listCreditPortfolios(testOnly?: boolean): Promise<CreditPortfolio[]> {
  const customers = await listCustomers(testOnly)
  const portfolios: CreditPortfolio[] = []
  for (const c of customers) {
    if (c.tier === 'premier' || c.creditLimit > 0) {
      const portfolio = await getCreditPortfolio(c.id)
      if (portfolio) portfolios.push(portfolio)
    }
  }
  return portfolios
}

// ── Admin-only deletion ──────────────────────────────────────────────────────

export async function deleteAgent(id: string): Promise<void> {
  stores.agents.delete(id)
  persist()
}

export async function deleteCustomer(id: string): Promise<void> {
  stores.customers.delete(id)
  persist()
}

export async function deleteTransaction(id: string): Promise<void> {
  stores.transactions.delete(id)
  persist()
}

export async function deleteFloatRequest(id: string): Promise<void> {
  stores.floatRequests.delete(id)
  persist()
}

export async function deleteFloatExchange(id: string): Promise<void> {
  stores.floatExchanges.delete(id)
  persist()
}

export async function clearAllTestData(): Promise<void> {
  for (const [key, agent] of stores.agents.entries()) {
    if (isTestEntity(agent)) stores.agents.delete(key)
  }
  for (const [key, customer] of stores.customers.entries()) {
    if (isTestEntity(customer)) stores.customers.delete(key)
  }
  for (const [key, tx] of stores.transactions.entries()) {
    if (isTestEntity(tx)) stores.transactions.delete(key)
  }
  for (const [key, req] of stores.floatRequests.entries()) {
    if (isTestEntity(req)) stores.floatRequests.delete(key)
  }
  for (const [key, ex] of stores.floatExchanges.entries()) {
    if (isTestEntity(ex)) stores.floatExchanges.delete(key)
  }
  persist()
}
