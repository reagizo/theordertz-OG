export type UserRole = 'admin' | 'supervisor' | 'clerk' | 'agent' | 'customer' | 'test' | 'guest'
export type CustomerTier = 'd2d' | 'premier'
export type Status = 'pending' | 'approved' | 'rejected'
export type ServiceType = 'cash_send' | 'cash_withdrawal' | 'utility_bills' | 'airtime_bundle' | 'tv_subscriptions' | 'internet_subscriptions' | 'all_payments'
export type PaymentMethod = 'cod' | 'oc'
export type CarrierType = 'AzamPesa' | 'Airtel Money' | 'Mixx By Yas' | 'M-Pesa' | 'HaloPesa' | 'SelcomPay' | 'TTCLPesa'
export type CashDirection = 'send' | 'withdrawal'
export type TransactionDirection = 'own' | 'someone_else'
export type AllPaymentType = 'government' | 'electricity' | 'control_number'
export type GovernmentProvider = 'DAWASA' | 'TRA' | 'NSSF' | 'WCF' | 'BRELA' | 'TANROADS' | 'TANAPA' | 'Other'
export type ElectricityProvider = 'LUKU' | 'TUKUZA' | 'TANESCO Prepaid' | 'TANESCO Postpaid' | 'Zanzibar Electricity'
export type UtilityBillType = 'airtime_bundle' | 'tv_subscriptions' | 'internet_subscriptions'
export type AirtimeProvider = 'Yas' | 'Vodacom' | 'Airtel' | 'Halotel' | 'TTCL'
export type TVProvider = 'AZAM TV' | 'DSTV' | 'ZUKU' | 'Star Times'
export type CarrierNetwork = 'Mixx By Yas' | 'M-Pesa' | 'Airtel Money' | 'HaloPesa' | 'T-Pesa'

export const CARRIER_CODES: Record<CarrierType, string> = {
  'AzamPesa': '042671',
  'Airtel Money': '1114688',
  'Mixx By Yas': '769725',
  'M-Pesa': '242763',
  'HaloPesa': '555459',
  'SelcomPay': '60835379',
  'TTCLPesa': '',
}

export const CARRIER_TYPES: CarrierType[] = Object.keys(CARRIER_CODES) as CarrierType[]

export const AIRTIME_PROVIDERS: AirtimeProvider[] = ['Yas', 'Vodacom', 'Airtel', 'Halotel', 'TTCL']
export const TV_PROVIDERS: TVProvider[] = ['AZAM TV', 'DSTV', 'ZUKU', 'Star Times']
export const CARRIER_NETWORKS: CarrierNetwork[] = ['Mixx By Yas', 'M-Pesa', 'Airtel Money', 'HaloPesa', 'T-Pesa']
export const UTILITY_BILL_TYPES: UtilityBillType[] = ['airtime_bundle', 'tv_subscriptions', 'internet_subscriptions']
export const ALL_PAYMENT_TYPES: AllPaymentType[] = ['government', 'electricity', 'control_number']
export const GOVERNMENT_PROVIDERS: GovernmentProvider[] = ['DAWASA', 'TRA', 'NSSF', 'WCF', 'BRELA', 'TANROADS', 'TANAPA', 'Other']
export const ELECTRICITY_PROVIDERS: ElectricityProvider[] = ['LUKU', 'TUKUZA', 'TANESCO Prepaid', 'TANESCO Postpaid', 'Zanzibar Electricity']

export interface Transaction {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  customerTier: CustomerTier
  agentId: string
  agentName: string
  serviceType: ServiceType
  provider: string
  amount: number
  paymentMethod: PaymentMethod
  status: Status
  createdAt: string
  updatedAt: string
  notes?: string
  subscriptionNumber?: string
  meterNumber?: string
  controlNumber?: string
  referenceNumber?: string
  smartcardNumber?: string
  cashDirection?: CashDirection
  carrierNetwork?: CarrierNetwork
  transactionDirection?: TransactionDirection
  utilityBillType?: UtilityBillType
  allPaymentType?: AllPaymentType
  isOnCredit?: boolean
}

export interface FloatExchange {
  id: string
  agentId: string
  agentName: string
  superAgentDepCode: string
  carrierType: CarrierType
  agentCode: string
  agentDepReceivingCode: string
  referenceCode: string
  additionalNotes?: string
  status: Status
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface AgentProfile {
  id: string
  fullName: string
  email: string
  phone: string
  nationalId: string
  address: string
  businessName?: string
  status: Status
  createdAt: string
  updatedAt: string
  floatBalance: number
  commissionRate: number
  commissionEarned: number
  isTestAccount?: boolean
  adminRequestedBy?: string
  assignedSuperAgentId?: string
}

export interface SuperAgentProfile {
  id: string
  fullName: string
  email: string
  phone: string
  status: 'active' | 'inactive' | 'pending'
  createdAt: string
  updatedAt: string
  isTestAccount?: boolean
  adminRequestedBy?: string
  profilePicture?: string
  userId?: string
}

export interface CustomerProfile {
  id: string
  fullName: string
  email: string
  phone: string
  nationalId: string
  address: string
  tier: CustomerTier
  status: Status
  createdAt: string
  updatedAt: string
  walletBalance: number
  creditLimit: number
  creditUsed: number
  assignedAgentId?: string
  isTestAccount?: boolean
  adminRequestedBy?: string
}

export interface CreditPortfolio {
  customerId: string
  customerName: string
  customerTier: CustomerTier
  creditLimit: number
  creditUsed: number
  creditAvailable: number
  totalTransactions: number
  totalOnCredit: number
  totalPaid: number
  outstandingBalance: number
  transactions: Transaction[]
}

export interface FloatRequest {
  id: string
  agentId: string
  agentName: string
  amount: number
  status: Status
  createdAt: string
  updatedAt: string
  notes?: string
  adminNotes?: string
}

export interface Notification {
  id: string
  userId: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: string
}

export interface RbacPolicy {
  role: string
  permissions: string[]
  restrictions: string[]
  responsibilities: string[]
}

export interface AccessLogEntry {
  timestamp: string
  userId: string
  role: string
  action: string
  resource: string
  allowed: boolean
  details?: string
}

export interface RbacPolicy {
  role: string
  permissions: string[]
  restrictions: string[]
  responsibilities: string[]
}

export interface AccessLogEntry {
  timestamp: string
  userId: string
  role: string
  action: string
  resource: string
  allowed: boolean
  details?: string
}
