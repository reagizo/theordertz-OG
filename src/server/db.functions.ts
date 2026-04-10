import { createServerFn } from '@tanstack/react-start'
import type {
  AgentProfile,
  CustomerProfile,
  Transaction,
  FloatRequest,
  FloatExchange,
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
  deleteAgent,
  deleteCustomer,
  deleteTransaction,
  deleteFloatRequest,
  deleteFloatExchange,
  clearAllTestData,
  listRegistrationAlerts,
  saveRegistrationAlert,
  markAlertRead,
  clearAllAlerts,
  listAppUsers,
  saveAppUser,
  deleteAppUser,
  getSetting,
  saveSetting,
  listUsers,
  resolveAccessByEmail,
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

// ── Settings Functions ──────────────────────────────────────────────────────

export const getSettingFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { key: string }) => data)
  .handler(({ data }) => getSetting(data.key))

export const saveSettingFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { key: string; value: unknown }) => data)
  .handler(({ data }) => saveSetting(data.key, data.value))

// ── Registration Alerts Functions ────────────────────────────────────────────

export const listRegistrationAlertsFn = createServerFn().handler(() => listRegistrationAlerts())

export const saveRegistrationAlertFn = createServerFn({ method: 'POST' })
  .handler(({ data }) => saveRegistrationAlert(data))

export const markAlertReadFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => markAlertRead(data.id))

export const clearAllAlertsFn = createServerFn({ method: 'POST' })
  .handler(() => clearAllAlerts())

export const resolveAccessByEmailFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { email: string }) => data)
  .handler(({ data }) => resolveAccessByEmail(data.email))

// ── App Users Functions ──────────────────────────────────────────────────────

export const listUsersFn = createServerFn().handler(() => listUsers())

export const listAppUsersFn = createServerFn().handler(() => listAppUsers())

export const getAppUserByEmailFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { email: string }) => data)
  .handler(({ data }) => getAppUserByEmail(data.email))

export const saveAppUserFn = createServerFn({ method: 'POST' })
  .handler(({ data }) => saveAppUser(data))

export const deleteAppUserFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => deleteAppUser(data.id))

// ── Super Agent Functions ──────────────────────────────────────────────────────

export const listSuperAgentsFn = createServerFn().handler(() => listSuperAgents())

export const getSuperAgentProfileFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => getSuperAgentProfile(data.id))

export const saveSuperAgentProfileFn = createServerFn({ method: 'POST' })
  .handler(({ data }) => saveSuperAgentProfile(data))

export const deleteSuperAgentFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: string }) => data)
  .handler(({ data }) => deleteSuperAgent(data.id))
