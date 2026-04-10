import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { listTransactionsByCustomerFn, listVendorsFn } from '@/server/db.functions'
import { formatTZS, formatDateTime, statusColor } from '@/lib/utils'
import { useAuth } from '@/components/AuthProvider'
import { SettingsProvider } from '@/contexts/SettingsContext'
import type { Transaction } from '@/lib/types'
import { LayoutDashboard, ArrowLeftRight, Wallet, Clock, CheckCircle, XCircle, DollarSign, Activity, Search, ChevronDown, ChevronUp } from 'lucide-react'

export const Route = createFileRoute('/vendor/')({
  loader: async () => {
    const [transactions, vendors] = await Promise.all([
      listTransactionsByCustomerFn({ customerId: 'current' }),
      listVendorsFn(),
    ])
    return { transactions, vendors }
  },
  component: VendorDashboardPage,
})

function VendorDashboardPage() {
  return (
    <SettingsProvider>
      <VendorDashboard />
    </SettingsProvider>
  )
}

function VendorDashboard() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTx, setExpandedTx] = useState<string | null>(null)
  
  const vendorId = user?.id || 'current'
  const { transactions } = Route.useLoaderData()

  const myTransactions = useMemo(() => {
    return transactions.filter(t => t.customerId === vendorId || t.agentId === vendorId)
  }, [transactions, vendorId])

  const kpis = useMemo(() => {
    const approved = myTransactions.filter(t => t.status === 'approved')
    const pending = myTransactions.filter(t => t.status === 'pending')
    const totalRevenue = approved.reduce((sum, t) => sum + t.amount, 0)
    return {
      totalTransactions: myTransactions.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      totalRevenue,
    }
  }, [myTransactions])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your transactions and wallet</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-indigo-500">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.totalTransactions}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-green-500">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatTZS(kpis.totalRevenue)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-yellow-500">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.pendingCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
          <div className="p-3 rounded-lg bg-cyan-500">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Wallet</p>
            <p className="text-2xl font-bold text-gray-900">TZS 0</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Service</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {myTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No transactions yet
                  </td>
                </tr>
              ) : (
                myTransactions.slice(0, 10).map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {tx.serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{tx.provider}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{formatTZS(tx.amount)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(tx.status)}`}>
                        {tx.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {tx.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {tx.status === 'pending' && <Clock className="w-3 h-3" />}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{formatDateTime(tx.createdAt)}</td>
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