import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { listFloatRequestsFn, saveFloatRequestFn, getAgentProfileFn, saveAgentProfileFn, listFloatExchangesFn, saveFloatExchangeFn } from '@/server/db.functions'
import { formatTZS, formatDateTime, statusColor, carrierLabel } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, TrendingUp, ArrowLeftRight, AlertCircle } from 'lucide-react'
import type { FloatRequest, FloatExchange } from '@/lib/types'

export const Route = createFileRoute('/admin/float-requests')({
  loader: async () => {
    const [floatRequests, floatExchanges] = await Promise.all([
      listFloatRequestsFn(),
      listFloatExchangesFn(),
    ])
    return { floatRequests, floatExchanges }
  },
  component: AdminFloatRequests,
})

function AdminFloatRequests() {
  const { floatRequests, floatExchanges } = Route.useLoaderData() as {
    floatRequests: FloatRequest[]
    floatExchanges: FloatExchange[]
  }
  const [requests, setRequests] = useState(floatRequests)
  const [exchanges, setExchanges] = useState(floatExchanges)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'float' | 'exchange'>('exchange')

  const updateFloatStatus = async (req: FloatRequest, status: 'approved' | 'rejected') => {
    setLoading(req.id)
    try {
      const updated: FloatRequest = {
        ...req,
        status,
        adminNotes: adminNotes[req.id] || undefined,
        updatedAt: new Date().toISOString(),
      }
      await saveFloatRequestFn({ data: updated })

      if (status === 'approved') {
        const agent = await getAgentProfileFn({ data: { id: req.agentId } })
        if (agent) {
          await saveAgentProfileFn({
            data: { ...agent, floatBalance: agent.floatBalance + req.amount, updatedAt: new Date().toISOString() },
          })
        }
      }

      setRequests(prev => prev.map(r => r.id === req.id ? updated : r))
      setMessage(`Float request ${status}`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(null)
    }
  }

  const updateExchangeStatus = async (ex: FloatExchange, status: 'approved' | 'rejected') => {
    setLoading(ex.id)
    try {
      const rejectionReason = rejectionReasons[ex.id]
      const updated: FloatExchange & { rejectionReason?: string } = {
        ...ex,
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
        updatedAt: new Date().toISOString(),
      }
      await saveFloatExchangeFn({ data: updated })
      setExchanges(prev => prev.map(e => e.id === ex.id ? updated : e))
      setMessage(`Float exchange ${status}${status === 'rejected' && rejectionReason ? ` — Reason: ${rejectionReason}` : ''}`)
      setShowRejectModal(null)
      setRejectionReasons(prev => { const n = { ...prev }; delete n[ex.id]; return n })
      setTimeout(() => setMessage(''), 4000)
    } finally {
      setLoading(null)
    }
  }

  const pendingExchanges = exchanges.filter(e => e.status === 'pending').length
  const pendingRequests = requests.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Float Management</h1>
        <p className="text-gray-500 text-sm mt-1">Review and approve float requests and exchanges</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('exchange')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'exchange' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          Float Exchanges ({pendingExchanges} pending)
        </button>
        <button
          onClick={() => setActiveTab('float')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'float' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          Float Requests ({pendingRequests} pending)
        </button>
      </div>

      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{message}</div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Reject Float Exchange</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Provide a reason for rejection. This will be visible to the agent.
            </p>
            <textarea
              value={rejectionReasons[showRejectModal] || ''}
              onChange={(e) => setRejectionReasons(prev => ({ ...prev, [showRejectModal]: e.target.value }))}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const ex = exchanges.find(e => e.id === showRejectModal)
                  if (ex) updateExchangeStatus(ex, 'rejected')
                }}
                disabled={!rejectionReasons[showRejectModal]?.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Float Exchanges Tab */}
      {activeTab === 'exchange' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-green-600" />
              Float Exchange Requests
            </h3>
            <span className="text-xs text-gray-500">{exchanges.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 border-b">
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Super Agent Code</th>
                  <th className="px-4 py-3 font-medium">Carrier</th>
                  <th className="px-4 py-3 font-medium">Receiving Code</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {exchanges.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No float exchange requests</td></tr>
                ) : (
                  exchanges.map(ex => (
                    <tr key={ex.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{ex.agentName}</div>
                        <div className="text-xs text-gray-400">{ex.agentId.substring(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ex.superAgentDepCode}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{carrierLabel(ex.carrierType)}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ex.agentDepReceivingCode || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{ex.referenceCode || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(ex.status)}`}>
                          {ex.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : ex.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {ex.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(ex.createdAt)}</td>
                      <td className="px-4 py-3">
                        {ex.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => updateExchangeStatus(ex, 'approved')} disabled={loading === ex.id}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg disabled:opacity-50">
                              Approve
                            </button>
                            <button onClick={() => setShowRejectModal(ex.id)} disabled={loading === ex.id}
                              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-lg disabled:opacity-50">
                              Reject
                            </button>
                          </div>
                        )}
                        {ex.status === 'rejected' && (
                          <div className="text-xs text-red-600 max-w-32 truncate" title={(ex as any).rejectionReason}>
                            {(ex as any).rejectionReason || '—'}
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
      )}

      {/* Float Requests Tab (Legacy) */}
      {activeTab === 'float' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Float Top-Up Requests
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 border-b">
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Admin Notes</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No float requests</td></tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{req.agentName}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-green-700">{formatTZS(req.amount)}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-32 truncate">{req.notes || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(req.status)}`}>
                          {req.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : req.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDateTime(req.createdAt)}</td>
                      <td className="px-4 py-3">
                        {req.status === 'pending' ? (
                          <input
                            value={adminNotes[req.id] || ''}
                            onChange={e => setAdminNotes(n => ({ ...n, [req.id]: e.target.value }))}
                            placeholder="Optional notes..."
                            className="w-40 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                          />
                        ) : (
                          <span className="text-xs text-gray-500">{req.adminNotes || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {req.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => updateFloatStatus(req, 'approved')} disabled={loading === req.id}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg disabled:opacity-50">
                              Approve
                            </button>
                            <button onClick={() => updateFloatStatus(req, 'rejected')} disabled={loading === req.id}
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
      )}
    </div>
  )
}
