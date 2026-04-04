import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import {
  listTransactionsFn,
  listAgentsFn,
  listCustomersFn,
  listFloatRequestsFn,
} from '@/server/db.functions'
import { formatTZS, formatDateTime, statusColor, serviceLabel, tierLabel } from '@/lib/utils'
import type { Transaction, AgentProfile, CustomerProfile } from '@/lib/types'
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext'
import {
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Activity,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
} from 'lucide-react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

export const Route = createFileRoute('/admin/')({
  loader: async () => {
    const [transactions, agents, customers, floatRequests] = await Promise.all([
      listTransactionsFn(),
      listAgentsFn(),
      listCustomersFn(),
      listFloatRequestsFn(),
    ])
    return { transactions, agents, customers, floatRequests }
  },
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  return (
    <SettingsProvider>
      <AdminDashboard />
    </SettingsProvider>
  )
}

type TabId = 'overview' | 'completed' | 'pending' | 'agents' | 'd2d' | 'premier' | 'audit'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'completed', label: 'Completed' },
  { id: 'pending', label: 'Pending' },
  { id: 'agents', label: 'Agent Transactions' },
  { id: 'd2d', label: 'D2D Customers' },
  { id: 'premier', label: 'Premier Customers' },
  { id: 'audit', label: 'Audit Trail' },
]

type AuditEntry = {
  id: string
  timestamp: string
  action: string
  entityType: string
  entityName: string
  details: string
  actor: string
}

function AdminDashboard() {
  const { transactions, agents, customers, floatRequests } = Route.useLoaderData()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTx, setExpandedTx] = useState<string | null>(null)
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([])

  // Build audit trail from transactions
  useEffect(() => {
    const entries: AuditEntry[] = transactions
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((tx) => ({
        id: `audit-${tx.id}-${tx.status}`,
        timestamp: tx.updatedAt,
        action: `Transaction ${tx.status}`,
        entityType: 'Transaction',
        entityName: `${tx.customerName} → ${tx.agentName}`,
        details: `${serviceLabel(tx.serviceType)} — ${formatTZS(tx.amount)} (${tierLabel(tx.customerTier)})`,
        actor: tx.agentName,
      }))

    const agentEntries: AuditEntry[] = agents
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((a) => ({
        id: `audit-agent-${a.id}`,
        timestamp: a.updatedAt,
        action: `Agent ${a.status}`,
        entityType: 'Agent',
        entityName: a.fullName,
        details: `Float: ${formatTZS(a.floatBalance)} | Commission: ${a.commissionRate}%`,
        actor: a.fullName,
      }))

    const customerEntries: AuditEntry[] = customers
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((c) => ({
        id: `audit-customer-${c.id}`,
        timestamp: c.updatedAt,
        action: `Customer ${c.status}`,
        entityType: 'Customer',
        entityName: c.fullName,
        details: `Tier: ${tierLabel(c.tier)} | Wallet: ${formatTZS(c.walletBalance)}`,
        actor: c.fullName,
      }))

    setAuditTrail([...entries, ...agentEntries, ...customerEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ))
  }, [transactions, agents, customers])

  // KPI calculations
  const kpis = useMemo(() => {
    const approved = transactions.filter((t) => t.status === 'approved')
    const pending = transactions.filter((t) => t.status === 'pending')
    const rejected = transactions.filter((t) => t.status === 'rejected')
    const totalRevenue = approved.reduce((sum, t) => sum + t.amount, 0)
    const pendingAmount = pending.reduce((sum, t) => sum + t.amount, 0)
    const d2dCustomers = customers.filter((c) => c.tier === 'd2d')
    const premierCustomers = customers.filter((c) => c.tier === 'premier')
    const activeAgents = agents.filter((a) => a.status === 'approved')

    return {
      totalTransactions: transactions.length,
      approvedCount: approved.length,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      totalRevenue,
      pendingAmount,
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      totalCustomers: customers.length,
      d2dCount: d2dCustomers.length,
      premierCount: premierCustomers.length,
      floatRequests: floatRequests.length,
    }
  }, [transactions, agents, customers, floatRequests])

  // Chart data: Monthly revenue
  const monthlyRevenueData = useMemo(() => {
    const months: Record<string, number> = {}
    transactions
      .filter((t) => t.status === 'approved')
      .forEach((t) => {
        const d = new Date(t.createdAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        months[key] = (months[key] || 0) + t.amount
      })
    const sorted = Object.entries(months).sort(([a], [b]) => a.localeCompare(b))
    return {
      labels: sorted.map(([k]) => {
        const [y, m] = k.split('-')
        return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }),
      values: sorted.map(([, v]) => v),
    }
  }, [transactions])

  // Chart data: Transactions by tier
  const tierData = useMemo(() => {
    const d2d = transactions.filter((t) => t.customerTier === 'd2d').length
    const premier = transactions.filter((t) => t.customerTier === 'premier').length
    return { d2d, premier }
  }, [transactions])

  // Chart data: Transactions by service type
  const serviceData = useMemo(() => {
    const map: Record<string, number> = {}
    transactions.forEach((t) => {
      const label = serviceLabel(t.serviceType)
      map[label] = (map[label] || 0) + 1
    })
    return map
  }, [transactions])

  // Chart data: Transaction trend (daily last 30 days)
  const trendData = useMemo(() => {
    const days: Record<string, number> = {}
    const now = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      days[key] = 0
    }
    transactions.forEach((t) => {
      const key = t.createdAt.split('T')[0]
      if (days[key] !== undefined) days[key]++
    })
    const sorted = Object.entries(days).sort(([a], [b]) => a.localeCompare(b))
    return {
      labels: sorted.map(([k]) => {
        const d = new Date(k + 'T00:00:00')
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }),
      values: sorted.map(([, v]) => v),
    }
  }, [transactions])

  // Filtered transactions
  const completedTx = useMemo(
    () => transactions
      .filter((t) => t.status === 'approved')
      .filter((t) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
          t.customerName.toLowerCase().includes(q) ||
          t.agentName.toLowerCase().includes(q) ||
          t.provider.toLowerCase().includes(q) ||
          serviceLabel(t.serviceType).toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [transactions, searchQuery]
  )

  const pendingTx = useMemo(
    () => transactions
      .filter((t) => t.status === 'pending')
      .filter((t) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
          t.customerName.toLowerCase().includes(q) ||
          t.agentName.toLowerCase().includes(q) ||
          t.provider.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [transactions, searchQuery]
  )

  const agentTx = useMemo(
    () => transactions
      .filter((t) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
          t.customerName.toLowerCase().includes(q) ||
          t.agentName.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [transactions, searchQuery]
  )

  const d2dTx = useMemo(
    () => transactions
      .filter((t) => t.customerTier === 'd2d')
      .filter((t) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
          t.customerName.toLowerCase().includes(q) ||
          t.agentName.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [transactions, searchQuery]
  )

  const premierTx = useMemo(
    () => transactions
      .filter((t) => t.customerTier === 'premier')
      .filter((t) => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
          t.customerName.toLowerCase().includes(q) ||
          t.agentName.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [transactions, searchQuery]
  )

  const chartColors = {
    indigo: '#4F46E5',
    cyan: '#06B6D4',
    orange: '#F97316',
    pink: '#EC4899',
    green: '#10B981',
    red: '#EF4444',
    yellow: '#F59E0B',
  }

  // Chart configs
  const revenueBarData = {
    labels: monthlyRevenueData.labels,
    datasets: [
      {
        label: 'Revenue (TZS)',
        data: monthlyRevenueData.values,
        backgroundColor: 'rgba(79, 70, 229, 0.7)',
        borderColor: chartColors.indigo,
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  }

  const trendLineData = {
    labels: trendData.labels,
    datasets: [
      {
        label: 'Transactions',
        data: trendData.values,
        borderColor: chartColors.cyan,
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  }

  const tierDoughnutData = {
    labels: ['D2D Customers', 'Premier Customers'],
    datasets: [
      {
        data: [tierData.d2d, tierData.premier],
        backgroundColor: [chartColors.orange, chartColors.pink],
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  }

  const serviceBarData = {
    labels: Object.keys(serviceData),
    datasets: [
      {
        label: 'Transactions',
        data: Object.values(serviceData),
        backgroundColor: [
          chartColors.indigo,
          chartColors.cyan,
          chartColors.orange,
          chartColors.pink,
          chartColors.green,
          chartColors.yellow,
          chartColors.red,
        ],
        borderRadius: 6,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
    },
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom' as const, labels: { padding: 16, usePointStyle: true } },
    },
  }

  // Transaction detail row
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
          <div>
            <span className="text-gray-500">Subscription #</span>
            <p className="font-medium">{tx.subscriptionNumber}</p>
          </div>
        )}
        {tx.meterNumber && (
          <div>
            <span className="text-gray-500">Meter #</span>
            <p className="font-medium">{tx.meterNumber}</p>
          </div>
        )}
        {tx.controlNumber && (
          <div>
            <span className="text-gray-500">Control #</span>
            <p className="font-medium">{tx.controlNumber}</p>
          </div>
        )}
        {tx.referenceNumber && (
          <div>
            <span className="text-gray-500">Reference #</span>
            <p className="font-medium">{tx.referenceNumber}</p>
          </div>
        )}
        {tx.smartcardNumber && (
          <div>
            <span className="text-gray-500">Smartcard #</span>
            <p className="font-medium">{tx.smartcardNumber}</p>
          </div>
        )}
        {tx.carrierNetwork && (
          <div>
            <span className="text-gray-500">Carrier</span>
            <p className="font-medium">{tx.carrierNetwork}</p>
          </div>
        )}
        {tx.cashDirection && (
          <div>
            <span className="text-gray-500">Cash Direction</span>
            <p className="font-medium">{tx.cashDirection === 'send' ? 'Send' : 'Withdrawal'}</p>
          </div>
        )}
        {tx.transactionDirection && (
          <div>
            <span className="text-gray-500">Direction</span>
            <p className="font-medium">{tx.transactionDirection === 'own' ? 'Own' : 'Someone Else'}</p>
          </div>
        )}
        {tx.isOnCredit !== undefined && (
          <div>
            <span className="text-gray-500">On Credit</span>
            <p className="font-medium">{tx.isOnCredit ? 'Yes' : 'No'}</p>
          </div>
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

  // Transaction table row
  const TransactionRow = ({ tx }: { tx: Transaction }) => {
    const isExpanded = expandedTx === tx.id
    return (
      <>
        <tr className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
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
        </tr>
        {isExpanded && (
          <tr>
            <td colSpan={9}>
              <TransactionDetail tx={tx} />
            </td>
          </tr>
        )}
      </>
    )
  }

  const TransactionTable = ({ txs }: { txs: Transaction[] }) => (
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
          </tr>
        </thead>
        <tbody>
          {txs.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                No transactions found
              </td>
            </tr>
          ) : (
            txs.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
          )}
        </tbody>
      </table>
    </div>
  )

  // KPI Card component
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

  const { settings } = useSettings()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitor transactions, agents, and customers
            <span className="ml-2 text-indigo-600 font-medium">| Super Agent: {settings.superAgentName}</span>
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Activity}
          label="Total Transactions"
          value={kpis.totalTransactions}
          sub={`${kpis.approvedCount} approved, ${kpis.pendingCount} pending`}
          color="bg-indigo-500"
        />
        <KPICard
          icon={DollarSign}
          label="Total Revenue"
          value={formatTZS(kpis.totalRevenue)}
          sub={`${kpis.rejectedCount} rejected`}
          color="bg-green-500"
        />
        <KPICard
          icon={Clock}
          label="Pending Amount"
          value={formatTZS(kpis.pendingAmount)}
          sub={`${kpis.pendingCount} transactions awaiting`}
          color="bg-yellow-500"
        />
        <KPICard
          icon={Users}
          label="Users"
          value={`${kpis.activeAgents} agents / ${kpis.totalCustomers} customers`}
          sub={`${kpis.d2dCount} D2D, ${kpis.premierCount} Premier`}
          color="bg-cyan-500"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchQuery('') }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        {activeTab !== 'overview' && (
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
        )}

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Charts row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue</h3>
                  <div className="h-48 sm:h-64">
                    <Bar data={revenueBarData} options={chartOptions} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Transaction Trend (30 days)</h3>
                  <div className="h-48 sm:h-64">
                    <Line data={trendLineData} options={chartOptions} />
                  </div>
                </div>
              </div>

              {/* Charts row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Transactions by Tier</h3>
                  <div className="h-48 sm:h-64 flex items-center justify-center">
                    <Doughnut data={tierDoughnutData} options={doughnutOptions} />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Transactions by Service</h3>
                  <div className="h-48 sm:h-64">
                    <Bar data={serviceBarData} options={chartOptions} />
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600">{kpis.totalTransactions}</p>
                  <p className="text-xs text-indigo-500 mt-1">Total Transactions</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{kpis.approvedCount}</p>
                  <p className="text-xs text-green-500 mt-1">Approved</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{kpis.pendingCount}</p>
                  <p className="text-xs text-yellow-500 mt-1">Pending</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{kpis.rejectedCount}</p>
                  <p className="text-xs text-red-500 mt-1">Rejected</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'completed' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Completed Transactions ({completedTx.length})
                </h3>
              </div>
              <TransactionTable txs={completedTx} />
            </div>
          )}

          {activeTab === 'pending' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Pending Transactions ({pendingTx.length})
                </h3>
              </div>
              <TransactionTable txs={pendingTx} />
            </div>
          )}

          {activeTab === 'agents' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Agent Transactions ({agentTx.length})
                </h3>
              </div>
              <TransactionTable txs={agentTx} />
            </div>
          )}

          {activeTab === 'd2d' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  D2D Customer Transactions ({d2dTx.length})
                </h3>
              </div>
              <TransactionTable txs={d2dTx} />
            </div>
          )}

          {activeTab === 'premier' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Premier Customer Transactions ({premierTx.length})
                </h3>
              </div>
              <TransactionTable txs={premierTx} />
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Audit Trail ({auditTrail.length} entries)
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditTrail.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No audit entries yet</p>
                ) : (
                  auditTrail.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="mt-0.5">
                        <Activity className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">{entry.action}</span>
                          <span className={`inline-flex px-1.5 py-0.5 text-xs rounded-full ${
                            entry.entityType === 'Transaction' ? 'bg-blue-100 text-blue-700' :
                            entry.entityType === 'Agent' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {entry.entityType}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{entry.entityName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{entry.details}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500">{formatDateTime(entry.timestamp)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{entry.actor}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
