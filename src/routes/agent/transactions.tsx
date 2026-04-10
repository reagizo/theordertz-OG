import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { listTransactionsByAgentFn } from '@/server/db.functions'
import { formatTZS, formatDateTime, statusColor, tierLabel, serviceLabel } from '@/lib/utils'
import { Search } from 'lucide-react'
import type { Transaction } from '@/lib/types'

export const Route = createFileRoute('/agent/transactions')({
  component: AgentTransactions,
})

function AgentTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!user?.id) return
    listTransactionsByAgentFn({ data: { agentId: user.id } })
      .then(setTransactions)
      .finally(() => setLoading(false))
  }, [user?.id])

  const filtered = transactions.filter(tx => {
    const matchSearch = !search || tx.customerName.toLowerCase().includes(search.toLowerCase()) || tx.provider.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || tx.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalCommission = transactions.filter(t => t.status === 'approved').reduce((s, t) => s + Math.floor(t.amount * 0.025), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">My Transactions</h1>
        <p className="text-gray-300 text-sm mt-1">All customer service requests assigned to you</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-800">{transactions.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500">Approved</p>
          <p className="text-xl font-bold text-green-600">{transactions.filter(t => t.status === 'approved').length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500">Commission</p>
          <p className="text-xl font-bold text-blue-600">{formatTZS(totalCommission)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 border-b">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No transactions found</td></tr>
              ) : filtered.map(tx => (
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
                  <td className="px-4 py-3 text-gray-600">{serviceLabel(tx.serviceType)}</td>
                  <td className="px-4 py-3 text-gray-600">{tx.provider}</td>
                  <td className="px-4 py-3 font-semibold">{formatTZS(tx.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${tx.isOnCredit ? 'bg-purple-100 text-purple-700' : tx.paymentMethod === 'cod' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {tx.isOnCredit ? 'OC' : tx.paymentMethod === 'cod' ? 'COD' : 'Credit'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(tx.status)}`}>{tx.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(tx.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
