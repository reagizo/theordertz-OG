import { supabaseAdmin } from '@/lib/supabase'
import type {
  AgentProfile,
  CustomerProfile,
  Transaction,
  FloatRequest,
  FloatExchange,
  CreditPortfolio,
  VendorProfile,
} from '@/lib/types'

function isTestEntity(item: { isTestAccount?: boolean } | { agentId?: string; customerId?: string } | { id?: string }): boolean {
  if ('isTestAccount' in item && item.isTestAccount) return true
  if ('agentId' in item && typeof item.agentId === 'string' && item.agentId.startsWith('test-')) return true
  if ('customerId' in item && typeof item.customerId === 'string' && item.customerId.startsWith('test-')) return true
  if ('id' in item && typeof item.id === 'string' && item.id.startsWith('test-')) return true
  return false
}

// ── Agents ──────────────────────────────────────────────────────────────────

export async function getAgentProfile(id: string): Promise<AgentProfile | null> {
  const { data, error } = await supabaseAdmin.from('agents').select('*').eq('id', id).single()
  if (error) return null
  return data as AgentProfile
}

export async function saveAgentProfile(profile: AgentProfile): Promise<void> {
  const isTest = isTestEntity(profile)
  const { error } = await supabaseAdmin.from('agents').upsert({
    ...profile,
    is_test_account: isTest,
  }, { onConflict: 'id' })
  if (error) console.error('Error saving agent:', error)
}

export async function listAgents(testOnly?: boolean): Promise<AgentProfile[]> {
  let query = supabaseAdmin.from('agents').select('*').order('created_at', { ascending: false })
  if (testOnly) {
    query = query.eq('is_test_account', true)
  }
  const { data, error } = await query
  if (error) {
    console.error('Error listing agents:', error)
    return []
  }
  return (data || []) as AgentProfile[]
}

export async function listAllAgents(): Promise<{ real: AgentProfile[]; test: AgentProfile[] }> {
  const [real, test] = await Promise.all([listAgents(false), listAgents(true)])
  return { real, test }
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function getCustomerProfile(id: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabaseAdmin.from('customers').select('*').eq('id', id).single()
  if (error) return null
  return data as CustomerProfile
}

export async function saveCustomerProfile(profile: CustomerProfile): Promise<void> {
  const isTest = isTestEntity(profile)
  const { error } = await supabaseAdmin.from('customers').upsert({
    ...profile,
    is_test_account: isTest,
  }, { onConflict: 'id' })
  if (error) console.error('Error saving customer:', error)
}

export async function listCustomers(testOnly?: boolean): Promise<CustomerProfile[]> {
  let query = supabaseAdmin.from('customers').select('*').order('created_at', { ascending: false })
  if (testOnly) {
    query = query.eq('is_test_account', true)
  }
  const { data, error } = await query
  if (error) {
    console.error('Error listing customers:', error)
    return []
  }
  return (data || []) as CustomerProfile[]
}

export async function listAllCustomers(): Promise<{ real: CustomerProfile[]; test: CustomerProfile[] }> {
  const [real, test] = await Promise.all([listCustomers(false), listAgents(true)])
  return { real, test: test as unknown as CustomerProfile[] }
}

export async function listCustomersByTier(tier: 'd2d' | 'premier', testOnly?: boolean): Promise<CustomerProfile[]> {
  const all = await listCustomers(testOnly)
  return all.filter(c => c.tier === tier)
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function getTransaction(id: string): Promise<Transaction | null> {
  const { data, error } = await supabaseAdmin.from('transactions').select('*').eq('id', id).single()
  if (error) return null
  return data as Transaction
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  const isTest = isTestEntity(tx)
  const { error } = await supabaseAdmin.from('transactions').upsert({
    ...tx,
    is_test_account: isTest,
  }, { onConflict: 'id' })
  if (error) console.error('Error saving transaction:', error)
}

export async function listTransactions(testOnly?: boolean): Promise<Transaction[]> {
  let query = supabaseAdmin.from('transactions').select('*').order('created_at', { ascending: false })
  if (testOnly) {
    query = query.eq('is_test_account', true)
  }
  const { data, error } = await query
  if (error) {
    console.error('Error listing transactions:', error)
    return []
  }
  return (data || []) as Transaction[]
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

// ── Float Requests ────────────────────────────────────────────────────────────

export async function getFloatRequest(id: string): Promise<FloatRequest | null> {
  const { data, error } = await supabaseAdmin.from('float_requests').select('*').eq('id', id).single()
  if (error) return null
  return data as FloatRequest
}

export async function saveFloatRequest(req: FloatRequest): Promise<void> {
  const isTest = isTestEntity(req)
  const { error } = await supabaseAdmin.from('float_requests').upsert({
    ...req,
    is_test_account: isTest,
  }, { onConflict: 'id' })
  if (error) console.error('Error saving float request:', error)
}

export async function listFloatRequests(testOnly?: boolean): Promise<FloatRequest[]> {
  let query = supabaseAdmin.from('float_requests').select('*').order('created_at', { ascending: false })
  if (testOnly) {
    query = query.eq('is_test_account', true)
  }
  const { data, error } = await query
  if (error) {
    console.error('Error listing float requests:', error)
    return []
  }
  return (data || []) as FloatRequest[]
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
  const { data, error } = await supabaseAdmin.from('float_exchanges').select('*').eq('id', id).single()
  if (error) return null
  return data as FloatExchange
}

export async function saveFloatExchange(exchange: FloatExchange): Promise<void> {
  const isTest = isTestEntity(exchange)
  const { error } = await supabaseAdmin.from('float_exchanges').upsert({
    ...exchange,
    is_test_account: isTest,
  }, { onConflict: 'id' })
  if (error) console.error('Error saving float exchange:', error)
}

export async function listFloatExchanges(testOnly?: boolean): Promise<FloatExchange[]> {
  let query = supabaseAdmin.from('float_exchanges').select('*').order('created_at', { ascending: false })
  if (testOnly) {
    query = query.eq('is_test_account', true)
  }
  const { data, error } = await query
  if (error) {
    console.error('Error listing float exchanges:', error)
    return []
  }
  return (data || []) as FloatExchange[]
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

// ── Credit Portfolios ───────────────────────────────────────────────────────

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

// ── Deletion functions ───────────────────────────────────────────────────────

export async function deleteAgent(id: string): Promise<void> {
  await supabaseAdmin.from('agents').delete().eq('id', id)
}

export async function deleteCustomer(id: string): Promise<void> {
  await supabaseAdmin.from('customers').delete().eq('id', id)
}

export async function deleteTransaction(id: string): Promise<void> {
  await supabaseAdmin.from('transactions').delete().eq('id', id)
}

export async function deleteFloatRequest(id: string): Promise<void> {
  await supabaseAdmin.from('float_requests').delete().eq('id', id)
}

export async function deleteFloatExchange(id: string): Promise<void> {
  await supabaseAdmin.from('float_exchanges').delete().eq('id', id)
}

// ── Vendors ─────────────────────────────────────────────────────────────────

export async function getVendorProfile(id: string): Promise<VendorProfile | null> {
  const { data, error } = await supabaseAdmin.from('vendors').select('*').eq('id', id).single()
  if (error) return null
  return data as VendorProfile
}

export async function saveVendorProfile(profile: VendorProfile): Promise<void> {
  const isTest = isTestEntity(profile)
  const { error } = await supabaseAdmin.from('vendors').upsert({
    ...profile,
    is_test_account: isTest,
  }, { onConflict: 'id' })
  if (error) console.error('Error saving vendor:', error)
}

export async function listVendors(testOnly?: boolean): Promise<VendorProfile[]> {
  let query = supabaseAdmin.from('vendors').select('*').order('created_at', { ascending: false })
  if (testOnly) {
    query = query.eq('is_test_account', true)
  }
  const { data, error } = await query
  if (error) {
    console.error('Error listing vendors:', error)
    return []
  }
  return (data || []) as VendorProfile[]
}

export async function listAllVendors(): Promise<{ real: VendorProfile[]; test: VendorProfile[] }> {
  const [real, test] = await Promise.all([listVendors(false), listVendors(true)])
  return { real, test }
}

export async function listVendorsByStatus(status: 'pending' | 'approved' | 'rejected', testOnly?: boolean): Promise<VendorProfile[]> {
  const all = await listVendors(testOnly)
  return all.filter(v => v.status === status)
}

export async function deleteVendor(id: string): Promise<void> {
  await supabaseAdmin.from('vendors').delete().eq('id', id)
}

// ── Supabase helpers (for direct client access) ───────────────────────────────

export async function getVendorsFromSupabase(): Promise<VendorProfile[]> {
  const { data, error } = await supabaseAdmin.from('vendors').select('*').order('created_at', { ascending: false })
  if (error) {
    console.error('Error fetching vendors from Supabase:', error)
    return []
  }
  return data as VendorProfile[]
}

export async function syncVendorsToSupabase(): Promise<void> {
  const real = await listVendors(false)
  const test = await listVendors(true)

  for (const v of real) {
    await supabaseAdmin.from('vendors').upsert({
      id: v.id,
      full_name: v.fullName,
      email: v.email,
      phone: v.phone,
      business_name: v.businessName,
      business_type: v.businessType,
      address: v.address,
      tin_number: v.tinNumber,
      vr_number: v.vrNumber,
      status: v.status,
      created_at: v.createdAt,
      updated_at: v.updatedAt,
      wallet_balance: v.walletBalance,
      is_test_account: false,
    }, { onConflict: 'id' })
  }

  for (const v of test) {
    await supabaseAdmin.from('vendors').upsert({
      id: v.id,
      full_name: v.fullName,
      email: v.email,
      phone: v.phone,
      business_name: v.businessName,
      business_type: v.businessType,
      address: v.address,
      tin_number: v.tinNumber,
      vr_number: v.vrNumber,
      status: v.status,
      created_at: v.createdAt,
      updated_at: v.updatedAt,
      wallet_balance: v.walletBalance,
      is_test_account: true,
    }, { onConflict: 'id' })
  }
}

// ── Test data cleanup ────────────────────────────────────────────────────────

export async function clearAllTestData(): Promise<void> {
  await supabaseAdmin.from('agents').delete().eq('is_test_account', true)
  await supabaseAdmin.from('customers').delete().eq('is_test_account', true)
  await supabaseAdmin.from('transactions').delete().eq('is_test_account', true)
  await supabaseAdmin.from('float_requests').delete().eq('is_test_account', true)
  await supabaseAdmin.from('float_exchanges').delete().eq('is_test_account', true)
  await supabaseAdmin.from('vendors').delete().eq('is_test_account', true)
}