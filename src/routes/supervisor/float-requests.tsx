import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { listFloatRequestsFn, listAgentsFn } from '@/server/db.functions'
import { formatTZS, formatDateTime } from '@/lib/utils'
import type { FloatRequest } from '@/lib/types'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { Search, TrendingUp, CheckCircle, XCircle, Clock, User } from 'lucide-react'

export const Route = createFileRoute('/supervisor/float-requests')({
  loader: async () => {
    const [floatRequests, agents] = await Promise.all([
      listFloatRequestsFn(),
      listAgentsFn(),
    ])
    return { floatRequests, agents }
  },
  component: SupervisorFloatRequestsPage,
})

function SupervisorFloatRequestsPage() {
  return (
    <SettingsProvider>
      <SupervisorFloatRequests />
    </SettingsProvider>
  )
}

function SupervisorFloatRequests() {
  const { floatRequests, agents } = Route.useLoaderData()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let filtered = floatRequests
    if (statusFilter !== 'all') filtered = filtered.filter(f => f.status === statusFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const agentMap = new Map(agents.map(a => [a.id, a.fullName]))
      filtered = filtered.filter(f => {
        const agentName = agentMap.get(f.agentId) || ''
        return agentName.toLowerCase().includes(q) || f.id.toLowerCase().includes(q)
      })
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [floatRequests, agents, statusFilter, searchQuery])

  const getAgentName = (agentId: string) => agents.find(a => a.id === agentId)?.fullName || 'Unknown Agent'

  const handleApprove = async (req: FloatRequest) => {
    setLoading(req.id)
    try {
      const updated = { ...req, status: 'approved' as const, updatedAt: new Date().toISOString() }
      await listFloatRequestsFn.save({ data: updated })
      window.location.reload()
    } finally { setLoading(null) }
  }

  const handleReject = async (req: FloatRequest) => {
    setLoading(req.id)
    try {
      const updated = { ...req, status: 'rejected' as const, updatedAt: new Date().toISOString() }
      await listFloatRequestsFn.save({ data: updated })
      window.location.reload()
    } finally { setLoading(null) }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700'
      case 'rejected': return 'bg-red-100 text-red-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Float Requests</h1>
        <p className="text-gray-500 text-sm mt-1">Review and manage float exchange requests from agents</p>
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
          placeholder="Search by agent name..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Network</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No float requests</td></tr>
              ) : filtered.map((req) => (
                <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{getAgentName(req.agentId)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{req.carrierNetwork}</td>
                  <td className="px-4 py-3 font-medium">{formatTZS(req.amount)}</td>
                  <td className="px-4 py-3">{req.exchangeType}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${statusColor(req.status)}`}>
                      {req.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                      {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {req.status === 'pending' && <Clock className="w-3 h-3" />}
                      {req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(req.createdAt)}</td>
                  <td className="px-4 py-3">
                    {req.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleApprove(req)} disabled={loading === req.id}
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50">
                          Approve
                        </button>
                        <button onClick={() => handleReject(req)} disabled={loading === req.id}
                          className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 disabled:opacity-50">
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}