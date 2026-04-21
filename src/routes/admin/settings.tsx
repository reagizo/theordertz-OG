import { createFileRoute } from '@tanstack/react-router'
import React, { useState, useRef } from 'react'
import { useSettings, type UserRole, type AppUser, type CustomerTier } from '@/contexts/SettingsContext'
import {
  UserPlus, Save, Trash2, Edit2, Upload, X, Check, Shield, KeyRound, User,
  Bell, BellOff, AlertTriangle, Activity, FlaskConical, Users, RefreshCw,
} from 'lucide-react'
import { TEST_ADMIN_EMAIL, REAL_ADMIN_EMAIL } from '@/contexts/SettingsContext'
import { uploadProfilePicture, syncTestAccountToSupabase } from '@/server/db.supabase'

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettings,
})

const ROLES: UserRole[] = ['Admin', 'Supervisor', 'Clerk', 'Agent', 'Customer', 'Test', 'SuperAgent']

const ROLE_COLORS: Record<UserRole, string> = {
  Admin: 'bg-red-100 text-red-700',
  Supervisor: 'bg-purple-100 text-purple-700',
  SuperAgent: 'bg-indigo-100 text-indigo-700',
  Clerk: 'bg-blue-100 text-blue-700',
  Agent: 'bg-orange-100 text-orange-700',
  Customer: 'bg-green-100 text-green-700',
  Test: 'bg-gray-100 text-gray-700',
}

function AvatarWithPicture({ picture, name, size = 'md' }: { picture?: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' }
  if (picture) {
    return <img src={picture} alt={name} className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0 shadow ring-2 ring-gray-200`} />
  }
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow ring-2 ring-gray-200`}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

function ProfilePictureUploader({ currentPicture, name, onUpload, userId }: { currentPicture?: string; name: string; onUpload: (url: string) => void; userId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        if (ev.target?.result) {
          const base64 = ev.target.result as string
          if (userId) {
            // Upload to Supabase Storage
            const result = await uploadProfilePicture({ data: { base64, fileName: file.name, userId } })
            if (result.success && result.url) {
              onUpload(result.url)
            } else {
              console.error('Failed to upload profile picture:', result.error)
              alert('Failed to upload profile picture')
            }
          } else {
            // Fallback to base64 if no userId
            onUpload(base64)
          }
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      alert('Failed to upload profile picture')
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <div className="flex items-center gap-4">
      <AvatarWithPicture picture={currentPicture} name={name} size="lg" />
      <div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50">
          {uploading ? 'Uploading...' : <><Upload className="w-4 h-4" /> Upload Photo</>}
        </button>
        {currentPicture && (
          <button type="button" onClick={() => onUpload('')} className="ml-2 inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
            <X className="w-3 h-3" /> Remove
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <p className="text-xs text-gray-400 mt-1">JPG, PNG or SVG. Max 2MB.</p>
      </div>
    </div>
  )
}

function AdminSettings() {
  const { settings, setSuperAgentName, addUser, updateUser, removeUser, markAlertRead, clearAllAlerts, approvePasswordReset, rejectPasswordReset } = useSettings()

  const [superAgentNameInput, setSuperAgentNameInput] = useState(settings.superAgentName)
  const [superAgentSaved, setSuperAgentSaved] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('mock.user')
      if (stored) {
        const user = JSON.parse(stored)
        setCurrentUserEmail(user?.email ?? null)
      }
    } catch {}
  }, [])
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState<UserRole>('Clerk')
  const [newUserTier, setNewUserTier] = useState<CustomerTier>('d2d')
  const [newUserPicture, setNewUserPicture] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('Clerk')
  const [editPicture, setEditPicture] = useState('')
  const [editNewPassword, setEditNewPassword] = useState('')
  const [editConfirmPassword, setEditConfirmPassword] = useState('')
  const [editPictureInput, setEditPictureInput] = useState<HTMLInputElement | null>(null)
  const [settingsTab, setSettingsTab] = useState<'general' | 'alerts' | 'audit' | 'test-accounts' | 'super-agents' | 'password-resets'>('general')

  const isTestAdmin = currentUserEmail === TEST_ADMIN_EMAIL
  const isRealAdmin = currentUserEmail === REAL_ADMIN_EMAIL

  const filteredAlerts = settings.registrationAlerts.filter(alert => {
    if (isTestAdmin) return alert.isTestAccount === true
    if (isRealAdmin) return true  // Real admin sees all alerts (both test and real)
    return true
  })
  const unreadAlerts = filteredAlerts.filter(a => !a.read)

  const handleSaveSuperAgent = () => {
    setSuperAgentName(superAgentNameInput)
    setSuperAgentSaved(true)
    setTimeout(() => setSuperAgentSaved(false), 2000)
  }

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordMsg('Please fill in all password fields.'); return }
    if (newPassword !== confirmPassword) { setPasswordMsg('New passwords do not match.'); return }
    if (newPassword.length < 6) { setPasswordMsg('Password must be at least 6 characters.'); return }
    setPasswordMsg('Password updated successfully!')
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setTimeout(() => setPasswordMsg(''), 3000)
  }

  const handleAddUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim()) return
    if (!newUserPassword || newUserPassword.length < 6) { alert('Password must be at least 6 characters.'); return }
    if (newUserPassword !== newUserConfirmPassword) { alert('Passwords do not match.'); return }
    const newUser = addUser({ name: newUserName.trim(), email: newUserEmail.trim(), role: newUserRole, profilePicture: newUserPicture || undefined, password: newUserPassword })
    // Sync to Supabase
    if (newUserPicture) {
      syncTestAccountToSupabase({ data: { name: newUserName.trim(), email: newUserEmail.trim(), role: newUserRole, profilePicture: newUserPicture } })
    }
    setNewUserName(''); setNewUserEmail(''); setNewUserRole('Clerk'); setNewUserTier('d2d'); setNewUserPicture(''); setNewUserPassword(''); setNewUserConfirmPassword(''); setShowAddUser(false)
  }

  const startEdit = (u: AppUser) => { setEditingUserId(u.id); setEditName(u.name); setEditEmail(u.email); setEditRole(u.role); setEditPicture(u.profilePicture ?? ''); setEditNewPassword(''); setEditConfirmPassword('') }
  const cancelEdit = () => setEditingUserId(null)
  const saveEdit = () => {
    if (!editingUserId || !editName.trim()) return
    const updates: Partial<AppUser> = { name: editName.trim(), email: editEmail.trim(), role: editRole, profilePicture: editPicture || undefined }
    if (editNewPassword) {
      if (editNewPassword !== editConfirmPassword) { alert('Passwords do not match'); return }
      if (editNewPassword.length < 6) { alert('Password must be at least 6 characters'); return }
      updates.password = editNewPassword
    }
    updateUser(editingUserId, updates)
    setEditingUserId(null)
    setEditNewPassword('')
    setEditConfirmPassword('')
  }

  const handleEditPictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingUserId) return
    
    try {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        if (ev.target?.result) {
          const base64 = ev.target.result as string
          const result = await uploadProfilePicture({ data: { base64, fileName: file.name, userId: editingUserId } })
          if (result.success && result.url) {
            setEditPicture(result.url)
          } else {
            console.error('Failed to upload profile picture:', result.error)
            alert('Failed to upload profile picture')
          }
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      alert('Failed to upload profile picture')
    }
  }

  const formatDateTime = (d: string) => new Date(d).toLocaleString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Admin Settings</h1>
          <p className="text-gray-300 text-sm mt-1">Manage Super Agent name, password, users, and alerts</p>
        </div>
        {unreadAlerts.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
            <Bell className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">{unreadAlerts.length} new registration{unreadAlerts.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* Settings Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'general' as const, label: 'General', icon: User },
              { id: 'super-agents' as const, label: 'Super Agents', icon: Shield },
              { id: 'password-resets' as const, label: 'Password Resets', icon: RefreshCw },
              { id: 'alerts' as const, label: `Alerts${unreadAlerts.length > 0 ? ` (${unreadAlerts.length})` : ''}`, icon: Bell },
              { id: 'audit' as const, label: 'Audit Trail', icon: Activity },
              { id: 'test-accounts' as const, label: 'Test Accounts', icon: FlaskConical },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  settingsTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* General Tab */}
          {settingsTab === 'general' && (
            <div className="space-y-6">
              {/* Super Agent Name */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg"><User className="w-5 h-5 text-indigo-600" /></div>
                  <h2 className="text-lg font-semibold text-gray-900">Super Agent Name</h2>
                </div>
                <div className="flex items-center gap-3">
                  <input type="text" value={superAgentNameInput} onChange={(e) => setSuperAgentNameInput(e.target.value)} placeholder="Enter Super Agent name"
                    className="flex-1 max-w-md px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
                  <button onClick={handleSaveSuperAgent} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all text-sm">
                    <Save className="w-4 h-4" /> Save
                  </button>
                  {superAgentSaved && <span className="text-green-600 text-sm flex items-center gap-1"><Check className="w-4 h-4" /> Saved!</span>}
                </div>
                <p className="text-xs text-gray-400 mt-2">This name appears on customer confirmation screens and in the sidebar.</p>
              </div>

              {/* Change Password */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-100 rounded-lg"><KeyRound className="w-5 h-5 text-amber-600" /></div>
                  <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                </div>
                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" placeholder="Enter current password" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" placeholder="Enter new password" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" placeholder="Confirm new password" />
                  </div>
                  <button onClick={handleChangePassword} className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md transition-all text-sm">
                    <KeyRound className="w-4 h-4" /> Update Password
                  </button>
                  {passwordMsg && <p className={`text-sm ${passwordMsg.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{passwordMsg}</p>}
                </div>
              </div>

              {/* User Management */}
              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg"><Shield className="w-5 h-5 text-green-600" /></div>
                    <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                  </div>
                  <button onClick={() => setShowAddUser(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors text-sm">
                    <UserPlus className="w-4 h-4" /> Add User
                  </button>
                </div>

                {showAddUser && (
                  <div className="mb-6 p-5 bg-white rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-700">Add New User</h3>
                      <button onClick={() => setShowAddUser(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                    </div>
                    <ProfilePictureUploader currentPicture={newUserPicture} name={newUserName || 'New User'} onUpload={setNewUserPicture} userId="new-user" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" placeholder="Full name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" placeholder="email@example.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" placeholder="Min. 6 characters" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <input type="password" value={newUserConfirmPassword} onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" placeholder="Re-enter password" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      {newUserRole === 'Customer' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Customer Tier</label>
                          <select value={newUserTier} onChange={(e) => setNewUserTier(e.target.value as CustomerTier)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
                            <option value="d2d">Day-to-Day (D2D)</option>
                            <option value="premier">Premier</option>
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={handleAddUser} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm hover:bg-indigo-700">
                        <UserPlus className="w-4 h-4" /> Add User
                      </button>
                      <button onClick={() => setShowAddUser(false)} className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg text-sm hover:bg-gray-300">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Password</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings.users.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No users added yet. Click "Add User" to get started.</td></tr>
                      ) : (
                        settings.users.map((u) => {
                          const isEditing = editingUserId === u.id
                          return (
                            <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              {isEditing ? (
                                <>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="relative">
                                        <AvatarWithPicture picture={editPicture} name={editName} size="sm" />
                                        <button 
                                          type="button"
                                          onClick={() => editPictureInput?.click()}
                                          className="absolute bottom-0 right-0 p-1 bg-indigo-600 rounded-full text-white hover:bg-indigo-700"
                                        >
                                          <Upload className="w-3 h-3" />
                                        </button>
                                        <input 
                                          ref={(el) => setEditPictureInput(el)}
                                          type="file" 
                                          accept="image/*" 
                                          onChange={handleEditPictureUpload} 
                                          className="hidden" 
                                        />
                                      </div>
                                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                                        className="px-2 py-1 border border-gray-200 rounded text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                                      className="px-2 py-1 border border-gray-200 rounded text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                                  </td>
                                  <td className="px-4 py-3">
                                    <select value={editRole} onChange={(e) => setEditRole(e.target.value as UserRole)}
                                      className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-2">
                                      <input 
                                        type="password" 
                                        value={editNewPassword} 
                                        onChange={(e) => setEditNewPassword(e.target.value)}
                                        placeholder="New password"
                                        className="px-2 py-1 border border-gray-200 rounded text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" 
                                      />
                                      <input 
                                        type="password" 
                                        value={editConfirmPassword} 
                                        onChange={(e) => setEditConfirmPassword(e.target.value)}
                                        placeholder="Confirm password"
                                        className="px-2 py-1 border border-gray-200 rounded text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" 
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-gray-500">—</td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={saveEdit} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="Save"><Check className="w-4 h-4" /></button>
                                      <button onClick={cancelEdit} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors" title="Cancel"><X className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                      <AvatarWithPicture picture={u.profilePicture} name={u.name} size="sm" />
                                      <span className="font-medium text-gray-900">{u.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                                  </td>
                                  <td className="px-4 py-3 text-gray-500 text-xs">••••••••</td>
                                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => startEdit(u)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                                      <button onClick={() => removeUser(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Registration Alerts Tab */}
          {settingsTab === 'alerts' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Registration Alerts</h2>
                {filteredAlerts.length > 0 && (
                  <button onClick={clearAllAlerts} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                    <BellOff className="w-4 h-4" /> Clear All
                  </button>
                )}
              </div>
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No registration alerts yet.</p>
                  <p className="text-xs text-gray-400 mt-1">When agents or customers register, alerts will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                        alert.read ? 'bg-gray-50 border-gray-100' : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${
                        alert.type === 'agent' ? 'bg-orange-100' : 'bg-green-100'
                      }`}>
                        {alert.type === 'agent'
                          ? <Shield className="w-4 h-4 text-orange-600" />
                          : <User className="w-4 h-4 text-green-600" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">{alert.name}</span>
                          <span className={`inline-flex px-1.5 py-0.5 text-xs rounded-full ${
                            alert.type === 'agent' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {alert.type === 'agent' ? 'Agent Registration' : `Customer (${alert.tier === 'premier' ? 'Premier' : 'D2D'})`}
                          </span>
                          {!alert.read && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs rounded-full bg-red-100 text-red-700">New</span>
                          )}
                          {alert.isTestAccount && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">TEST</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{alert.email}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(alert.createdAt)}</p>
                      </div>
                      {!alert.read && (
                        <button
                          onClick={() => markAlertRead(alert.id)}
                          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Audit Trail Tab */}
          {settingsTab === 'audit' && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Trail</h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No audit entries yet.</p>
                  </div>
                ) : (
                  filteredAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="mt-0.5">
                        <Activity className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">{alert.type === 'agent' ? 'Agent Registered' : 'Customer Registered'}</span>
                          <span className={`inline-flex px-1.5 py-0.5 text-xs rounded-full ${
                            alert.type === 'agent' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {alert.type === 'agent' ? 'Agent' : `Customer ${alert.tier === 'premier' ? '(Premier)' : '(D2D)'}`}
                          </span>
                          {alert.isTestAccount && (
                            <span className="inline-flex px-1.5 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">TEST</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5">{alert.name} — {alert.email}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{alert.message}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500">{formatDateTime(alert.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Test Accounts Tab */}
          {settingsTab === 'test-accounts' && (
            <div className="space-y-6">
              {isTestAdmin && (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Test Accounts</h2>
                    <p className="text-sm text-gray-500">
                      These accounts are linked to the test environment (admin@example.com). All registrations starting with "Test-" are captured here.
                    </p>
                  </div>
                  {settings.testAccounts.length === 0 ? (
                    <div className="text-center py-8">
                      <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No test accounts registered yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Accounts with "Test-" in name or email will appear here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settings.testAccounts.map((u) => (
                            <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                              <td className="px-4 py-3 text-gray-600">{u.email}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {isRealAdmin && (
                <>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Real Accounts</h2>
                    <p className="text-sm text-gray-500">
                      These accounts are linked to the production environment (rkaijage@gmail.com). All registrations without "Test-" are captured here.
                    </p>
                  </div>
                  {settings.realAccounts.length === 0 ? (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No real accounts registered yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Accounts without "Test-" in name or email will appear here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settings.realAccounts.map((u) => (
                            <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                              <td className="px-4 py-3 text-gray-600">{u.email}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                              </td>
                              <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {!isTestAdmin && !isRealAdmin && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">You do not have permission to view account listings.</p>
                  <p className="text-xs text-gray-400 mt-1">Only admin@example.com (Test) or rkaijage@gmail.com (Real) can view accounts.</p>
                </div>
              )}

              {/* Clear Test Data */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Clear All Test Data
                </h3>
                <p className="text-xs text-red-600 mb-3">
                  This will permanently delete ALL test account data (transactions, profiles, float exchanges).
                  Real production data will NOT be affected. This action cannot be undone.
                </p>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear ALL test data? This cannot be undone.')) {
                      const testStores = ['test-agents', 'test-customers', 'test-transactions', 'test-float-requests', 'test-float-exchanges']
                      testStores.forEach(store => {
                        const keys = Object.keys(localStorage).filter(k => k.startsWith(store))
                        keys.forEach(k => localStorage.removeItem(k))
                      })
                      alert('All test data has been cleared.')
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  Clear All Test Data
                </button>
              </div>
            </div>
          )}

          {/* Super Agents Tab */}
          {settingsTab === 'super-agents' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Super Agents Management</h2>
                <p className="text-sm text-gray-500">
                  Register and manage Super Agents who can supervise transactions and manage agents.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg"><UserPlus className="w-5 h-5 text-indigo-600" /></div>
                  <h3 className="font-semibold text-gray-900">Register New Super Agent</h3>
                </div>
                <ProfilePictureUploader currentPicture={newUserPicture} name={newUserName || 'New Super Agent'} onUpload={setNewUserPicture} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Full name" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="email@example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Min. 6 characters" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input type="password" value={newUserConfirmPassword} onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Re-enter password" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { if (newUserName && newUserEmail && newUserPassword === newUserConfirmPassword && newUserPassword.length >= 6) { addUser({ name: newUserName, email: newUserEmail, role: 'SuperAgent', profilePicture: newUserPicture || undefined, password: newUserPassword }); setNewUserName(''); setNewUserEmail(''); setNewUserPicture(''); setNewUserPassword(''); setNewUserConfirmPassword('') } else { alert('Please fill all fields correctly') } }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm">
                    <UserPlus className="w-4 h-4" /> Add Super Agent
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.users.filter(u => u.role === 'SuperAgent').length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No Super Agents registered yet.</td></tr>
                    ) : (
                      settings.users.filter(u => u.role === 'SuperAgent').map((u) => (
                        <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <AvatarWithPicture picture={u.profilePicture} name={u.name} size="sm" />
                              <span className="font-medium text-gray-900">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">Super Agent</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => startEdit(u)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Edit"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => removeUser(u.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Password Resets Tab */}
          {settingsTab === 'password-resets' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Password Reset Requests</h2>
                <p className="text-sm text-gray-500">
                  Review and approve password reset requests from users.
                </p>
              </div>

              {settings.passwordResets.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No password reset requests.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {settings.passwordResets.map((reset) => (
                    <div key={reset.id} className={`flex items-start gap-3 p-4 rounded-xl border ${
                      reset.status === 'pending' ? 'bg-amber-50 border-amber-200' : reset.status === 'approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="mt-0.5 p-2 rounded-lg flex-shrink-0 bg-white/50">
                        <KeyRound className={`w-4 h-4 ${reset.status === 'pending' ? 'text-amber-600' : reset.status === 'approved' ? 'text-green-600' : 'text-red-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 text-sm">{reset.email}</span>
                          <span className={`inline-flex px-1.5 py-0.5 text-xs rounded-full ${
                            reset.status === 'pending' ? 'bg-amber-100 text-amber-700' : reset.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {reset.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Requested: {new Date(reset.requestedAt).toLocaleString()}</p>
                        {reset.processedAt && (
                          <p className="text-xs text-gray-500">Processed: {new Date(reset.processedAt).toLocaleString()}</p>
                        )}
                      </div>
                      {reset.status === 'pending' && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => { approvePasswordReset(reset.id); alert('Password reset approved.') }} className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">Approve</button>
                          <button onClick={() => { rejectPasswordReset(reset.id); alert('Password reset rejected.') }} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200">Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
