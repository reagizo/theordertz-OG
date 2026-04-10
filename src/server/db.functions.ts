import { createServerFn } from '@tanstack/react-start'
import type {
  AgentProfile,
  CustomerProfile,
  Transaction,
  FloatRequest,
  FloatExchange,
  VendorProfile,
} from '@/lib/types'
import {
  getAgentProfile,
  saveAgentProfile,
  listAgents,
  listAllAgents,
  getCustomerProfile,
  saveCustomerProfile,
  listCustomers,
  listAllCustomers,
  listCustomersByTier,
  getTransaction,
  saveTransaction,
  listTransactions,
  listAllTransactions,
  listTransactionsByAgent,
  listTransactionsByCustomer,
  listTransactionsByTier,
  getFloatRequest,
  saveFloatRequest,
  listFloatRequests,
  listAllFloatRequests,
  listFloatRequestsByAgent,
  getFloatExchange,
  saveFloatExchange,
  listFloatExchanges,
  listAllFloatExchanges,
  listFloatExchangesByAgent,
  getCreditPortfolio,
  listCreditPortfolios,
  getVendorProfile,
  saveVendorProfile,
  listVendors,
  listAllVendors,
  listVendorsByStatus,
  deleteAgent,
  deleteCustomer,
  deleteTransaction,
  deleteFloatRequest,
  deleteFloatExchange,
  deleteVendor,
  clearAllTestData,
} from '@/server/db.server'

// ── Agent Functions ──────────────────────────────────────────────────────────

export const getAgentProfileFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => getAgentProfile(data.id))

export const saveAgentProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((data: AgentProfile) => data)
  .handler(({ data }) => saveAgentProfile(data))

export const listAgentsFn = createServerFn().handler(() => listAgents())

export const listAllAgentsFn = createServerFn().handler(() => listAllAgents())

// ── Customer Functions ───────────────────────────────────────────────────────

export const getCustomerProfileFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => getCustomerProfile(data.id))

export const saveCustomerProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((data: CustomerProfile) => data)
  .handler(({ data }) => saveCustomerProfile(data))

export const listCustomersFn = createServerFn().handler(() => listCustomers())

export const listAllCustomersFn = createServerFn().handler(() => listAllCustomers())

export const listCustomersByTierFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { tier: 'd2d' | 'premier' }) => data)
  .handler(({ data }) => listCustomersByTier(data.tier))

// ── Transaction Functions ────────────────────────────────────────────────────

export const getTransactionFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => getTransaction(data.id))

export const saveTransactionFn = createServerFn({ method: 'POST' })
  .inputValidator((data: Transaction) => data)
  .handler(({ data }) => saveTransaction(data))

export const listTransactionsFn = createServerFn().handler(() => listTransactions())

export const listAllTransactionsFn = createServerFn().handler(() => listAllTransactions())

export const listTransactionsByAgentFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { agentId: string }) => data)
  .handler(({ data }) => listTransactionsByAgent(data.agentId))

export const listTransactionsByCustomerFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { customerId: string }) => data)
  .handler(({ data }) => listTransactionsByCustomer(data.customerId))

export const listTransactionsByTierFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { tier: 'd2d' | 'premier' }) => data)
  .handler(({ data }) => listTransactionsByTier(data.tier))

// ── Float Request Functions ──────────────────────────────────────────────────

export const getFloatRequestFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => getFloatRequest(data.id))

export const saveFloatRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((data: FloatRequest) => data)
  .handler(({ data }) => saveFloatRequest(data))

export const listFloatRequestsFn = createServerFn().handler(() => listFloatRequests())

export const listAllFloatRequestsFn = createServerFn().handler(() => listAllFloatRequests())

export const listFloatRequestsByAgentFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { agentId: string }) => data)
  .handler(({ data }) => listFloatRequestsByAgent(data.agentId))

// ── Float Exchange Functions ─────────────────────────────────────────────────

export const getFloatExchangeFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => getFloatExchange(data.id))

export const saveFloatExchangeFn = createServerFn({ method: 'POST' })
  .inputValidator((data: FloatExchange) => data)
  .handler(({ data }) => saveFloatExchange(data))

export const listFloatExchangesFn = createServerFn().handler(() => listFloatExchanges())

export const listAllFloatExchangesFn = createServerFn().handler(() => listAllFloatExchanges())

export const listFloatExchangesByAgentFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { agentId: string }) => data)
  .handler(({ data }) => listFloatExchangesByAgent(data.agentId))

// ── Credit Portfolio Functions ───────────────────────────────────────────────

export const getCreditPortfolioFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { customerId: string }) => data)
  .handler(({ data }) => getCreditPortfolio(data.customerId))

export const listCreditPortfoliosFn = createServerFn().handler(() => listCreditPortfolios())

// ── Admin-only Deletion Functions ────────────────────────────────────────────
// These should only be called from admin-authenticated contexts.

export const deleteAgentFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => deleteAgent(data.id))

export const deleteCustomerFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => deleteCustomer(data.id))

export const deleteTransactionFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => deleteTransaction(data.id))

export const deleteFloatRequestFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => deleteFloatRequest(data.id))

export const deleteFloatExchangeFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => deleteFloatExchange(data.id))

export const clearAllTestDataFn = createServerFn({ method: 'POST' })
  .handler(() => clearAllTestData())

// ── Vendor Functions ────────────────────────────────────────────────────────

export const getVendorProfileFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => getVendorProfile(data.id))

export const saveVendorProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((data: VendorProfile) => data)
  .handler(({ data }) => saveVendorProfile(data))

export const listVendorsFn = createServerFn().handler(() => listVendors())

export const listAllVendorsFn = createServerFn().handler(() => listAllVendors())

export const listVendorsByStatusFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { status: 'pending' | 'approved' | 'rejected' }) => data)
  .handler(({ data }) => listVendorsByStatus(data.status))

export const deleteVendorFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => deleteVendor(data.id))
