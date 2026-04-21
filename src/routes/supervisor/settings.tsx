import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useSettings, type UserRole, type AppUser } from '@/contexts/SettingsContext'
import { Save, Upload, X, Check, KeyRound, User, Shield } from 'lucide-react'
import React from 'react'
import { uploadProfilePicture, syncRealAccountToSupabase } from '@/server/db.supabase'

export const Route = createFileRoute('/supervisor/settings')({
  component: SupervisorSettings,
})

function AvatarWithPicture({ picture, name, size = 'sm' }: { picture?: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
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
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  
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
            const result = await uploadProfilePicture({ data: { base64, fileName: file.name, userId } })
            if (result.success && result.url) {
              onUpload(result.url)
            } else {
              console.error('Failed to upload profile picture:', result.error)
              alert('Failed to upload profile picture')
            }
          } else {
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
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50">
          {uploading ? 'Uploading...' : <><Upload className="w-4 h-4" /> Upload Photo</>}
        </button>
        {currentPicture && (
          <button type="button" onClick={() => onUpload('')} className="ml-2 inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
            <X className="w-3 h-3" /> Remove
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
    </div>
  )
}

function SupervisorSettings() {
  const { settings, setSuperAgentName, updateUser } = useSettings()
  const [superAgentNameInput, setSuperAgentNameInput] = useState(settings.superAgentName)
  const [superAgentSaved, setSuperAgentSaved] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPicture, setEditPicture] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('mock.user')
      if (stored) {
        const user = JSON.parse(stored)
        setCurrentUserEmail(user?.email ?? null)
      }
    } catch {}
  }, [])

  const currentUser = settings.users.find(u => u.email === currentUserEmail)
  const isSuperAgent = currentUser?.role === 'SuperAgent'

  const handleSaveSuperAgent = () => {
    setSuperAgentName(superAgentNameInput)
    setSuperAgentSaved(true)
    setTimeout(() => setSuperAgentSaved(false), 2000)
  }

  const startEdit = (u: AppUser) => { setEditingUserId(u.id); setEditName(u.name); setEditEmail(u.email); setEditPicture(u.profilePicture ?? '') }
  const cancelEdit = () => setEditingUserId(null)
  const saveEdit = () => {
    if (!editingUserId || !editName.trim()) return
    updateUser(editingUserId, { name: editName.trim(), email: editEmail.trim(), profilePicture: editPicture || undefined })
    setEditingUserId(null)
  }

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordMsg('Please fill in all password fields.'); return }
    if (newPassword !== confirmPassword) { setPasswordMsg('New passwords do not match.'); return }
    if (newPassword.length < 6) { setPasswordMsg('Password must be at least 6 characters.'); return }
    setPasswordMsg('Password updated successfully!')
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setTimeout(() => setPasswordMsg(''), 3000)
  }

  if (!isSuperAgent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-300 text-sm mt-1">Manage your profile and account settings</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500">Only Super Agents can access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-300 text-sm mt-1">Manage Super Agent profile and settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 rounded-lg"><User className="w-5 h-5 text-indigo-600" /></div>
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          </div>
          {currentUser && (
            <div className="space-y-4">
              <ProfilePictureUploader currentPicture={currentUser.profilePicture} name={currentUser.name} onUpload={(pic) => updateUser(currentUser.id, { profilePicture: pic || undefined })} userId={currentUser.id} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input type="text" value={currentUser.name} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={currentUser.email} readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input type="text" value="Super Agent" readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg"><Shield className="w-5 h-5 text-green-600" /></div>
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

        <div className="border-t pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg"><KeyRound className="w-5 h-5 text-amber-600" /></div>
            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
          </div>
          <div className="space-y-3 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" placeholder="Enter current password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" placeholder="Enter new password" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" placeholder="Confirm new password" />
            </div>
            <button onClick={handleChangePassword} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg text-sm hover:bg-indigo-700 transition-colors">
              <KeyRound className="w-4 h-4" /> Update Password
            </button>
            {passwordMsg && <p className={`text-sm ${passwordMsg.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>{passwordMsg}</p>}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg"><Shield className="w-5 h-5 text-green-600" /></div>
          <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {settings.users.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No users</td></tr>
              ) : settings.users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <AvatarWithPicture picture={u.profilePicture} name={u.name} size="sm" />
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                      u.role === 'Admin' ? 'bg-red-100 text-red-700' : 
                      u.role === 'SuperAgent' ? 'bg-indigo-100 text-indigo-700' :
                      u.role === 'Agent' ? 'bg-orange-100 text-orange-700' :
                      u.role === 'Vendor' ? 'bg-teal-100 text-teal-700' :
                      'bg-green-100 text-green-700'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}