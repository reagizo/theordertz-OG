import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { listTransactionsFn, listCustomersFn, listFloatRequestsFn } from '@/server/db.functions'
import { formatTZS, formatDateTime, statusColor, serviceLabel, tierLabel } from '@/lib/utils'
import type { Transaction, FloatRequest } from '@/lib/types'
import { SettingsProvider } from '@/contexts/SettingsContext'
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  DollarSign,
  Activity,
  Users,
} from 'lucide-react'

export const Route = createFileRoute('/supervisor/transactions')({
  loader: async () => {
    const [transactions, customers] = await Promise.all([
      listTransactionsFn(),
      listCustomersFn(),
    ])
    return { transactions, customers }
  },
  component: SupervisorTransactionsPage,
})

function SupervisorTransactionsPage() {
  return (
    <SettingsProvider>
      <SupervisorTransactions />
    </SettingsProvider>
  )
}

function SupervisorTransactions() {
  const data = Route.useLoaderData()
  const transactions = data?.transactions ?? []
  const customers = data?.customers ?? []
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [expandedTx, setExpandedTx] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const filteredTx = useMemo(() => {
    let filtered = transactions
    if (statusFilter !== 'all') filtered = filtered.filter(t => t.status === statusFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.customerName.toLowerCase().includes(q) ||
        t.agentName.toLowerCase().includes(q) ||
        t.provider.toLowerCase().includes(q)
      )
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [transactions, statusFilter, searchQuery])

  const handleApprove = async (tx: Transaction) => {
    setLoading(tx.id)
    try {
      const updated = { ...tx, status: 'approved' as const, updatedAt: new Date().toISOString() }
      await listTransactionsFn.save({ data: updated })
      window.location.reload()
    } finally { setLoading(null) }
  }

  const handleReject = async (tx: Transaction) => {
    setLoading(tx.id)
    try {
      const updated = { ...tx, status: 'rejected' as const, updatedAt: new Date().toISOString() }
      await listTransactionsFn.save({ data: updated })
      window.location.reload()
    } finally { setLoading(null) }
  }

  const handleReturn = async (tx: Transaction) => {
    const notes = prompt('Enter reason for returning request:')
    if (!notes) return
    setLoading(tx.id)
    try {
      const updated = { ...tx, status: 'pending' as const, notes: `${tx.notes || ''}\n[Return]: ${notes}`, updatedAt: new Date().toISOString() }
      await listTransactionsFn.save({ data: updated })
      window.location.reload()
    } finally { setLoading(null) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Transaction Requests</h1>
        <p className="text-gray-300 text-sm mt-1">Review, approve, reject, or return transaction requests</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search transactions..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No transactions</td></tr>
              ) : filteredTx.map((tx) => {
                const isExpanded = expandedTx === tx.id
                return (
                  <>
                    <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedTx(isExpanded ? null : tx.id)} className="flex items-center gap-2">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <div><p className="font-medium">{tx.customerName}</p><p className="text-xs text-gray-500">{tx.customerPhone}</p></div>
                        </button>
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${tx.customerTier === 'd2d' ? 'bg-orange-100 text-orange-700' : 'bg-pink-100 text-pink-700'}`}>{tierLabel(tx.customerTier)}</span></td>
                      <td className="px-4 py-3">{tx.agentName}</td>
                      <td className="px-4 py-3">{serviceLabel(tx.serviceType)}</td>
                      <td className="px-4 py-3">{tx.provider}</td>
                      <td className="px-4 py-3 font-medium">{formatTZS(tx.amount)}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${statusColor(tx.status)}`}>{tx.status}</span></td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(tx.createdAt)}</td>
                      <td className="px-4 py-3">
                        {tx.status === 'pending' && (
                          <div className="flex gap-1">
                            <button onClick={() => handleApprove(tx)} disabled={loading === tx.id} className="px-2 py-1 bg-green-600 text-white text-xs rounded">Approve</button>
                            <button onClick={() => handleReject(tx)} disabled={loading === tx.id} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Reject</button>
                            <button onClick={() => handleReturn(tx)} disabled={loading === tx.id} className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">Return</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr><td colSpan={9} className="bg-gray-50 px-4 py-3 text-sm">
                        <div className="grid grid-cols-4 gap-3">
                          <div><span className="text-gray-500">Payment</span><p>{tx.paymentMethod === 'cod' ? 'COD' : 'Open Credit'}</p></div>
                          <div><span className="text-gray-500">Created</span><p>{formatDateTime(tx.createdAt)}</p></div>
                          <div><span className="text-gray-500">Updated</span><p>{formatDateTime(tx.updatedAt)}</p></div>
                          {tx.notes && <div className="col-span-4"><span className="text-gray-500">Notes</span><p>{tx.notes}</p></div>}
                        </div>
                      </td></tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}