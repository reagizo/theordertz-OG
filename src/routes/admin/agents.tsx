import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { listAllAgentsFn, saveAgentProfileFn } from '@/server/db.functions'
import { formatTZS, formatDate, statusColor } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, UserCheck, Bell } from 'lucide-react'
import type { AgentProfile } from '@/lib/types'
import { supabaseAdmin } from '@/lib/supabase'

export const Route = createFileRoute('/admin/agents')({
  loader: async () => {
    const result = await listAllAgentsFn()
    return result
  },
  component: AdminAgents,
})

function AdminAgents() {
  const { user } = useAuth()
  const data = Route.useLoaderData() as { real?: AgentProfile[]; test?: AgentProfile[] }

  const currentUserEmail = user?.email || ''
  const isTestAdmin = currentUserEmail === 'admin@example.com'

  // Filter data based on user email
  const initial = isTestAdmin
    ? (data?.test ?? [])
    : (data?.real ?? [])
  const [agents, setAgents] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null)
  const [registrationAlerts, setRegistrationAlerts] = useState<any[]>([])

  // Fetch registration alerts from Supabase
  useEffect(() => {
    const fetchAlerts = async () => {
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
      }
    }
    fetchAlerts()
  }, [])

  const updateStatus = async (agent: AgentProfile, status: 'approved' | 'rejected') => {
    setLoading(agent.id)
    try {
      const updated = { ...agent, status, updatedAt: new Date().toISOString() }
      await saveAgentProfileFn({ data: updated })
      setAgents(prev => prev.map(a => a.id === agent.id ? updated : a))
      if (selectedAgent?.id === agent.id) setSelectedAgent(updated)
      setMessage(`Agent ${status} successfully`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(null)
    }
  }

  const handleApproveRegistration = async (alert: any) => {
    setLoading(alert.id)
    try {
      // Create user in users table
      const tempPassword = 'Temp123!'
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email: alert.email,
          password_hash: tempPassword,
          full_name: alert.name || alert.email,
          role: alert.alert_type,
          is_test_account: alert.is_test_account,
          is_active: true,
        })
        .select()
        .single()

      if (createError) throw createError

      // Create agent record
      if (alert.alert_type === 'agent') {
        await supabaseAdmin
          .from('agents')
          .insert({
            id: newUser.id,
            business_name: alert.name || alert.email,
            status: 'approved',
            float_balance: 0,
            commission_rate: 2.50,
            commission_earned: 0,
          })

        // Refresh agents list
        const result = await listAllAgentsFn()
        const newData = isTestAdmin ? (result?.test ?? []) : (result?.real ?? [])
        setAgents(newData)
      }

      // Mark alert as read
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

      setMessage(`Registration approved for ${alert.email}`)
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Failed to approve registration:', error)
      setMessage('Failed to approve registration')
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-gray-300 text-sm mt-1">Manage agent registrations and accounts</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
            {registrationAlerts.filter(a => a.alert_type === 'agent').length} Pending Registrations
          </span>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
            {agents.filter(a => a.status === 'pending').length} Pending Agents
          </span>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
            {agents.filter(a => a.status === 'approved').length} Active
          </span>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{message}</div>
      )}

      {/* Registration Alerts Section */}
      {registrationAlerts.filter(a => a.alert_type === 'agent').length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-600" />
            Pending Agent Registrations ({registrationAlerts.filter(a => a.alert_type === 'agent').length})
          </h3>
          <div className="space-y-2">
            {registrationAlerts
              .filter(a => a.alert_type === 'agent')
              .map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-100"
                >
                  <div>
                    <p className="font-medium text-gray-900">{alert.name}</p>
                    <p className="text-sm text-gray-600">{alert.email}</p>
                    <p className="text-xs text-gray-400">{new Date(alert.created_at).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleApproveRegistration(alert)}
                    disabled={loading === alert.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading === alert.id ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              ))}
          </div>
        </div>
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
                {agents.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No agents registered yet</td></tr>
                ) : (
                  agents.map(agent => (
                    <tr
                      key={agent.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{agent.fullName}</div>
                        <div className="text-xs text-gray-400">{agent.email}</div>
                        {agent.businessName && <div className="text-xs text-gray-400">{agent.businessName}</div>}
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
                        {agent.status === 'pending' && (
                          <div className="flex gap-1">
                            <button onClick={e => { e.stopPropagation(); updateStatus(agent, 'approved') }} disabled={loading === agent.id}
                              className="px-2 py-1 bg-green-600 text-white text-xs rounded disabled:opacity-50">Approve</button>
                            <button onClick={e => { e.stopPropagation(); updateStatus(agent, 'rejected') }} disabled={loading === agent.id}
                              className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded disabled:opacity-50">Reject</button>
                          </div>
                        )}
                        {agent.status === 'approved' && (
                          <button onClick={e => { e.stopPropagation(); updateStatus(agent, 'rejected') }} disabled={loading === agent.id}
                            className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded disabled:opacity-50">Suspend</button>
                        )}
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
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedAgent.fullName}</h3>
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
                <div className="border-t pt-2 space-y-2">
                  <div className="flex justify-between"><span className="text-gray-500">Float Balance</span><span className="font-bold text-green-600">{formatTZS(selectedAgent.floatBalance)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Commission Rate</span><span className="font-medium">{selectedAgent.commissionRate}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Commission Earned</span><span className="font-medium text-blue-600">{formatTZS(selectedAgent.commissionEarned)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Registered</span><span className="font-medium">{formatDate(selectedAgent.createdAt)}</span></div>
                </div>
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
