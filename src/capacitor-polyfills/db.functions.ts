// Capacitor-compatible data functions using localStorage instead of server functions
import type {
  AgentProfile,
  CustomerProfile,
  Transaction,
  FloatRequest,
  FloatExchange,
  CreditPortfolio,
  VendorProfile,
} from '@/lib/types'

// Helper to get/set localStorage safely
const getStore = (key: string): any[] => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const setStore = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data))
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

// ── Agent Functions ──────────────────────────────────────────────────────────

export const getAgentProfileFn = async (data: { id: string }) => {
  const agents = getStore('agents')
  return agents.find((a: AgentProfile) => a.id === data.id) || null
}

export const saveAgentProfileFn = async (data: AgentProfile) => {
  const agents = getStore('agents')
  const idx = agents.findIndex((a: AgentProfile) => a.id === data.id)
  if (idx >= 0) agents[idx] = data
  else agents.push({ ...data, id: data.id || generateId() })
  setStore('agents', agents)
  return data
}

export const listAgentsFn = async () => getStore('agents')

export const listAllAgentsFn = async () => getStore('agents')

// ── Customer Functions ───────────────────────────────────────────────────────

export const getCustomerProfileFn = async (data: { id: string }) => {
  const customers = getStore('customers')
  return customers.find((c: CustomerProfile) => c.id === data.id) || null
}

export const saveCustomerProfileFn = async (data: CustomerProfile) => {
  const customers = getStore('customers')
  const idx = customers.findIndex((c: CustomerProfile) => c.id === data.id)
  if (idx >= 0) customers[idx] = data
  else customers.push({ ...data, id: data.id || generateId() })
  setStore('customers', customers)
  return data
}

export const listCustomersFn = async () => getStore('customers')

export const listAllCustomersFn = async () => getStore('customers')

export const listCustomersByTierFn = async (data: { tier: 'd2d' | 'premier' }) => {
  return getStore('customers').filter((c: CustomerProfile) => c.tier === data.tier)
}

// ── Transaction Functions ────────────────────────────────────────────────────

export const getTransactionFn = async (data: { id: string }) => {
  const txns = getStore('transactions')
  return txns.find((t: Transaction) => t.id === data.id) || null
}

export const saveTransactionFn = async (data: Transaction) => {
  const txns = getStore('transactions')
  const idx = txns.findIndex((t: Transaction) => t.id === data.id)
  if (idx >= 0) txns[idx] = data
  else txns.push({ ...data, id: data.id || generateId() })
  setStore('transactions', txns)
  return data
}

export const listTransactionsFn = async () => getStore('transactions')

export const listAllTransactionsFn = async () => getStore('transactions')

export const listTransactionsByAgentFn = async (data: { agentId: string }) => {
  return getStore('transactions').filter((t: Transaction) => t.agentId === data.agentId)
}

export const listTransactionsByCustomerFn = async (data: { customerId: string }) => {
  return getStore('transactions').filter((t: Transaction) => t.customerId === data.customerId)
}

export const listTransactionsByTierFn = async (data: { tier: 'd2d' | 'premier' }) => {
  const customers = getStore('customers').filter((c: CustomerProfile) => c.tier === data.tier)
  const customerIds = customers.map((c: CustomerProfile) => c.id)
  return getStore('transactions').filter((t: Transaction) => customerIds.includes(t.customerId))
}

// ── Float Request Functions ──────────────────────────────────────────────────

export const getFloatRequestFn = async (data: { id: string }) => {
  const requests = getStore('floatRequests')
  return requests.find((r: FloatRequest) => r.id === data.id) || null
}

export const saveFloatRequestFn = async (data: FloatRequest) => {
  const requests = getStore('floatRequests')
  const idx = requests.findIndex((r: FloatRequest) => r.id === data.id)
  if (idx >= 0) requests[idx] = data
  else requests.push({ ...data, id: data.id || generateId() })
  setStore('floatRequests', requests)
  return data
}

export const listFloatRequestsFn = async () => getStore('floatRequests')

export const listAllFloatRequestsFn = async () => getStore('floatRequests')

export const listFloatRequestsByAgentFn = async (data: { agentId: string }) => {
  return getStore('floatRequests').filter((r: FloatRequest) => r.agentId === data.agentId)
}

// ── Float Exchange Functions ─────────────────────────────────────────────────

export const getFloatExchangeFn = async (data: { id: string }) => {
  const exchanges = getStore('floatExchanges')
  return exchanges.find((e: FloatExchange) => e.id === data.id) || null
}

export const saveFloatExchangeFn = async (data: FloatExchange) => {
  const exchanges = getStore('floatExchanges')
  const idx = exchanges.findIndex((e: FloatExchange) => e.id === data.id)
  if (idx >= 0) exchanges[idx] = data
  else exchanges.push({ ...data, id: data.id || generateId() })
  setStore('floatExchanges', exchanges)
  return data
}

export const listFloatExchangesFn = async () => getStore('floatExchanges')

export const listAllFloatExchangesFn = async () => getStore('floatExchanges')

export const listFloatExchangesByAgentFn = async (data: { agentId: string }) => {
  return getStore('floatExchanges').filter((e: FloatExchange) => e.agentId === data.agentId)
}

// ── Credit Portfolio Functions ───────────────────────────────────────────────

export const getCreditPortfolioFn = async (data: { customerId: string }) => {
  const portfolios = getStore('creditPortfolios')
  return portfolios.find((p: CreditPortfolio) => p.customerId === data.customerId) || null
}

export const listCreditPortfoliosFn = async () => getStore('creditPortfolios')

// ── Admin-only Deletion Functions ────────────────────────────────────────────

export const deleteAgentFn = async (data: { id: string }) => {
  const agents = getStore('agents').filter((a: AgentProfile) => a.id !== data.id)
  setStore('agents', agents)
  return { success: true }
}

export const deleteCustomerFn = async (data: { id: string }) => {
  const customers = getStore('customers').filter((c: CustomerProfile) => c.id !== data.id)
  setStore('customers', customers)
  return { success: true }
}

export const deleteTransactionFn = async (data: { id: string }) => {
  const txns = getStore('transactions').filter((t: Transaction) => t.id !== data.id)
  setStore('transactions', txns)
  return { success: true }
}

export const deleteFloatRequestFn = async (data: { id: string }) => {
  const requests = getStore('floatRequests').filter((r: FloatRequest) => r.id !== data.id)
  setStore('floatRequests', requests)
  return { success: true }
}

export const deleteFloatExchangeFn = async (data: { id: string }) => {
  const exchanges = getStore('floatExchanges').filter((e: FloatExchange) => e.id !== data.id)
  setStore('floatExchanges', exchanges)
  return { success: true }
}

export const clearAllTestDataFn = async () => {
  localStorage.removeItem('agents')
  localStorage.removeItem('customers')
  localStorage.removeItem('transactions')
  localStorage.removeItem('floatRequests')
  localStorage.removeItem('floatExchanges')
  localStorage.removeItem('creditPortfolios')
  localStorage.removeItem('vendors')
  return { success: true }
}

// ── Vendor Functions ───────────────────────────────────────────────────────────

export const listVendorsFn = async () => getStore('vendors')

export const listAllVendorsFn = async () => getStore('vendors')

export const listVendorsByStatusFn = async (data: { status: 'pending' | 'approved' | 'rejected' }) => {
  return getStore('vendors').filter((v: VendorProfile) => v.status === data.status)
}

export const getVendorProfileFn = async (data: { id: string }) => {
  const vendors = getStore('vendors')
  return vendors.find((v: VendorProfile) => v.id === data.id) || null
}

export const saveVendorProfileFn = async (data: VendorProfile) => {
  const vendors = getStore('vendors')
  const idx = vendors.findIndex((v: VendorProfile) => v.id === data.id)
  if (idx >= 0) vendors[idx] = data
  else vendors.push({ ...data, id: data.id || generateId() })
  setStore('vendors', vendors)
  return data
}

export const deleteVendorFn = async (data: { id: string }) => {
  const vendors = getStore('vendors').filter((v: VendorProfile) => v.id !== data.id)
  setStore('vendors', vendors)
  return { success: true }
}

export const syncVendorsToSupabaseFn = async () => {
  return { success: true, synced: 0 }
}
