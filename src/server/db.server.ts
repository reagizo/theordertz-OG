import { getSupabaseAdminOrThrow } from '@/lib/supabase'
import type {
  AgentProfile,
  CustomerProfile,
  Transaction,
  FloatRequest,
  FloatExchange,
  CreditPortfolio,
} from '@/lib/types'

// Safe admin client that gracefully degrades when service key is missing
const getAdminSafe = () => {
  try {
    const admin = getSupabaseAdminOrThrow()
    if (!admin) {
      console.warn('Supabase admin client not configured - some features may not work')
      return null
    }
    return admin
  } catch (err) {
    console.error('Failed to get Supabase admin:', err)
    return null
  }
}

const supabaseAdmin = {
  from: (...args: any[]) => {
    const admin = getAdminSafe()
    if (!admin) {
      // Return a mock query builder that returns empty data
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }), maybeSingle: async () => ({ data: null, error: null }), order: () => ({ execute: async () => ({ data: [], error: null }) }), execute: async () => ({ data: [], error: null }) }) }),
        upsert: async () => ({ error: null }),
        delete: () => ({ eq: () => ({ execute: async () => ({ error: null }) }) }),
        update: () => ({ eq: () => ({ execute: async () => ({ error: null }) }) }),
      }
    }
    return admin.from(...args)
  },
}

// ── Agents ──────────────────────────────────────────────────────────────────

export async function getAgentProfile(id: string): Promise<AgentProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('agent_profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return mapAgentRow(data)
}

export async function saveAgentProfile(profile: AgentProfile): Promise<void> {
  const { error } = await supabaseAdmin
    .from('agent_profiles')
    .upsert({
      id: profile.id,
      full_name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      national_id: profile.nationalId,
      address: profile.address,
      business_name: profile.businessName,
      status: profile.status,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
      float_balance: profile.floatBalance,
      commission_rate: profile.commissionRate,
      commission_earned: profile.commissionEarned,
      is_test_account: !!profile.isTestAccount,
      admin_requested_by: profile.adminRequestedBy || null,
    })
  if (error) throw error
}

export async function listAgents(testOnly?: boolean): Promise<AgentProfile[]> {
  let query = supabaseAdmin.from('agent_profiles').select('*')
  if (testOnly) query = query.eq('is_test_account', true)
  else query = query.eq('is_test_account', false)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return []
  return data.map(mapAgentRow)
}

export async function listAllAgents(): Promise<{ real: AgentProfile[]; test: AgentProfile[] }> {
  const [real, test] = await Promise.all([listAgents(false), listAgents(true)])
  return { real, test }
}

export async function deleteAgent(id: string): Promise<void> {
  await supabaseAdmin.from('agent_profiles').delete().eq('id', id)
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function getCustomerProfile(id: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabaseAdmin
    .from('customer_profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, phone, address')
      .eq('id', id)
      .single()
    if (!userData) return null
    return {
      id: userData.id,
      fullName: userData.full_name || '',
      email: userData.email || '',
      phone: userData.phone || '',
      nationalId: '',
      address: userData.address || '',
      tier: 'd2d' as const,
      status: 'approved' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      walletBalance: 0,
      creditLimit: 0,
      creditUsed: 0,
      isTestAccount: false,
    }
  }
  const profile = mapCustomerRow(data)
  if (!profile.fullName) {
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', id)
      .single()
    if (userData?.full_name) {
      profile.fullName = userData.full_name
    }
  }
  return profile
}

export async function saveCustomerProfile(profile: CustomerProfile): Promise<void> {
  const { error } = await supabaseAdmin
    .from('customer_profiles')
    .upsert({
      id: profile.id,
      full_name: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      national_id: profile.nationalId,
      address: profile.address,
      tier: profile.tier,
      status: profile.status,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
      wallet_balance: profile.walletBalance,
      credit_limit: profile.creditLimit,
      credit_used: profile.creditUsed,
      assigned_agent_id: profile.assignedAgentId || null,
      is_test_account: !!profile.isTestAccount,
      admin_requested_by: profile.adminRequestedBy || null,
    })
  if (error) throw error
}

export async function listCustomers(testOnly?: boolean): Promise<CustomerProfile[]> {
  let query = supabaseAdmin.from('customer_profiles').select('*')
  if (testOnly) query = query.eq('is_test_account', true)
  else query = query.eq('is_test_account', false)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return []
  return data.map(mapCustomerRow)
}

export async function listAllCustomers(): Promise<{ real: CustomerProfile[]; test: CustomerProfile[] }> {
  const [real, test] = await Promise.all([listCustomers(false), listCustomers(true)])
  return { real, test }
}

export async function listCustomersByTier(tier: 'd2d' | 'premier', testOnly?: boolean): Promise<CustomerProfile[]> {
  const all = await listCustomers(testOnly)
  return all.filter(c => c.tier === tier)
}

export async function deleteCustomer(id: string): Promise<void> {
  await supabaseAdmin.from('customer_profiles').delete().eq('id', id)
}

// ── Transactions ─────────────────────────────────────────────────────────────

export async function getTransaction(id: string): Promise<Transaction | null> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return mapTransactionRow(data)
}

export async function saveTransaction(tx: Transaction): Promise<void> {
  const { error } = await supabaseAdmin
    .from('transactions')
    .upsert({
      id: tx.id,
      agent_id: tx.agentId || null,
      agent_name: tx.agentName || null,
      customer_id: tx.customerId || null,
      customer_name: tx.customerName || null,
      customer_phone: tx.customerPhone || null,
      customer_tier: tx.customerTier,
      service_type: tx.serviceType || null,
      provider: tx.provider,
      amount: tx.amount,
      payment_method: tx.paymentMethod || null,
      status: tx.status,
      is_on_credit: tx.isOnCredit || false,
      created_at: tx.createdAt,
      updated_at: tx.updatedAt,
      notes: tx.notes || null,
      subscription_number: tx.subscriptionNumber || null,
      meter_number: tx.meterNumber || null,
      control_number: tx.controlNumber || null,
      reference_number: tx.referenceNumber || null,
      smartcard_number: tx.smartcardNumber || null,
      cash_direction: tx.cashDirection || null,
      carrier_network: tx.carrierNetwork || null,
      transaction_direction: tx.transactionDirection || null,
      utility_bill_type: tx.utilityBillType || null,
      all_payment_type: tx.allPaymentType || null,
    })
  if (error) throw error
}

export async function listTransactions(testOnly?: boolean): Promise<Transaction[]> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return []
  const txs = data.map(mapTransactionRow)
  if (testOnly) return txs.filter(t => t.agentId?.startsWith('test-') || t.customerId?.startsWith('test-'))
  return txs
}

export async function listAllTransactions(): Promise<{ real: Transaction[]; test: Transaction[] }> {
  const all = await listTransactions()
  const test = all.filter(t => t.agentId?.startsWith('test-') || t.customerId?.startsWith('test-'))
  const real = all.filter(t => !t.agentId?.startsWith('test-') && !t.customerId?.startsWith('test-'))
  return { real, test }
}

export async function listTransactionsByAgent(agentId: string): Promise<Transaction[]> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
  if (error) return []
  return data.map(mapTransactionRow)
}

export async function listTransactionsByCustomer(customerId: string): Promise<Transaction[]> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) return []
  return data.map(mapTransactionRow)
}

export async function listTransactionsByTier(tier: 'd2d' | 'premier', _testOnly?: boolean): Promise<Transaction[]> {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('customer_tier', tier)
    .order('created_at', { ascending: false })
  if (error) return []
  return data.map(mapTransactionRow)
}

export async function deleteTransaction(id: string): Promise<void> {
  await supabaseAdmin.from('transactions').delete().eq('id', id)
}

// ── Float Requests ──────────────────────────────────────────────────────────

export async function getFloatRequest(id: string): Promise<FloatRequest | null> {
  const { data, error } = await supabaseAdmin
    .from('float_requests')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return mapFloatRequestRow(data)
}

export async function saveFloatRequest(req: FloatRequest): Promise<void> {
  const { error } = await supabaseAdmin
    .from('float_requests')
    .upsert({
      id: req.id,
      agent_id: req.agentId,
      amount: req.amount,
      status: req.status,
      created_at: req.createdAt,
      updated_at: req.updatedAt,
      notes: req.notes || null,
      is_test_account: req.agentId.startsWith('test-'),
    } as any)
  if (error) throw error
}

export async function listFloatRequests(testOnly?: boolean): Promise<FloatRequest[]> {
  let query = supabaseAdmin.from('float_requests').select('*')
  if (testOnly) query = query.eq('is_test_account', true)
  else query = query.eq('is_test_account', false)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return []
  return data.map(mapFloatRequestRow)
}

export async function listAllFloatRequests(): Promise<{ real: FloatRequest[]; test: FloatRequest[] }> {
  const [real, test] = await Promise.all([listFloatRequests(false), listFloatRequests(true)])
  return { real, test }
}

export async function listFloatRequestsByAgent(agentId: string): Promise<FloatRequest[]> {
  const { data, error } = await supabaseAdmin
    .from('float_requests')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
  if (error) return []
  return data.map(mapFloatRequestRow)
}

export async function deleteFloatRequest(id: string): Promise<void> {
  await supabaseAdmin.from('float_requests').delete().eq('id', id)
}

// ── Float Exchange (Agent) ───────────────────────────────────────────────────

export async function getFloatExchange(id: string): Promise<FloatExchange | null> {
  const { data, error } = await supabaseAdmin
    .from('float_exchanges')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return mapFloatExchangeRow(data)
}

export async function saveFloatExchange(exchange: FloatExchange): Promise<void> {
  const { error } = await supabaseAdmin
    .from('float_exchanges')
    .upsert({
      id: exchange.id,
      agent_id: exchange.agentId,
      amount: 0,
      status: exchange.status,
      created_at: exchange.createdAt,
      updated_at: exchange.updatedAt,
      notes: exchange.additionalNotes || null,
      is_test_account: exchange.agentId.startsWith('test-'),
    } as any)
  if (error) throw error
}

export async function listFloatExchanges(testOnly?: boolean): Promise<FloatExchange[]> {
  let query = supabaseAdmin.from('float_exchanges').select('*')
  if (testOnly) query = query.eq('is_test_account', true)
  else query = query.eq('is_test_account', false)
  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) return []
  return data.map(mapFloatExchangeRow)
}

export async function listAllFloatExchanges(): Promise<{ real: FloatExchange[]; test: FloatExchange[] }> {
  const [real, test] = await Promise.all([listFloatExchanges(false), listFloatExchanges(true)])
  return { real, test }
}

export async function listFloatExchangesByAgent(agentId: string): Promise<FloatExchange[]> {
  const { data, error } = await supabaseAdmin
    .from('float_exchanges')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })
  if (error) return []
  return data.map(mapFloatExchangeRow)
}

export async function deleteFloatExchange(id: string): Promise<void> {
  await supabaseAdmin.from('float_exchanges').delete().eq('id', id)
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

// ── Test data cleanup ────────────────────────────────────────────────────────

export async function clearAllTestData(): Promise<void> {
  await Promise.all([
    supabaseAdmin.from('agent_profiles').delete().eq('is_test_account', true),
    supabaseAdmin.from('customer_profiles').delete().eq('is_test_account', true),
    supabaseAdmin.from('transactions').delete().eq('is_on_credit', false), // will filter by test IDs
    supabaseAdmin.from('float_requests').delete().eq('is_test_account', true),
    supabaseAdmin.from('float_exchanges').delete().eq('is_test_account', true),
  ])
}

// ── Row Mappers ──────────────────────────────────────────────────────────────

function mapAgentRow(row: any): AgentProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || '',
    nationalId: row.national_id || '',
    address: row.address || '',
    businessName: row.business_name || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    floatBalance: Number(row.float_balance) || 0,
    commissionRate: Number(row.commission_rate) || 2.5,
    commissionEarned: Number(row.commission_earned) || 0,
    isTestAccount: row.is_test_account || false,
    adminRequestedBy: row.admin_requested_by || undefined,
  }
}

function mapCustomerRow(row: any): CustomerProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || '',
    nationalId: row.national_id || '',
    address: row.address || '',
    tier: row.tier,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    walletBalance: Number(row.wallet_balance) || 0,
    creditLimit: Number(row.credit_limit) || 0,
    creditUsed: Number(row.credit_used) || 0,
    assignedAgentId: row.assigned_agent_id || undefined,
    isTestAccount: row.is_test_account || false,
    adminRequestedBy: row.admin_requested_by || undefined,
  }
}

function mapTransactionRow(row: any): Transaction {
  return {
    id: row.id,
    agentId: row.agent_id || '',
    agentName: row.agent_name || '',
    customerId: row.customer_id || '',
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    customerTier: row.customer_tier || 'd2d',
    serviceType: row.service_type || 'all_payments',
    provider: row.provider,
    amount: Number(row.amount) || 0,
    paymentMethod: row.payment_method || (row.is_on_credit ? 'oc' : 'cod'),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: row.notes || undefined,
    subscriptionNumber: row.subscription_number || undefined,
    meterNumber: row.meter_number || undefined,
    controlNumber: row.control_number || undefined,
    referenceNumber: row.reference_number || undefined,
    smartcardNumber: row.smartcard_number || undefined,
    cashDirection: row.cash_direction || undefined,
    carrierNetwork: row.carrier_network || undefined,
    transactionDirection: row.transaction_direction || undefined,
    utilityBillType: row.utility_bill_type || undefined,
    allPaymentType: row.all_payment_type || undefined,
    isOnCredit: row.is_on_credit || false,
  }
}

function mapFloatRequestRow(row: any): FloatRequest {
  return {
    id: row.id,
    agentId: row.agent_id || '',
    agentName: '',
    amount: Number(row.amount) || 0,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: row.notes || undefined,
  }
}

function mapFloatExchangeRow(row: any): FloatExchange {
  return {
    id: row.id,
    agentId: row.agent_id || '',
    agentName: '',
    superAgentDepCode: '',
    carrierType: 'M-Pesa',
    agentCode: '',
    agentDepReceivingCode: '',
    referenceCode: '',
    additionalNotes: row.notes || undefined,
    status: row.status,
    rejectionReason: undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ── Registration Alerts ─────────────────────────────────────────────────────

export async function listRegistrationAlerts(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('registration_alerts')
    .select('*')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map(row => ({
    id: row.id,
    type: row.type,
    name: row.name,
    email: row.email,
    tier: row.tier,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
    isTestAccount: row.is_test_account,
    adminRequestedBy: row.admin_requested_by,
  }))
}

export async function saveRegistrationAlert(alert: any): Promise<void> {
  const { error } = await supabaseAdmin
    .from('registration_alerts')
    .upsert({
      id: alert.id,
      type: alert.type,
      name: alert.name,
      email: alert.email,
      tier: alert.tier || null,
      message: alert.message,
      is_read: alert.isRead || alert.read || false,
      created_at: alert.createdAt,
      is_test_account: alert.isTestAccount || false,
      admin_requested_by: alert.adminRequestedBy || null,
    })
  if (error) throw error
}

export async function markAlertRead(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('registration_alerts')
    .update({ is_read: true })
    .eq('id', id)
  if (error) throw error
}

export async function clearAllAlerts(): Promise<void> {
  const { error } = await supabaseAdmin
    .from('registration_alerts')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) console.error('Failed to clear alerts:', error)
}

// ── public.users (Supabase table) ─────────────────────────────────────────────

/** Rows from `public.users`. Shape depends on your Supabase schema. */
export async function listUsers(): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabaseAdmin.from('users').select('*')
  if (error) throw new Error(error.message)
  return (data ?? []) as Record<string, unknown>[]
}

export type ResolvedAccess = {
  role: 'admin' | 'agent' | 'customer' | 'test' | 'guest'
  approved: boolean
}

export async function resolveAccessByEmail(email: string): Promise<ResolvedAccess> {
  const normalized = email.trim().toLowerCase()

  const admin = getSupabaseAdminOrThrow()
  if (!admin) {
    console.warn('Supabase admin not available, defaulting to guest')
    return { role: 'guest', approved: false }
  }

  const { data: appUser } = await admin
    .from('app_users')
    .select('role')
    .eq('email', normalized)
    .maybeSingle()

  const appRole = (appUser?.role ?? '').toLowerCase()
  if (appRole === 'admin' || appRole === 'test') {
    return { role: appRole, approved: true }
  }

  const { data: customer } = await admin
    .from('customer_profiles')
    .select('status')
    .eq('email', normalized)
    .maybeSingle()
  if (customer) {
    const approved = (customer.status ?? '').toLowerCase() === 'approved'
    return { role: approved ? 'customer' : 'guest', approved }
  }

  const { data: agent } = await admin
    .from('agent_profiles')
    .select('status')
    .eq('email', normalized)
    .maybeSingle()
  if (agent) {
    const approved = (agent.status ?? '').toLowerCase() === 'approved'
    return { role: approved ? 'agent' : 'guest', approved }
  }

  return { role: 'guest', approved: false }
}

// ── App Users ───────────────────────────────────────────────────────────────

export async function listAppUsers(): Promise<any[]> {
  const { data, error } = await supabaseAdmin
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: true })
  if (error || !data) return []
  return data.map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    profilePicture: row.profile_picture,
    password: row.password,
    createdAt: row.created_at,
  }))
}

export async function saveAppUser(user: any): Promise<void> {
  const { error } = await supabaseAdmin
    .from('app_users')
    .upsert({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile_picture: user.profilePicture || null,
      password: user.password || null,
      created_at: user.createdAt,
    })
  if (error) throw error
}

export async function deleteAppUser(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from('app_users').delete().eq('id', id)
  if (error) throw error
}

// ── App Settings ─────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<any> {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('*')
    .eq('key', key)
    .single()
  if (error || !data) return null
  return data.value
}

export async function saveSetting(key: string, value: any): Promise<void> {
  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw error
}
