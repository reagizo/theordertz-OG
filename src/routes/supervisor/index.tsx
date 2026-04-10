import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import {
  listTransactionsFn,
  listCustomersFn,
  listAgentsFn,
} from '@/server/db.functions'
import { formatTZS, formatDateTime, statusColor, serviceLabel, tierLabel } from '@/lib/utils'
import type { Transaction } from '@/lib/types'
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext'
import {
  CheckCircle,
  XCircle,
  Clock,
  RefreshCcw,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowLeftRight,
  Users,
  Activity,
  DollarSign,
} from 'lucide-react'

export const Route = createFileRoute('/supervisor/')({
  loader: async () => {
    const [transactions, customers, agents] = await Promise.all([
      listTransactionsFn(),
      listCustomersFn(),
      listAgentsFn(),
    ])
    return { transactions, customers, agents }
  },
  component: SupervisorDashboardPage,
})

function SupervisorDashboardPage() {
  return (
    <SettingsProvider>
      <SupervisorDashboard />
    </SettingsProvider>
  )
}

type TabId = 'pending' | 'approved' | 'rejected' | 'all'

const TABS: { id: TabId; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All Transactions' },
]

function SupervisorDashboard() {
  const data = Route.useLoaderData()
  const transactions = data?.transactions ?? []
  const customers = data?.customers ?? []
  const agents = data?.agents ?? []
  const [activeTab, setActiveTab] = useState<TabId>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTx, setExpandedTx] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const { settings } = useSettings()

  const filteredTransactions = useMemo(() => {
    let filtered = transactions
    if (activeTab === 'pending') filtered = filtered.filter(t => t.status === 'pending')
    else if (activeTab === 'approved') filtered = filtered.filter(t => t.status === 'approved')
    else if (activeTab === 'rejected') filtered = filtered.filter(t => t.status === 'rejected')

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.customerName.toLowerCase().includes(q) ||
        t.agentName.toLowerCase().includes(q) ||
        t.provider.toLowerCase().includes(q) ||
        serviceLabel(t.serviceType).toLowerCase().includes(q)
      )
    }

    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [transactions, activeTab, searchQuery])

  const kpis = useMemo(() => {
    const pending = transactions.filter(t => t.status === 'pending')
    const approved = transactions.filter(t => t.status === 'approved')
    const totalRevenue = approved.reduce((sum, t) => sum + t.amount, 0)
    const pendingAmount = pending.reduce((sum, t) => sum + t.amount, 0)

    return {
      totalTransactions: transactions.length,
      pendingCount: pending.length,
      pendingAmount,
      approvedCount: approved.length,
      totalRevenue,
      totalCustomers: customers.length,
      totalAgents: agents.length,
    }
  }, [transactions, customers, agents])

  const handleApprove = async (tx: Transaction) => {
    setLoading(tx.id)
    try {
      const updated = { ...tx, status: 'approved' as const, updatedAt: new Date().toISOString() }
      await listTransactionsFn.save({ data: updated })
      window.location.reload()
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async (tx: Transaction) => {
    setLoading(tx.id)
    try {
      const updated = { ...tx, status: 'rejected' as const, updatedAt: new Date().toISOString() }
      await listTransactionsFn.save({ data: updated })
      window.location.reload()
    } finally {
      setLoading(null)
    }
  }

  const handleReturn = async (tx: Transaction) => {
    const notes = prompt('Enter reason for returning request for amendment:')
    if (!notes) return
    setLoading(tx.id)
    try {
      const updated = { ...tx, status: 'pending' as const, notes: `${tx.notes || ''}\n[Return for amendment]: ${notes}`, updatedAt: new Date().toISOString() }
      await listTransactionsFn.save({ data: updated })
      window.location.reload()
    } finally {
      setLoading(null)
    }
  }

  const TransactionDetail = ({ tx }: { tx: Transaction }) => (
    <div className="bg-gray-50 px-4 py-3 text-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <span className="text-gray-500">Customer Phone</span>
          <p className="font-medium">{tx.customerPhone}</p>
        </div>
        <div>
          <span className="text-gray-500">Payment Method</span>
          <p className="font-medium">{tx.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Open Credit'}</p>
        </div>
        <div>
          <span className="text-gray-500">Created</span>
          <p className="font-medium">{formatDateTime(tx.createdAt)}</p>
        </div>
        <div>
          <span className="text-gray-500">Updated</span>
          <p className="font-medium">{formatDateTime(tx.updatedAt)}</p>
        </div>
        {tx.subscriptionNumber && (
          <div><span className="text-gray-500">Subscription #</span><p className="font-medium">{tx.subscriptionNumber}</p></div>
        )}
        {tx.meterNumber && (
          <div><span className="text-gray-500">Meter #</span><p className="font-medium">{tx.meterNumber}</p></div>
        )}
        {tx.controlNumber && (
          <div><span className="text-gray-500">Control #</span><p className="font-medium">{tx.controlNumber}</p></div>
        )}
        {tx.referenceNumber && (
          <div><span className="text-gray-500">Reference #</span><p className="font-medium">{tx.referenceNumber}</p></div>
        )}
        {tx.smartcardNumber && (
          <div><span className="text-gray-500">Smartcard #</span><p className="font-medium">{tx.smartcardNumber}</p></div>
        )}
        {tx.carrierNetwork && (
          <div><span className="text-gray-500">Carrier</span><p className="font-medium">{tx.carrierNetwork}</p></div>
        )}
        {tx.notes && (
          <div className="col-span-2">
            <span className="text-gray-500">Notes</span>
            <p className="font-medium">{tx.notes}</p>
          </div>
        )}
      </div>
    </div>
  )

  const TransactionRow = ({ tx }: { tx: Transaction }) => {
    const isExpanded = expandedTx === tx.id
    const isLoading = loading === tx.id

    return (
      <>
        <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <button onClick={() => setExpandedTx(isExpanded ? null : tx.id)} className="p-1 hover:bg-gray-200 rounded">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <div>
                <p className="font-medium text-gray-900">{tx.customerName}</p>
                <p className="text-xs text-gray-500">{tx.customerPhone}</p>
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
              tx.customerTier === 'd2d' ? 'bg-orange-100 text-orange-700' : 'bg-pink-100 text-pink-700'
            }`}>
              {tierLabel(tx.customerTier)}
            </span>
          </td>
          <td className="px-4 py-3 text-gray-600">{tx.agentName}</td>
          <td className="px-4 py-3 text-gray-600">{serviceLabel(tx.serviceType)}</td>
          <td className="px-4 py-3 text-gray-600">{tx.provider}</td>
          <td className="px-4 py-3 font-medium text-gray-900">{formatTZS(tx.amount)}</td>
          <td className="px-4 py-3">
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
              tx.paymentMethod === 'cod' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}>
              {tx.paymentMethod === 'cod' ? 'COD' : 'OC'}
            </span>
          </td>
          <td className="px-4 py-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(tx.status)}`}>
              {tx.status === 'approved' && <CheckCircle className="w-3 h-3" />}
              {tx.status === 'rejected' && <XCircle className="w-3 h-3" />}
              {tx.status === 'pending' && <Clock className="w-3 h-3" />}
              {tx.status}
            </span>
          </td>
          <td className="px-4 py-3 text-gray-500 text-sm">{formatDateTime(tx.createdAt)}</td>
          {activeTab === 'pending' && (
            <td className="px-4 py-3">
              <div className="flex gap-1">
                <button
                  onClick={() => handleApprove(tx)}
                  disabled={isLoading}
                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(tx)}
                  disabled={isLoading}
                  className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleReturn(tx)}
                  disabled={isLoading}
                  className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded hover:bg-amber-200 disabled:opacity-50"
                >
                  Return
                </button>
              </div>
            </td>
          )}
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={activeTab === 'pending' ? 10 : 9}>
              <TransactionDetail tx={tx} />
            </td>
          </tr>
        )}
      </>
    )
  }

  const KPICard = ({ icon: Icon, label, value, sub, color }: {
    icon: React.ElementType
    label: string
    value: string | number
    sub?: string
    color: string
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Super Agent Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Approve and manage transaction requests
            <span className="ml-2 text-indigo-600 font-medium">| Super Agent: {settings.superAgentName}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Activity} label="Pending Requests" value={kpis.pendingCount} sub={formatTZS(kpis.pendingAmount)} color="bg-yellow-500" />
        <KPICard icon={CheckCircle} label="Approved" value={kpis.approvedCount} sub="Transactions" color="bg-green-500" />
        <KPICard icon={DollarSign} label="Total Revenue" value={formatTZS(kpis.totalRevenue)} sub={`${kpis.totalTransactions} total`} color="bg-indigo-500" />
        <KPICard icon={Users} label="Users" value={`${kpis.totalAgents} agents / ${kpis.totalCustomers} customers`} color="bg-cyan-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery('') }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, provider, or service..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  {activeTab === 'pending' && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'pending' ? 10 : 9} className="px-4 py-8 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}