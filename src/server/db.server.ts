import { getStore } from './localStore'
import type {
  AgentProfile,
  CustomerProfile,
  Transaction,
  FloatRequest,
  FloatExchange,
  CreditPortfolio,
} from '@/lib/types'

// ── Store routing: test accounts use isolated demo stores ─────────────────────
// Test account data is stored in separate "test-*" stores so it never pollutes
// the real audit trail. Admins can still view test data via the admin panel
// but it is clearly marked and excluded from production reports.

function isTestEntity(item: { isTestAccount?: boolean } | { agentId?: string; customerId?: string } | { id?: string }): boolean {
  if ('isTestAccount' in item && item.isTestAccount) return true
  if ('agentId' in item && typeof item.agentId === 'string' && item.agentId.startsWith('test-')) return true
  if ('customerId' in item && typeof item.customerId === 'string' && item.customerId.startsWith('test-')) return true
  if ('id' in item && typeof item.id === 'string' && item.id.startsWith('test-')) return true
  return false
}

function getStoreName(baseName: string, isTest: boolean): string {
  return isTest ? `test-${baseName}` : baseName
}

// ── Agents ──────────────────────────────────────────────────────────────────

export async function getAgentProfile(id: string): Promise<AgentProfile | null> {
  const isTest = id.startsWith('test-')
  const store = getStore(getStoreName('agents', isTest))
  return store.get(id, { type: 'json' })
}

export async function saveAgentProfile(profile: AgentProfile): Promise<void> {
  const isTest = isTestEntity(profile)
  const store = getStore(getStoreName('agents', isTest))
  await store.setJSON(profile.id, profile)
}

export async function listAgents(testOnly?: boolean): Promise<AgentProfile[]> {
  const store = getStore(testOnly ? 'test-agents' : 'agents')
  const { blobs } = await store.list()
  if (blobs.length === 0) return []
  const results = await Promise.all(
    blobs.map(b => store.get(b.key, { type: 'json' }) as Promise<AgentProfile>)
  )
  return results.filter(Boolean)
}

export async function listAllAgents(): Promise<{ real: AgentProfile[]; test: AgentProfile[] }> {
  const [real, test] = await Promise.all([listAgents(false), listAgents(true)])
  return { real, test }
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function getCustomerProfile(id: string): Promise<CustomerProfile | null> {
  const isTest = id.startsWith('test-')
  const store = getStore(getStoreName('customers', isTest))
  return store.get(id, { type: 'json' })
}

export async function saveCustomerProfile(profile: CustomerProfile): Promise<void> {
  const isTest = isTestEntity(profile)
  const store = getStore(getStoreName('customers', isTest))
  await store.setJSON(profile.id, profile)
}

export async function listCustomers(testOnly?: boolean): Promise<CustomerProfile[]> {
  const store = getStore(testOnly ? 'test-customers' : 'customers')
  const { blobs } = await store.list()
  if (blobs.length === 0) return []
  const results = await Promise.all(
    blobs.map(b => store.get(b.key, { type: 'json' }) as Promise<CustomerProfile>)
  )
  return results.filter(Boolean)
}

export async function listAllCustomers(): Promise<{ real: CustomerProfile[]; test: CustomerProfile[] }> {
  const [real, test] = await Promise.all([listCustomers(false), listCustomers(true)])
  return { real, test }
}

export async function listCustomersByTier(tier: 'd2d' | 'premier', testOnly?: boolean): Promise<CustomerProfile[]> {
  const all = await listCustomers(testOnly)
  return all.filter(c => c.tier === tier)
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function getTransaction(id: string): Promise<Transaction | null> {
  const isTest = id.startsWith('test-')
  const store = getStore(getStoreName('transactions', isTest))
  return store.get(id, { type: 'json' })
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  const isTest = isTestEntity(tx)
  const store = getStore(getStoreName('transactions', isTest))
  await store.setJSON(tx.id, tx)
}

export async function listTransactions(testOnly?: boolean): Promise<Transaction[]> {
  const store = getStore(testOnly ? 'test-transactions' : 'transactions')
  const { blobs } = await store.list()
  if (blobs.length === 0) return []
  const results = await Promise.all(
    blobs.map(b => store.get(b.key, { type: 'json' }) as Promise<Transaction>)
  )
  return results.filter(Boolean).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function listAllTransactions(): Promise<{ real: Transaction[]; test: Transaction[] }> {
  const [real, test] = await Promise.all([listTransactions(false), listTransactions(true)])
  return { real, test }
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

// ── Float Requests (legacy) ──────────────────────────────────────────────────

export async function getFloatRequest(id: string): Promise<FloatRequest | null> {
  const isTest = id.startsWith('test-')
  const store = getStore(getStoreName('float-requests', isTest))
  return store.get(id, { type: 'json' })
}

export async function saveFloatRequest(req: FloatRequest): Promise<void> {
  const isTest = isTestEntity(req)
  const store = getStore(getStoreName('float-requests', isTest))
  await store.setJSON(req.id, req)
}

export async function listFloatRequests(testOnly?: boolean): Promise<FloatRequest[]> {
  const store = getStore(testOnly ? 'test-float-requests' : 'float-requests')
  const { blobs } = await store.list()
  if (blobs.length === 0) return []
  const results = await Promise.all(
    blobs.map(b => store.get(b.key, { type: 'json' }) as Promise<FloatRequest>)
  )
  return results.filter(Boolean).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function listAllFloatRequests(): Promise<{ real: FloatRequest[]; test: FloatRequest[] }> {
  const [real, test] = await Promise.all([listFloatRequests(false), listFloatRequests(true)])
  return { real, test }
}

export async function listFloatRequestsByAgent(agentId: string): Promise<FloatRequest[]> {
  const isTest = agentId.startsWith('test-')
  const all = await listFloatRequests(isTest)
  return all.filter(r => r.agentId === agentId)
}

// ── Float Exchange (Agent) ───────────────────────────────────────────────────

export async function getFloatExchange(id: string): Promise<FloatExchange | null> {
  const isTest = id.startsWith('test-')
  const store = getStore(getStoreName('float-exchanges', isTest))
  return store.get(id, { type: 'json' })
}

export async function saveFloatExchange(exchange: FloatExchange): Promise<void> {
  const isTest = isTestEntity(exchange)
  const store = getStore(getStoreName('float-exchanges', isTest))
  await store.setJSON(exchange.id, exchange)
}

export async function listFloatExchanges(testOnly?: boolean): Promise<FloatExchange[]> {
  const store = getStore(testOnly ? 'test-float-exchanges' : 'float-exchanges')
  const { blobs } = await store.list()
  if (blobs.length === 0) return []
  const results = await Promise.all(
    blobs.map(b => store.get(b.key, { type: 'json' }) as Promise<FloatExchange>)
  )
  return results.filter(Boolean).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function listAllFloatExchanges(): Promise<{ real: FloatExchange[]; test: FloatExchange[] }> {
  const [real, test] = await Promise.all([listFloatExchanges(false), listFloatExchanges(true)])
  return { real, test }
}

export async function listFloatExchangesByAgent(agentId: string): Promise<FloatExchange[]> {
  const isTest = agentId.startsWith('test-')
  const all = await listFloatExchanges(isTest)
  return all.filter(e => e.agentId === agentId)
}

// ── Credit Portfolios ────────────────────────────────────────────────────────

export async function getCreditPortfolio(customerId: string): Promise<CreditPortfolio | null> {
  const isTest = customerId.startsWith('test-')
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

// ── Admin-only deletion (production safety) ──────────────────────────────────
// These functions are intended to be called only from admin-authenticated
// server functions. They permanently remove records from the store.

export async function deleteAgent(id: string): Promise<void> {
  const isTest = id.startsWith('test-')
  const store = getStore(getStoreName('agents', isTest))
  await store.delete(id)
}

export async function deleteCustomer(id: string): Promise<void> {
  const isTest = id.startsWith('test-')
  const store = getStore(getStoreName('customers', isTest))
  await store.delete(id)
}

export async function deleteTransaction(id: string): Promise<void> {
  const isTest = id.startsWith('test-')
  const store = getStore(getStoreName('transactions', isTest))
  await store.delete(id)
}

export async function deleteFloatRequest(id: string): Promise<void> {
  const isTest = id.startsWith('test-')
  const store = getStore(getStoreName('float-requests', isTest))
  await store.delete(id)
}

export async function deleteFloatExchange(id: string): Promise<void> {
  const isTest = id.startsWith('test-')
  const store = getStore(getStoreName('float-exchanges', isTest))
  await store.delete(id)
}

// ── Test data cleanup ────────────────────────────────────────────────────────
// Admin can wipe all test data at once without touching real records.

export async function clearAllTestData(): Promise<void> {
  const testStores = [
    'test-agents', 'test-customers', 'test-transactions',
    'test-float-requests', 'test-float-exchanges',
  ]
  for (const name of testStores) {
    const store = getStore(name)
    const { blobs } = await store.list()
    for (const b of blobs) {
      await store.delete(b.key)
    }
  }
}
