import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { listAllAgentsFn, saveAgentProfileFn, deleteAgentFn } from '@/server/db.functions'
import { formatTZS, formatDate, statusColor } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, UserCheck, FlaskConical, Trash2 } from 'lucide-react'
import type { AgentProfile } from '@/lib/types'
import { useSettings } from '@/contexts/SettingsContext'

export const Route = createFileRoute('/admin/agents')({
  loader: () => listAllAgentsFn(),
  component: AdminAgents,
})

function AdminAgents() {
  const initial = Route.useLoaderData() as { real: AgentProfile[]; test: AgentProfile[] }
  const [agents, setAgents] = useState(initial.real)
  const [testAgents, setTestAgents] = useState(initial.test)
  const [showTestOnly, setShowTestOnly] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null)
  const { removeRegistrationAlert, addAuditEntry } = useSettings()

  const displayedAgents = showTestOnly ? testAgents : agents

  const updateStatus = async (agent: AgentProfile, status: 'approved' | 'rejected') => {
    setLoading(agent.id)
    try {
      const updated = { ...agent, status, updatedAt: new Date().toISOString() }
      await saveAgentProfileFn({ data: updated })
      if (agent.isTestAccount) {
        setTestAgents(prev => prev.map(a => a.id === agent.id ? updated : a))
      } else {
        setAgents(prev => prev.map(a => a.id === agent.id ? updated : a))
      }
      if (selectedAgent?.id === agent.id) setSelectedAgent(updated)
      if (status === 'approved') {
        removeRegistrationAlert(agent.email)
        addAuditEntry({
          action: `Agent ${status}`,
          entityType: 'Agent',
          entityName: agent.fullName,
          details: `Float: ${formatTZS(agent.floatBalance)} | Commission: ${agent.commissionRate}%`,
          actor: agent.fullName,
        })
      } else if (status === 'rejected') {
        removeRegistrationAlert(agent.email)
        addAuditEntry({
          action: `Agent ${status}`,
          entityType: 'Agent',
          entityName: agent.fullName,
          details: `Registration rejected`,
          actor: agent.fullName,
        })
      }
      setMessage(`Agent ${status} successfully`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(null)
    }
  }

  const handleDeleteTestAgent = async (agent: AgentProfile) => {
    if (!confirm(`Delete test agent "${agent.fullName}"? This cannot be undone.`)) return
    setLoading(agent.id)
    try {
      await deleteAgentFn({ data: { id: agent.id } })
      setTestAgents(prev => prev.filter(a => a.id !== agent.id))
      if (selectedAgent?.id === agent.id) setSelectedAgent(null)
      setMessage('Test agent deleted successfully')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-gray-500 text-sm mt-1">Manage agent registrations and accounts</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
            {agents.filter(a => a.status === 'pending').length} Pending
          </span>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
            {agents.filter(a => a.status === 'approved').length} Active
          </span>
          {testAgents.length > 0 && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              {testAgents.length} Test
            </span>
          )}
          <button
            onClick={() => setShowTestOnly(!showTestOnly)}
            className={`px-3 py-1 rounded-full font-medium transition-colors flex items-center gap-1 ${showTestOnly ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <FlaskConical className="w-3 h-3" />
            {showTestOnly ? 'Show All' : 'Test Only'}
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{message}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 border-b">
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Float Balance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedAgents.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{showTestOnly ? 'No test agents registered yet' : 'No agents registered yet'}</td></tr>
                ) : (
                  displayedAgents.map(agent => (
                    <tr
                      key={agent.id}
                      className={`hover:bg-gray-50 cursor-pointer ${agent.isTestAccount ? 'bg-blue-50/30' : ''}`}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-800">{agent.fullName}</div>
                          {agent.isTestAccount && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                              <FlaskConical className="w-2.5 h-2.5" /> TEST
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{agent.email}</div>
                        {agent.businessName && <div className="text-xs text-gray-400">{agent.businessName}</div>}
                        {agent.adminRequestedBy && <div className="text-xs text-blue-500">Linked: {agent.adminRequestedBy}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{agent.phone}</td>
                      <td className="px-4 py-3 font-medium">{formatTZS(agent.floatBalance)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(agent.status)}`}>
                          {agent.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : agent.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {agent.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {agent.status === 'pending' && (
                            <>
                              <button onClick={e => { e.stopPropagation(); updateStatus(agent, 'approved') }} disabled={loading === agent.id}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded disabled:opacity-50">Approve</button>
                              <button onClick={e => { e.stopPropagation(); updateStatus(agent, 'rejected') }} disabled={loading === agent.id}
                                className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded disabled:opacity-50">Reject</button>
                            </>
                          )}
                          {agent.status === 'approved' && (
                            <button onClick={e => { e.stopPropagation(); updateStatus(agent, 'rejected') }} disabled={loading === agent.id}
                              className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded disabled:opacity-50">Suspend</button>
                          )}
                          {agent.isTestAccount && (
                            <button onClick={e => { e.stopPropagation(); handleDeleteTestAgent(agent) }} disabled={loading === agent.id}
                              className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50" title="Delete test agent">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Agent Detail */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          {selectedAgent ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedAgent.isTestAccount ? 'bg-blue-100' : 'bg-green-100'}`}>
                  <UserCheck className={`w-6 h-6 ${selectedAgent.isTestAccount ? 'text-blue-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{selectedAgent.fullName}</h3>
                    {selectedAgent.isTestAccount && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700">
                        <FlaskConical className="w-2.5 h-2.5" /> TEST
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(selectedAgent.status)}`}>{selectedAgent.status}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium text-right">{selectedAgent.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{selectedAgent.phone}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">National ID</span><span className="font-medium">{selectedAgent.nationalId}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="font-medium text-right max-w-32 truncate">{selectedAgent.address}</span></div>
                {selectedAgent.businessName && (
                  <div className="flex justify-between"><span className="text-gray-500">Business</span><span className="font-medium">{selectedAgent.businessName}</span></div>
                )}
                {selectedAgent.adminRequestedBy && (
                  <div className="flex justify-between"><span className="text-gray-500">Linked Admin</span><span className="font-medium text-blue-600">{selectedAgent.adminRequestedBy}</span></div>
                )}
                <div className="border-t pt-2 space-y-2">
                  <div className="flex justify-between"><span className="text-gray-500">Float Balance</span><span className="font-bold text-green-600">{formatTZS(selectedAgent.floatBalance)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Commission Rate</span><span className="font-medium">{selectedAgent.commissionRate}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Commission Earned</span><span className="font-medium text-blue-600">{formatTZS(selectedAgent.commissionEarned)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Registered</span><span className="font-medium">{formatDate(selectedAgent.createdAt)}</span></div>
                </div>
                {selectedAgent.isTestAccount && (
                  <div className="border-t pt-3">
                    <button
                      onClick={() => handleDeleteTestAgent(selectedAgent)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Test Account
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select an agent to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
