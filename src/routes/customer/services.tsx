import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { saveTransactionFn, listAgentsFn, getCustomerProfileFn } from '@/server/db.functions'
import { generateId, formatTZS } from '@/lib/utils'
import type {
  ServiceType,
  PaymentMethod,
  AgentProfile,
  CustomerProfile,
  CashDirection,
  TransactionDirection,
  UtilityBillType,
  AllPaymentType,
  AirtimeProvider,
  TVProvider,
  CarrierNetwork,
  GovernmentProvider,
  ElectricityProvider,
} from '@/lib/types'
import {
  AIRTIME_PROVIDERS,
  TV_PROVIDERS,
  CARRIER_NETWORKS,
  GOVERNMENT_PROVIDERS,
  ELECTRICITY_PROVIDERS,
} from '@/lib/types'
import { Zap, Send, FileText } from 'lucide-react'

export const Route = createFileRoute('/customer/services')({
  loader: async () => {
    try {
      return await listAgentsFn()
    } catch (err) {
      console.error('Services loader error:', err)
      return []
    }
  },
  component: CustomerServices,
})

const SERVICE_OPTIONS = [
  { type: 'cash' as const, label: 'Cash Services', icon: Send, description: 'Cash Send & Cash Withdrawal' },
  { type: 'utility_bills' as const, label: 'Utility Bills/Services', icon: Zap, description: 'Airtime, TV, Internet & more' },
  { type: 'all_payments' as const, label: 'All Payment Bills', icon: FileText, description: 'Government, Electricity, Control #' },
]

function CustomerServices() {
  const { user } = useAuth()
  const agents = Route.useLoaderData() as AgentProfile[]
  const approvedAgents = agents.filter(a => a.status === 'approved')

  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedService, setSelectedService] = useState<typeof SERVICE_OPTIONS[number] | null>(null)
  const [form, setForm] = useState({
    amount: '',
    paymentMethod: 'cod' as PaymentMethod,
    agentId: approvedAgents[0]?.id ?? '',
    notes: '',
    cashType: '' as 'send' | 'withdrawal' | '',
    cashDirection: '' as CashDirection | '',
    carrierNetwork: '' as CarrierNetwork | '',
    transactionDirection: '' as TransactionDirection | '',
    utilityBillType: '' as UtilityBillType | '',
    airtimeProvider: '' as AirtimeProvider | '',
    tvProvider: '' as TVProvider | '',
    allPaymentType: '' as AllPaymentType | '',
    governmentProvider: '' as GovernmentProvider | '',
    electricityProvider: '' as ElectricityProvider | '',
    controlNumber: '',
    referenceNumber: '',
    meterNumber: '',
    smartcardNumber: '',
    provider: '',
    subscriptionNumber: '',
    isOnCredit: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user?.id) {
      getCustomerProfileFn({ data: { id: user.id } }).then(setCustomer)
    }
  }, [user?.id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target
    const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value
    const name = target.name

    if (name === 'utilityBillType') {
      setForm(f => ({ ...f, utilityBillType: value as UtilityBillType, airtimeProvider: '', tvProvider: '', smartcardNumber: '', provider: '', subscriptionNumber: '' }))
      return
    }
    if (name === 'allPaymentType') {
      setForm(f => ({ ...f, allPaymentType: value as AllPaymentType, governmentProvider: '', electricityProvider: '', controlNumber: '', meterNumber: '', referenceNumber: '', subscriptionNumber: '', amount: '' }))
      return
    }
    if (name === 'cashType') {
      setForm(f => ({ ...f, cashType: value as 'send' | 'withdrawal', transactionDirection: '' }))
      return
    }
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseInt(form.amount.replace(/,/g, ''), 10)
    if (!amt || amt < 1000) { setError('Minimum amount is TZS 1,000'); return }
    if (!user?.id) return
    if (form.isOnCredit && customer?.tier === 'premier') {
      if (amt > (customer.creditLimit - customer.creditUsed)) { setError('Amount exceeds your available credit limit'); return }
    }
    setLoading(true)
    setError('')
    try {
      const agent = agents.find(a => a.id === form.agentId)
      const now = new Date().toISOString()
      let serviceType: ServiceType
      let provider = form.provider

      if (selectedService!.type === 'cash') {
        serviceType = form.cashType === 'send' ? 'cash_send' : 'cash_withdrawal'
        provider = form.cashType === 'send' ? 'Cash Send' : 'Cash Withdrawal'
      } else if (selectedService!.type === 'utility_bills' && form.utilityBillType) {
        if (form.utilityBillType === 'airtime_bundle') { serviceType = 'airtime_bundle'; provider = form.airtimeProvider }
        else if (form.utilityBillType === 'tv_subscriptions') { serviceType = 'tv_subscriptions'; provider = form.tvProvider }
        else { serviceType = 'internet_subscriptions'; provider = form.provider }
      } else if (selectedService!.type === 'all_payments' && form.allPaymentType) {
        if (form.allPaymentType === 'government') { serviceType = 'all_payments'; provider = form.governmentProvider }
        else if (form.allPaymentType === 'electricity') { serviceType = 'all_payments'; provider = form.electricityProvider }
        else { serviceType = 'all_payments'; provider = 'Control Number' }
      } else {
        serviceType = 'all_payments'; provider = form.provider
      }

      await saveTransactionFn({
        data: {
          id: generateId(),
          customerId: user.id,
          customerName: customer?.fullName ?? user.user_metadata?.full_name ?? user.email ?? 'Customer',
          customerPhone: customer?.phone ?? '',
          customerTier: customer?.tier ?? 'd2d',
          agentId: form.agentId,
          agentName: agent?.fullName ?? 'Assigned Agent',
          serviceType,
          provider,
          amount: amt,
          paymentMethod: form.isOnCredit ? 'oc' : form.paymentMethod,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
          subscriptionNumber: form.subscriptionNumber || undefined,
          meterNumber: form.meterNumber || undefined,
          controlNumber: form.controlNumber || undefined,
          referenceNumber: form.referenceNumber || undefined,
          smartcardNumber: form.smartcardNumber || undefined,
          cashDirection: form.cashDirection || undefined,
          carrierNetwork: form.carrierNetwork || undefined,
          transactionDirection: form.transactionDirection || undefined,
          utilityBillType: form.utilityBillType || undefined,
          allPaymentType: form.allPaymentType || undefined,
          isOnCredit: form.isOnCredit || undefined,
          notes: form.notes || undefined,
        },
      })
      setSuccess(true)
    } catch (err: unknown) {
      const e = err as { message?: string }
      console.error('Transaction submission error:', err)
      setError(e?.message ?? 'Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSuccess(false)
    setStep(1)
    setSelectedService(null)
    setForm({
      amount: '', paymentMethod: 'cod', agentId: approvedAgents[0]?.id ?? '', notes: '',
      cashType: '', cashDirection: '', carrierNetwork: '', transactionDirection: '',
      utilityBillType: '', airtimeProvider: '', tvProvider: '',
      allPaymentType: '', governmentProvider: '', electricityProvider: '',
      controlNumber: '', referenceNumber: '', meterNumber: '', smartcardNumber: '',
      provider: '', subscriptionNumber: '', isOnCredit: false,
    })
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-500 text-sm mb-2">Your request has been submitted successfully.</p>
          <p className="text-gray-400 text-xs mb-6">Payment: {form.isOnCredit ? 'On Credit (OC)' : form.paymentMethod === 'cod' ? 'COD' : 'Credit'} — An agent will process shortly.</p>
          <button onClick={resetForm} className="px-5 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-600">New Request</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transaction Request</h1>
        <p className="text-gray-500 text-sm mt-1">{customer?.tier === 'premier' ? 'Premier Customer' : 'Day-to-Day Customer'}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step >= s ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{s}</div>
            <span className={`hidden sm:inline ${step >= s ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{s === 1 ? 'Service' : s === 2 ? 'Details' : 'Confirm'}</span>
            {s < 3 && <div className={`flex-1 h-px w-8 ${step > s ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SERVICE_OPTIONS.map(svc => (
            <button key={svc.label} onClick={() => {
              setSelectedService(svc)
              setForm(f => ({ ...f, provider: '', cashType: '', cashDirection: '', carrierNetwork: '', transactionDirection: '', referenceNumber: '', utilityBillType: '', airtimeProvider: '', tvProvider: '', smartcardNumber: '', allPaymentType: '', governmentProvider: '', electricityProvider: '', controlNumber: '', meterNumber: '', subscriptionNumber: '', amount: '' }))
              setStep(2)
            }} className="bg-white rounded-xl shadow-sm p-5 text-left hover:shadow-md hover:border-green-400 border-2 border-transparent transition-all">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-2"><svc.icon className="w-5 h-5 text-green-600" /></div>
              <p className="font-semibold text-gray-800 text-sm">{svc.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{svc.description}</p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && selectedService && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center"><selectedService.icon className="w-5 h-5 text-green-600" /></div>
            <h3 className="font-semibold text-gray-800">{selectedService.label}</h3>
          </div>
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

          {/* Cash Services */}
          {selectedService.type === 'cash' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type of Service</label>
                <select name="cashType" value={form.cashType} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select...</option>
                  <option value="send">Cash Send</option>
                  <option value="withdrawal">Cash Withdrawal</option>
                </select>
              </div>
              {form.cashType === 'send' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Send To</label>
                  <select name="transactionDirection" value={form.transactionDirection} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select...</option>
                    <option value="own">To Own-Self</option>
                    <option value="someone_else">To Someone Else</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carrier Network</label>
                <select name="carrierNetwork" value={form.carrierNetwork} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select network...</option>
                  {CARRIER_NETWORKS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number or Mobile Number</label>
                <input name="referenceNumber" value={form.referenceNumber} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Enter reference or mobile number" />
              </div>
            </>
          )}

          {/* Utility Bills */}
          {selectedService.type === 'utility_bills' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">If the service chosen will be utility bills</label>
                <select name="utilityBillType" value={form.utilityBillType} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select utility bill type...</option>
                  <option value="airtime_bundle">Airtime/Bundle</option>
                  <option value="tv_subscriptions">TV Subscriptions</option>
                  <option value="internet_subscriptions">Internet Subscriptions</option>
                </select>
              </div>
              {form.utilityBillType === 'airtime_bundle' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Airtime Provider</label>
                  <select name="airtimeProvider" value={form.airtimeProvider} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select provider...</option>
                    {AIRTIME_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              )}
              {form.utilityBillType === 'tv_subscriptions' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TV Provider</label>
                    <select name="tvProvider" value={form.tvProvider} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">Select provider...</option>
                      {TV_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  {form.tvProvider && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Smartcard Number</label>
                      <input name="smartcardNumber" value={form.smartcardNumber} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Enter smartcard number" />
                    </div>
                  )}
                </>
              )}
              {form.utilityBillType === 'internet_subscriptions' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select name="provider" value={form.provider} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">Select provider...</option>
                    <option value="TTCL">TTCL</option><option value="Vodacom">Vodacom</option><option value="Airtel">Airtel</option><option value="Halotel">Halotel</option><option value="ZUKU">ZUKU</option>
                  </select>
                </div>
              )}
              {(form.utilityBillType === 'airtime_bundle' || form.utilityBillType === 'internet_subscriptions') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input name="subscriptionNumber" value={form.subscriptionNumber} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="+255 7XX XXX XXX" />
                </div>
              )}
            </>
          )}

          {/* All Payment Bills */}
          {selectedService.type === 'all_payments' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">If the service chosen will be All Payments</label>
                <select name="allPaymentType" value={form.allPaymentType} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                  <option value="">Select payment type...</option>
                  <option value="government">Government Payments</option>
                  <option value="electricity">Electricity</option>
                  <option value="control_number">Control Number</option>
                </select>
              </div>
              {form.allPaymentType === 'government' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Government Payment Provider</label>
                    <select name="governmentProvider" value={form.governmentProvider} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">Select provider...</option>
                      {GOVERNMENT_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Control Number</label>
                    <input name="controlNumber" value={form.controlNumber} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Enter control number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (TZS)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">TZS</span>
                      <input name="amount" value={form.amount} onChange={handleChange} required className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number (for success SMS)</label>
                    <input name="subscriptionNumber" value={form.subscriptionNumber} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="+255 7XX XXX XXX" />
                  </div>
                </>
              )}
              {form.allPaymentType === 'electricity' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Electricity Provider</label>
                    <select name="electricityProvider" value={form.electricityProvider} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="">Select provider...</option>
                      {ELECTRICITY_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meter Number</label>
                    <input name="meterNumber" value={form.meterNumber} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Enter meter number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (TZS)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">TZS</span>
                      <input name="amount" value={form.amount} onChange={handleChange} required className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number (for success SMS)</label>
                    <input name="subscriptionNumber" value={form.subscriptionNumber} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="+255 7XX XXX XXX" />
                  </div>
                </>
              )}
              {form.allPaymentType === 'control_number' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Control Number</label>
                  <input name="controlNumber" value={form.controlNumber} onChange={handleChange} required className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="Enter control number" />
                </div>
              )}
            </>
          )}

          {/* Amount (for non-government/electricity) */}
          {selectedService.type !== 'all_payments' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (TZS) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">TZS</span>
                <input name="amount" value={form.amount} onChange={handleChange} required className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" placeholder="0" />
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type of Payment</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-start gap-2 p-3 border-2 rounded-lg cursor-pointer ${form.paymentMethod === 'cod' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                <input type="radio" name="paymentMethod" value="cod" checked={form.paymentMethod === 'cod'} onChange={handleChange} className="mt-0.5 accent-green-600" />
                <div><p className="text-sm font-medium text-gray-800">COD (Cash On Delivery)</p><p className="text-xs text-gray-400">Pay when agent arrives</p></div>
              </label>
              <label className={`flex items-start gap-2 p-3 border-2 rounded-lg cursor-pointer ${form.paymentMethod === 'oc' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                <input type="radio" name="paymentMethod" value="oc" checked={form.paymentMethod === 'oc'} onChange={handleChange} className="mt-0.5 accent-green-600" />
                <div><p className="text-sm font-medium text-gray-800">OC (On Credit)</p><p className="text-xs text-gray-400">Pay later from credit</p></div>
              </label>
            </div>
          </div>

          {/* On Credit for Premier */}
          {customer?.tier === 'premier' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" name="isOnCredit" checked={form.isOnCredit} onChange={handleChange} className="mt-0.5 accent-purple-600 w-4 h-4" />
                <div>
                  <p className="text-sm font-medium text-purple-800">Opt on Credit (OC)</p>
                  <p className="text-xs text-purple-600">Available credit: {formatTZS(Math.max(0, (customer.creditLimit || 0) - (customer.creditUsed || 0)))} of {formatTZS(customer.creditLimit || 0)}</p>
                </div>
              </label>
            </div>
          )}

          {/* Agent selection */}
          {approvedAgents.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Agent</label>
              <select name="agentId" value={form.agentId} onChange={handleChange} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                {approvedAgents.map(a => <option key={a.id} value={a.id}>{a.fullName} {a.businessName ? `(${a.businessName})` : ''}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" placeholder="Any special instructions..." />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => {
              setForm(f => ({ ...f, provider: '', cashType: '', cashDirection: '', carrierNetwork: '', transactionDirection: '', referenceNumber: '', utilityBillType: '', airtimeProvider: '', tvProvider: '', smartcardNumber: '', allPaymentType: '', governmentProvider: '', electricityProvider: '', controlNumber: '', meterNumber: '', subscriptionNumber: '', amount: '' }))
              setStep(1)
            }} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Back</button>
            <button type="button" onClick={() => {
              if (selectedService.type === 'cash' && (!form.cashType || !form.carrierNetwork || !form.referenceNumber)) { setError('Please fill all required fields'); return }
              if (selectedService.type === 'cash' && form.cashType === 'send' && !form.transactionDirection) { setError('Please select send direction'); return }
              if (selectedService.type === 'utility_bills') {
                if (!form.utilityBillType) { setError('Please select utility bill type'); return }
                if (form.utilityBillType === 'airtime_bundle' && !form.airtimeProvider) { setError('Please select airtime provider'); return }
                if (form.utilityBillType === 'tv_subscriptions' && (!form.tvProvider || !form.smartcardNumber)) { setError('Please fill TV subscription details'); return }
                if (form.utilityBillType === 'internet_subscriptions' && !form.provider) { setError('Please select internet provider'); return }
              }
              if (selectedService.type === 'all_payments') {
                if (!form.allPaymentType) { setError('Please select payment type'); return }
                if (form.allPaymentType === 'government' && (!form.governmentProvider || !form.controlNumber || !form.subscriptionNumber || !form.amount)) { setError('Please fill all government payment fields'); return }
                if (form.allPaymentType === 'electricity' && (!form.electricityProvider || !form.meterNumber || !form.subscriptionNumber || !form.amount)) { setError('Please fill all electricity payment fields'); return }
                if (form.allPaymentType === 'control_number' && !form.controlNumber) { setError('Please enter control number'); return }
              }
              setError('')
              setStep(3)
            }} className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-600">Continue</button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && selectedService && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">Confirm Your Request</h3>
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Service</span><span className="font-medium">{selectedService.label}</span></div>
            {selectedService.type === 'cash' && (
              <>
                {form.cashType && <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="font-medium">{form.cashType === 'send' ? 'Cash Send' : 'Cash Withdrawal'}</span></div>}
                {form.cashType === 'send' && form.transactionDirection && <div className="flex justify-between"><span className="text-gray-500">Send To</span><span className="font-medium">{form.transactionDirection === 'own' ? 'To Own-Self' : 'To Someone Else'}</span></div>}
                {form.carrierNetwork && <div className="flex justify-between"><span className="text-gray-500">Carrier Network</span><span className="font-medium">{form.carrierNetwork}</span></div>}
                {form.referenceNumber && <div className="flex justify-between"><span className="text-gray-500">Reference/Mobile</span><span className="font-medium">{form.referenceNumber}</span></div>}
              </>
            )}
            {selectedService.type === 'utility_bills' && (
              <>
                {form.utilityBillType && <div className="flex justify-between"><span className="text-gray-500">Bill Type</span><span className="font-medium">{form.utilityBillType.replace('_', ' ')}</span></div>}
                {form.airtimeProvider && <div className="flex justify-between"><span className="text-gray-500">Airtime Provider</span><span className="font-medium">{form.airtimeProvider}</span></div>}
                {form.tvProvider && <div className="flex justify-between"><span className="text-gray-500">TV Provider</span><span className="font-medium">{form.tvProvider}</span></div>}
                {form.smartcardNumber && <div className="flex justify-between"><span className="text-gray-500">Smartcard</span><span className="font-medium">{form.smartcardNumber}</span></div>}
                {form.provider && form.utilityBillType === 'internet_subscriptions' && <div className="flex justify-between"><span className="text-gray-500">Provider</span><span className="font-medium">{form.provider}</span></div>}
                {form.subscriptionNumber && (form.utilityBillType === 'airtime_bundle' || form.utilityBillType === 'internet_subscriptions') && <div className="flex justify-between"><span className="text-gray-500">Phone Number</span><span className="font-medium">{form.subscriptionNumber}</span></div>}
              </>
            )}
            {selectedService.type === 'all_payments' && (
              <>
                {form.allPaymentType === 'government' && form.governmentProvider && <div className="flex justify-between"><span className="text-gray-500">Gov. Provider</span><span className="font-medium">{form.governmentProvider}</span></div>}
                {form.allPaymentType === 'electricity' && form.electricityProvider && <div className="flex justify-between"><span className="text-gray-500">Electricity</span><span className="font-medium">{form.electricityProvider}</span></div>}
                {form.controlNumber && <div className="flex justify-between"><span className="text-gray-500">Control Number</span><span className="font-medium">{form.controlNumber}</span></div>}
                {form.meterNumber && <div className="flex justify-between"><span className="text-gray-500">Meter Number</span><span className="font-medium">{form.meterNumber}</span></div>}
                {form.subscriptionNumber && (form.allPaymentType === 'government' || form.allPaymentType === 'electricity') && <div className="flex justify-between"><span className="text-gray-500">Mobile (SMS)</span><span className="font-medium">{form.subscriptionNumber}</span></div>}
              </>
            )}
            <div className="flex justify-between border-t pt-2 mt-2"><span className="text-gray-500">Amount</span><span className="font-bold text-green-700 text-base">{formatTZS(parseInt(form.amount.replace(/,/g, ''), 10) || 0)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="font-medium">{form.isOnCredit ? 'On Credit (OC)' : form.paymentMethod === 'cod' ? 'COD' : 'OC'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Super Agent</span><span className="font-medium">{localStorage.getItem('superAgentName') || '—'}</span></div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Back</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50">{loading ? 'Submitting...' : 'Send Request'}</button>
          </div>
        </form>
      )}
    </div>
  )
}
