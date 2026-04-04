import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { listTransactionsByCustomerFn } from '@/server/db.functions'
import { formatTZS, formatDateTime, statusColor, serviceLabel } from '@/lib/utils'
import { Search } from 'lucide-react'
import type { Transaction } from '@/lib/types'

export const Route = createFileRoute('/customer/history')({
  component: CustomerHistory,
})

function CustomerHistory() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')

  useEffect(() => {
    if (!user?.id) return
    listTransactionsByCustomerFn({ data: { customerId: user.id } })
      .then(setTransactions)
      .finally(() => setLoading(false))
  }, [user?.id])

  const filtered = transactions.filter(tx => {
    const matchSearch = !search || tx.provider.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || tx.status === statusFilter
    const matchService = serviceFilter === 'all' || tx.serviceType === serviceFilter
    return matchSearch && matchStatus && matchService
  })

  const totalSpent = transactions.filter(t => t.status === 'approved').reduce((s, t) => s + t.amount, 0)
  const totalOnCredit = transactions.filter(t => t.isOnCredit && t.status === 'approved').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transaction History</h1>
        <p className="text-gray-500 text-sm mt-1">All your service requests</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500">Total Requests</p>
          <p className="text-xl font-bold">{transactions.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500">Total Spent</p>
          <p className="text-xl font-bold text-green-600">{formatTZS(totalSpent)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-xl font-bold text-amber-600">{transactions.filter(t => t.status === 'pending').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500">On Credit (OC)</p>
          <p className="text-xl font-bold text-purple-600">{formatTZS(totalOnCredit)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search provider..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <div className="flex gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All Services</option>
            <option value="cash_send">Cash Send</option>
            <option value="cash_withdrawal">Cash Withdrawal</option>
            <option value="airtime_bundle">Airtime/Bundle</option>
            <option value="tv_subscriptions">TV Subscriptions</option>
            <option value="internet_subscriptions">Internet Subscriptions</option>
            <option value="utility_bills">Utility Bills</option>
            <option value="all_payments">All Payment Bills</option>
          </select>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p>No transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(tx => (
              <div key={tx.id} className="p-4 hover:bg-gray-50 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-lg flex-shrink-0">
                  {tx.serviceType === 'tv_subscriptions' ? '📺' : tx.serviceType === 'internet_subscriptions' ? '🌐' : tx.serviceType === 'airtime_bundle' ? '📱' : tx.serviceType === 'utility_bills' ? '💡' : tx.serviceType === 'cash_send' ? '💸' : tx.serviceType === 'cash_withdrawal' ? '🏧' : '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-800 text-sm">{tx.provider}</p>
                    <p className="font-bold text-gray-800 text-sm whitespace-nowrap">{formatTZS(tx.amount)}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{serviceLabel(tx.serviceType)}</span>
                    <span className="text-gray-300">·</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor(tx.status)}`}>{tx.status}</span>
                    <span className="text-gray-300">·</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${tx.isOnCredit ? 'bg-purple-100 text-purple-700' : tx.paymentMethod === 'cod' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {tx.isOnCredit ? 'OC' : tx.paymentMethod === 'cod' ? 'COD' : 'Credit'}
                    </span>
                  </div>
                  {tx.smartcardNumber && <p className="text-xs text-gray-400 mt-0.5">Smartcard: {tx.smartcardNumber}</p>}
                  {tx.meterNumber && <p className="text-xs text-gray-400 mt-0.5">Meter: {tx.meterNumber}</p>}
                  {tx.controlNumber && <p className="text-xs text-gray-400 mt-0.5">Control #: {tx.controlNumber}</p>}
                  {tx.referenceNumber && <p className="text-xs text-gray-400 mt-0.5">Ref: {tx.referenceNumber}</p>}
                  {tx.subscriptionNumber && <p className="text-xs text-gray-400 mt-0.5">Phone: {tx.subscriptionNumber}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">{formatDateTime(tx.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
