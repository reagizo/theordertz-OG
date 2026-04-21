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
  listAllTransactionsFn,
  listAllAgentsFn,
  listAllCustomersFn,
  listAllFloatRequestsFn,
  listAllVendorsFn,
} from '@/server/db.functions'
import { formatTZS, formatDateTime, statusColor, serviceLabel, tierLabel } from '@/lib/utils'
import type { Transaction } from '@/lib/types'
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/components/AuthProvider'
import { supabaseAdmin } from '@/lib/supabase'
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  Search,
  ChevronDown,
  ChevronUp,
  Bell,
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
    const [transactionsResult, agentsResult, customersResult, floatRequestsResult, vendorsResult] = await Promise.all([
      listAllTransactionsFn(),
      listAllAgentsFn(),
      listAllCustomersFn(),
      listAllFloatRequestsFn(),
      listAllVendorsFn(),
    ])
    return { 
      transactions: transactionsResult, 
      agents: agentsResult, 
      customers: customersResult, 
      floatRequests: floatRequestsResult, 
      vendors: vendorsResult 
    }
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

type TabId = 'overview' | 'completed' | 'pending' | 'agents' | 'd2d' | 'premier' | 'vendors' | 'super_agents' | 'audit' | 'registrations'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'registrations', label: 'Registrations' },
  { id: 'completed', label: 'Completed' },
  { id: 'pending', label: 'Pending' },
  { id: 'agents', label: 'Super Agent Transactions' },
  { id: 'd2d', label: 'D2D Customers' },
  { id: 'premier', label: 'Premier Customers' },
  { id: 'vendors', label: 'Vendors' },
  { id: 'super_agents', label: 'Super Agents' },
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
  const data = Route.useLoaderData()
  const { user } = useAuth()
  
  const currentUserEmail = user?.email || ''
  const isTestAdmin = currentUserEmail === 'admin@example.com'
  const [registrationAlerts, setRegistrationAlerts] = useState<any[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  // Fetch registration alerts from Supabase
  useEffect(() => {
    const fetchAlerts = async () => {
      setLoadingAlerts(true)
      try {
        const { data, error } = await supabaseAdmin
          .from('registration_alerts')
          .select('*')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
        
        if (!error && data) {
          setRegistrationAlerts(data)
        }
      } catch (error) {
        console.error('Failed to fetch registration alerts:', error)
      } finally {
        setLoadingAlerts(false)
      }
    }
    fetchAlerts()
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])
  
  // Filter data based on user email
  const transactions = isTestAdmin 
    ? (data?.transactions?.test ?? []) 
    : (data?.transactions?.real ?? [])
  const agents = isTestAdmin 
    ? (data?.agents?.test ?? []) 
    : (data?.agents?.real ?? [])
  const customers = isTestAdmin 
    ? (data?.customers?.test ?? []) 
    : (data?.customers?.real ?? [])
  const floatRequests = isTestAdmin 
    ? (data?.floatRequests?.test ?? []) 
    : (data?.floatRequests?.real ?? [])
  const vendors = isTestAdmin 
    ? (data?.vendors?.test ?? []) 
    : (data?.vendors?.real ?? [])
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTx, setExpandedTx] = useState<string | null>(null)
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([])

  const handleApproveRegistration = async (alert: any) => {
    try {
      // Find the user in customers list and activate them in Supabase
      const customer = customers.find((c: any) => c.email === alert.email)
      if (customer) {
        // Update user is_active status in Supabase
        const { hasServiceRoleKey } = await import('@/lib/supabase')
        if (hasServiceRoleKey) {
          await supabaseAdmin
            .from('users')
            .update({ is_active: true })
            .eq('id', customer.id)
        }
        // Update customer status
        const updated = { ...customer, status: 'approved', updatedAt: new Date().toISOString() }
        // This would need to call saveCustomerProfileFn, but we don't have it imported here
        // For now, just mark the alert as read
      }
      // Mark alert as read in Supabase
      await supabaseAdmin
        .from('registration_alerts')
        .update({ is_read: true })
        .eq('id', alert.id)
      // Refresh alerts
      const { data: refreshedAlerts } = await supabaseAdmin
        .from('registration_alerts')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
      if (refreshedAlerts) {
        setRegistrationAlerts(refreshedAlerts)
      }
    } catch (error) {
      console.error('Failed to approve registration:', error)
    }
  }

  // Helper to get date from either snake_case or camelCase property
  const getDate = (obj: any) => (obj as any).created_at || obj.createdAt
  const getUpdatedAt = (obj: any) => (obj as any).updated_at || obj.updatedAt

  // Build audit trail from transactions
  useEffect(() => {
    const entries: AuditEntry[] = transactions
      .sort((a, b) => new Date(getUpdatedAt(b)).getTime() - new Date(getUpdatedAt(a)).getTime())
      .map((tx) => ({
        id: `audit-${tx.id}-${tx.status}`,
        timestamp: getUpdatedAt(tx),
        action: `Transaction ${tx.status}`,
        entityType: 'Transaction',
        entityName: `${tx.customerName} → ${tx.agentName}`,
        details: `${serviceLabel(tx.serviceType)} — ${formatTZS(tx.amount)} (${tierLabel(tx.customerTier)})`,
        actor: tx.agentName,
      }))

    const agentEntries: AuditEntry[] = agents
      .sort((a, b) => new Date(getUpdatedAt(b)).getTime() - new Date(getUpdatedAt(a)).getTime())
      .map((a) => ({
        id: `audit-agent-${a.id}`,
        timestamp: getUpdatedAt(a),
        action: `Agent ${a.status}`,
        entityType: 'Agent',
        entityName: a.fullName,
        details: `Float: ${formatTZS(a.floatBalance)} | Commission: ${a.commissionRate}%`,
        actor: a.fullName,
      }))

    const customerEntries: AuditEntry[] = customers
      .sort((a, b) => new Date(getUpdatedAt(b)).getTime() - new Date(getUpdatedAt(a)).getTime())
      .map((c) => ({
        id: `audit-customer-${c.id}`,
        timestamp: getUpdatedAt(c),
        action: `Customer ${c.status}`,
        entityType: 'Customer',
        entityName: c.fullName,
        details: `Tier: ${tierLabel(c.tier)} | Wallet: ${formatTZS(c.walletBalance)}`,
        actor: c.fullName,
      }))

    const vendorEntries: AuditEntry[] = vendors
      .sort((a, b) => new Date(getUpdatedAt(b)).getTime() - new Date(getUpdatedAt(a)).getTime())
      .map((v) => ({
        id: `audit-vendor-${v.id}`,
        timestamp: getUpdatedAt(v),
        action: `Vendor ${v.status}`,
        entityType: 'Vendor',
        entityName: v.fullName,
        details: `Business: ${v.businessName || 'N/A'} | Float: ${formatTZS(v.floatBalance)} | Commission: ${v.commissionRate}%`,
        actor: v.fullName,
      }))

    setAuditTrail([...entries, ...agentEntries, ...customerEntries, ...vendorEntries].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ))
  }, [transactions, agents, customers, vendors])

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
    const activeVendors = vendors.filter((v) => v.status === 'approved')

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
      totalVendors: vendors.length,
      activeVendors: activeVendors.length,
    }
  }, [transactions, agents, customers, floatRequests, vendors])

  // Chart data: Revenue by month
  const revenueData = useMemo(() => {
    const months: Record<string, number> = {}
    transactions
      .filter((t) => t.status === 'approved')
      .forEach((t) => {
        const dateStr = (t as any).created_at || t.createdAt
        if (!dateStr) return
        const d = new Date(dateStr)
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
      const dateStr = (t as any).created_at || t.createdAt
      if (!dateStr) return
      const key = dateStr.split('T')[0]
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
      .sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime()),
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
      .sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime()),
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
      .sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime()),
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
      .sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime()),
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
      .sort((a, b) => new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime()),
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
    labels: revenueData.labels,
    datasets: [
      {
        label: 'Revenue (TZS)',
        data: revenueData.values,
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
          <p className="font-medium">{formatDateTime(getDate(tx))}</p>
        </div>
        <div>
          <span className="text-gray-500">Updated</span>
          <p className="font-medium">{formatDateTime(getUpdatedAt(tx))}</p>
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
          <td className="px-4 py-3 text-gray-500 text-sm">{formatDateTime(getDate(tx))}</td>
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
      {/* Sync Status Component */}
      {/* <SyncStatus /> */} {/* Temporarily disabled - Firebase not configured */}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <KPICard
          icon={Activity}
          label="Total Amount of Transactions (Succeeded)"
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
          value={`${kpis.activeAgents} agents / ${kpis.totalCustomers} / ${kpis.activeVendors} vendors`}
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
          {activeTab === 'registrations' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Registration Alerts ({registrationAlerts.filter(a => !a.is_read).length} unread)
              </h3>
              {loadingAlerts ? (
                <p className="text-gray-500 text-sm">Loading...</p>
              ) : registrationAlerts.length === 0 ? (
                <p className="text-gray-500 text-sm py-8">No registration alerts</p>
              ) : (
                <div className="space-y-3">
                  {registrationAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${
                        alert.is_read
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Bell className={`w-4 h-4 ${alert.is_read ? 'text-gray-400' : 'text-yellow-600'}`} />
                            <span className="font-medium text-gray-900 text-sm">
                              {alert.alert_type === 'vendor' ? 'Vendor' : alert.alert_type === 'super_agent' ? 'Super Agent' : alert.alert_type === 'agent' ? 'Agent' : 'Customer'} Registration
                            </span>
                            {!alert.is_read && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">New</span>
                            )}
                            {alert.is_test_account && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">Test</span>
                            )}
                          </div>
                          <p className="text-gray-700 text-sm">{alert.name} - {alert.email}</p>
                          {alert.tier && (
                            <p className="text-gray-500 text-xs mt-0.5">Tier: {alert.tier}</p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">{alert.message}</p>
                          <p className="text-gray-400 text-xs mt-2">{formatDateTime(alert.created_at)}</p>
                        </div>
                        {!alert.is_read && (
                          <button
                            onClick={() => handleApproveRegistration(alert)}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Pending registrations notification */}
              {registrationAlerts.filter(a => !a.is_read).length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {registrationAlerts.filter(a => !a.is_read).length} Pending Registration{registrationAlerts.filter(a => !a.is_read).length > 1 ? 's' : ''}
                        </p>
                        <p className="text-sm text-gray-600">
                          Go to the Registrations tab to review and approve
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('registrations')}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm hover:bg-yellow-700"
                    >
                      View Registrations
                    </button>
                  </div>
                </div>
              )}

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

          {activeTab === 'vendors' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Vendors ({vendors.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Business Name</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Float Balance</th>
                      <th className="px-4 py-3">Commission Rate</th>
                      <th className="px-4 py-3">Commission Earned</th>
                      <th className="px-4 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No vendors found
                        </td>
                      </tr>
                    ) : (
                      vendors.map((v) => (
                        <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium">{v.fullName}</td>
                          <td className="px-4 py-3">{v.businessName || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(v.status)}`}>
                              {v.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">{formatTZS(v.floatBalance)}</td>
                          <td className="px-4 py-3">{v.commissionRate}%</td>
                          <td className="px-4 py-3">{formatTZS(v.commissionEarned)}</td>
                          <td className="px-4 py-3 text-gray-500 text-sm">{formatDateTime(getDate(v))}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'super_agents' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  Super Agents
                </h3>
              </div>
              <div className="text-gray-500 text-sm py-8">
                Super Agent management coming soon
              </div>
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
                            entry.entityType === 'Vendor' ? 'bg-teal-100 text-teal-700' :
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
