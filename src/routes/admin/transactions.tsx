import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { listTransactionsFn, saveTransactionFn, saveAgentProfileFn, getAgentProfileFn, saveCustomerProfileFn, getCustomerProfileFn } from '@/server/db.functions'
import { formatTZS, formatDateTime, statusColor, serviceLabel, tierLabel } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, Search } from 'lucide-react'
import type { Transaction } from '@/lib/types'
import { TEST_ADMIN_EMAIL, REAL_ADMIN_EMAIL } from '@/contexts/SettingsContext'

export const Route = createFileRoute('/admin/transactions')({
  loader: () => listTransactionsFn(),
  component: AdminTransactions,
})

function AdminTransactions() {
  const { user } = useAuth()
  const initialData = Route.useLoaderData() as Transaction[]
  const [transactions, setTransactions] = useState(initialData)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const currentUserEmail = user?.email || ''
  const isTestAdmin = currentUserEmail === TEST_ADMIN_EMAIL
  const isRealAdmin = currentUserEmail === REAL_ADMIN_EMAIL

  const filtered = transactions.filter(tx => {
    // Filter by admin type
    if (isTestAdmin && !tx.isTestAccount) return false
    if (isRealAdmin) {
      // Real admin sees all transactions (no filter)
    }
    
    const matchSearch = !search || tx.customerName.toLowerCase().includes(search.toLowerCase()) || tx.agentName.toLowerCase().includes(search.toLowerCase()) || tx.provider.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || tx.status === statusFilter
    const matchTier = tierFilter === 'all' || tx.customerTier === tierFilter
    const matchPayment = paymentFilter === 'all' || (paymentFilter === 'oc' ? tx.isOnCredit : tx.paymentMethod === paymentFilter)
    return matchSearch && matchStatus && matchTier && matchPayment
  })

  const updateStatus = async (tx: Transaction, status: 'approved' | 'rejected') => {
    setLoading(tx.id)
    try {
      const updated = { ...tx, status, updatedAt: new Date().toISOString() }
      await saveTransactionFn({ data: updated })

      if (status === 'approved' && tx.agentId) {
        const agent = await getAgentProfileFn({ data: { id: tx.agentId } })
        if (agent) {
          const commission = Math.floor(tx.amount * (agent.commissionRate / 100))
          await saveAgentProfileFn({
            data: { ...agent, commissionEarned: agent.commissionEarned + commission, updatedAt: new Date().toISOString() },
          })
        }
      }

      if (status === 'approved' && tx.isOnCredit && tx.customerId) {
        const customer = await getCustomerProfileFn({ data: { id: tx.customerId } })
        if (customer) {
          await saveCustomerProfileFn({
            data: { ...customer, creditUsed: customer.creditUsed + tx.amount, updatedAt: new Date().toISOString() },
          })
        }
      }

      setTransactions(prev => prev.map(t => t.id === tx.id ? updated : t))
      setMessage(`Transaction ${status}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Transactions</h1>
        <p className="text-gray-300 text-sm mt-1">Review and approve customer service requests</p>
      </div>

      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{message}</div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or provider..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All Tiers</option>
            <option value="d2d">Day-to-Day</option>
            <option value="premier">Premier</option>
          </select>
          <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All Payments</option>
            <option value="cod">COD</option>
            <option value="oc">On Credit (OC)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 border-b">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No transactions found</td></tr>
              ) : (
                filtered.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{tx.customerName}</div>
                      <div className="text-xs text-gray-400">{tx.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tx.customerTier === 'premier' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {tierLabel(tx.customerTier)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tx.agentName}</td>
                    <td className="px-4 py-3 text-gray-600">{serviceLabel(tx.serviceType)}</td>
                    <td className="px-4 py-3 text-gray-600">{tx.provider}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{formatTZS(tx.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${tx.isOnCredit ? 'bg-purple-100 text-purple-700' : tx.paymentMethod === 'cod' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {tx.isOnCredit ? 'OC' : tx.paymentMethod === 'cod' ? 'COD' : 'Credit'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(tx.status)}`}>
                        {tx.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : tx.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                    <td className="px-4 py-3">
                      {tx.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => updateStatus(tx, 'approved')} disabled={loading === tx.id}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg disabled:opacity-50">
                            Approve
                          </button>
                          <button onClick={() => updateStatus(tx, 'rejected')} disabled={loading === tx.id}
                            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg disabled:opacity-50">
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
