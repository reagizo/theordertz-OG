import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { listSuperAgentsFn, saveSuperAgentProfileFn, deleteSuperAgentFn, saveAppUserFn } from '@/server/db.functions'
import { formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, UserPlus, Trash2, Edit, Shield, Upload, X, Camera } from 'lucide-react'
import type { SuperAgentProfile } from '@/lib/types'
import { generateId } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'

export const Route = createFileRoute('/admin/super-agents')({
  loader: async () => {
    try {
      const data = await listSuperAgentsFn()
      return data || []
    } catch (err) {
      console.error('Super Agents loader error:', err)
      return []
    }
  },
  component: AdminSuperAgents,
  errorComponent: () => (
    <div className="p-6 text-center">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Super Agents Table Not Found</h2>
      <p className="text-gray-500 mb-4">The super_agents table doesn't exist in your database.</p>
      <p className="text-sm text-gray-400">Please run the migration SQL in Supabase SQL Editor.</p>
    </div>
  ),
})

function AdminSuperAgents() {
  const initial = Route.useLoaderData() as SuperAgentProfile[]
  const [superAgents, setSuperAgents] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingAgent, setEditingAgent] = useState<SuperAgentProfile | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
    profilePicture: '',
    createUserAccount: true,
    password: '',
  })
  const [profilePicture, setProfilePicture] = useState<string>('')
  const pictureInputRef = useRef<HTMLInputElement>(null)
  const { addAuditEntry } = useSettings()

  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setMessage('Image must be less than 2MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { 
      if (ev.target?.result) {
        setProfilePicture(ev.target.result as string)
        setForm(f => ({ ...f, profilePicture: ev.target!.result as string }))
      }
    }
    reader.readAsDataURL(file)
  }

  const handleOpenForm = (agent?: SuperAgentProfile) => {
    if (agent) {
      setEditingAgent(agent)
      setProfilePicture(agent.profilePicture || '')
      setForm({
        fullName: agent.fullName,
        email: agent.email,
        phone: agent.phone,
        status: agent.status,
        profilePicture: agent.profilePicture || '',
        createUserAccount: false,
        password: '',
      })
    } else {
      setEditingAgent(null)
      setProfilePicture('')
      setForm({
        fullName: '',
        email: '',
        phone: '',
        status: 'active' as 'active' | 'inactive' | 'pending',
        profilePicture: '',
        createUserAccount: true,
        password: '',
      })
    }
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingAgent(null)
    setProfilePicture('')
    setForm({ fullName: '', email: '', phone: '', status: 'active', profilePicture: '', createUserAccount: true, password: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName || !form.email) {
      setMessage('Full name and email are required')
      return
    }
    if (form.createUserAccount && !editingAgent && !form.password) {
      setMessage('Password is required when creating user account')
      return
    }

    setLoading('saving')
    try {
      const now = new Date().toISOString()
      let userId = editingAgent?.userId

      if (form.createUserAccount && !editingAgent) {
        const appUser = {
          id: generateId(),
          name: form.fullName,
          email: form.email,
          role: 'super_agent',
          profile_picture: profilePicture || null,
          password: form.password,
        }
        await saveAppUserFn({ data: appUser })
        userId = appUser.id
      }

      const profile: SuperAgentProfile = {
        id: editingAgent?.id || generateId(),
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        status: form.status,
        createdAt: editingAgent?.createdAt || now,
        updatedAt: now,
        isTestAccount: form.email.toLowerCase().includes('test'),
        adminRequestedBy: 'admin',
        profilePicture: profilePicture || editingAgent?.profilePicture,
        userId: userId,
      }

      await saveSuperAgentProfileFn({ data: profile })

      if (editingAgent) {
        setSuperAgents(prev => prev.map(a => a.id === editingAgent.id ? profile : a))
        setMessage('Super Agent updated successfully')
      } else {
        setSuperAgents(prev => [profile, ...prev])
        setMessage('Super Agent added successfully! ' + (form.createUserAccount ? 'User account created.' : ''))
      }

      addAuditEntry({
        action: editingAgent ? 'Super Agent Updated' : 'Super Agent Added',
        entityType: 'SuperAgent',
        entityName: form.fullName,
        details: `Email: ${form.email} | Status: ${form.status}${userId ? ' | User account created' : ''}`,
        actor: form.fullName,
      })

      handleCloseForm()
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Error saving super agent:', err)
      setMessage('Failed to save. Email may already exist.')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (agent: SuperAgentProfile) => {
    if (!confirm(`Delete Super Agent "${agent.fullName}"? This cannot be undone.`)) return
    setLoading(agent.id)
    try {
      await deleteSuperAgentFn({ data: { id: agent.id } })
      setSuperAgents(prev => prev.filter(a => a.id !== agent.id))
      setMessage('Super Agent deleted successfully')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      console.error('Error deleting super agent:', err)
      setMessage('Failed to delete')
    } finally {
      setLoading(null)
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'active') {
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
    } else if (status === 'inactive') {
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Inactive</span>
    }
    return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">Pending</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Agents</h1>
          <p className="text-gray-500 text-sm mt-1">Manage Super Agent accounts</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-600"
        >
          <UserPlus className="w-4 h-4" />
          Add Super Agent
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.includes('Failed') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{superAgents.filter(a => a.status === 'active').length}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{superAgents.filter(a => a.status === 'pending').length}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Shield className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{superAgents.length}</p>
              <p className="text-sm text-gray-500">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Super Agent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {superAgents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No Super Agents yet. Click "Add Super Agent" to create one.
                  </td>
                </tr>
              ) : (
                superAgents.map(agent => (
                  <tr key={agent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {agent.profilePicture ? (
                          <img src={agent.profilePicture} alt={agent.fullName} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold text-sm">
                            {agent.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-900">{agent.fullName}</span>
                          {agent.userId && <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Has Account</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{agent.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{agent.phone || '—'}</td>
                    <td className="px-4 py-3">{statusBadge(agent.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(agent.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenForm(agent)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(agent)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                          disabled={loading === agent.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAgent ? 'Edit Super Agent' : 'Add Super Agent'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Profile Picture */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => pictureInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700"
                  >
                    <Upload className="w-3 h-3" />
                  </button>
                </div>
                <input
                  ref={pictureInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePictureUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2">Profile Picture</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              
              {/* Create User Account Section - Only for new Super Agents */}
              {!editingAgent && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="createUserAccount"
                      checked={form.createUserAccount}
                      onChange={e => setForm(f => ({ ...f, createUserAccount: e.target.checked }))}
                      className="w-4 h-4 accent-green-600"
                    />
                    <label htmlFor="createUserAccount" className="text-sm font-medium text-gray-700">
                      Create user account for login
                    </label>
                  </div>
                  {form.createUserAccount && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Min. 8 characters"
                        minLength={8}
                        required={form.createUserAccount}
                      />
                      <p className="text-xs text-gray-500 mt-1">Super Agent can use this to log in independently</p>
                    </div>
                  )}
                </div>
              )}
              
              {editingAgent && editingAgent.userId && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                  <p><strong>User Account:</strong> Created</p>
                  <p className="text-xs text-blue-500 mt-1">This Super Agent has a user account and can log in independently.</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading === 'saving'}
                  className="flex-1 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                >
                  {loading === 'saving' ? 'Saving...' : (editingAgent ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
