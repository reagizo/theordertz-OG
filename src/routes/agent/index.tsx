import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { getAgentProfileFn, listTransactionsByAgentFn, listFloatExchangesByAgentFn } from '@/server/db.functions'
import { formatTZS, formatDate, statusColor } from '@/lib/utils'
import { TrendingUp, ArrowLeftRight, DollarSign, Clock, Upload, X } from 'lucide-react'
import type { AgentProfile, Transaction, FloatExchange } from '@/lib/types'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/agent/')({
  component: AgentDashboard,
})

function AgentDashboard() {
  const { user } = useAuth()
  const pictureInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [floatExchanges, setFloatExchanges] = useState<FloatExchange[]>([])
  const [loading, setLoading] = useState(true)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    const saved = localStorage.getItem(`agent_picture_${user.id}`)
    if (saved) setProfilePicture(saved)

    async function load() {
      try {
        const [p, txs, fxs, picData] = await Promise.all([
          getAgentProfileFn({ data: { id: user!.id } }),
          listTransactionsByAgentFn({ data: { agentId: user!.id } }),
          listFloatExchangesByAgentFn({ data: { agentId: user!.id } }),
          supabase.from('users').select('profile_picture_url').eq('id', user.id).maybeSingle(),
        ])
        setProfile(p)
        setTransactions(txs)
        setFloatExchanges(fxs)
        if (picData?.data?.profile_picture_url && !saved) {
          setProfilePicture(picData.data.profile_picture_url)
          localStorage.setItem(`agent_picture_${user.id}`, picData.data.profile_picture_url)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      if (ev.target?.result) {
        const dataUrl = ev.target.result as string
        setProfilePicture(dataUrl)
        localStorage.setItem(`agent_picture_${user.id}`, dataUrl)
        await supabase.from('users').update({ profile_picture_url: dataUrl }).eq('id', user.id)
        await supabase.from('app_users').update({ profile_picture: dataUrl }).eq('id', user.id)
      }
    }
    reader.readAsDataURL(file)
  }

  const removePicture = async () => {
    if (!user?.id) return
    setProfilePicture(null)
    localStorage.removeItem(`agent_picture_${user.id}`)
    await supabase.from('users').update({ profile_picture_url: null }).eq('id', user.id)
    await supabase.from('app_users').update({ profile_picture: null }).eq('id', user.id)
  }
    localStorage.removeItem(`agent_picture_${user.id}`)
  }

  if (loading) return <div className="text-gray-400 text-sm py-8">Loading...</div>

  const pendingTx = transactions.filter(t => t.status === 'pending').length
  const approvedTx = transactions.filter(t => t.status === 'approved').length
  const recentTx = transactions.slice(0, 5)
  const pendingFx = floatExchanges.filter(f => f.status === 'pending').length

  const displayName = profile?.fullName ?? user?.email ?? 'Agent'
  const avatarLetter = displayName[0]?.toUpperCase() ?? '?'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Agent Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome, {displayName}
            {profile?.status === 'pending' && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">Account Pending Approval</span>
            )}
          </p>
        </div>
        {/* Profile Picture */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{displayName}</p>
            <p className="text-xs text-gray-500">{profile?.email ?? user?.email}</p>
          </div>
          {profilePicture ? (
            <div className="relative group">
              <img src={profilePicture} alt={displayName} className="w-14 h-14 rounded-full object-cover shadow ring-2 ring-gray-200" />
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 cursor-pointer" onClick={() => pictureInputRef.current?.click()}>
                <Upload className="w-4 h-4 text-white" />
              </div>
              <button onClick={removePicture} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow hover:bg-red-600">
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ) : (
            <div
              className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow ring-2 ring-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => pictureInputRef.current?.click()}
              title="Upload profile photo"
            >
              {avatarLetter}
            </div>
          )}
          <input ref={pictureInputRef} type="file" accept="image/*" onChange={handlePictureUpload} className="hidden" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-xl"><TrendingUp className="w-5 h-5 text-green-600" /></div>
          <div>
            <p className="text-xs text-gray-500">All Successful Amount Transactions</p>
            <p className="text-xl font-bold text-green-600">{formatTZS(transactions.filter(t => t.status === 'approved').reduce((s, t) => s + t.amount, 0))}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-xl"><DollarSign className="w-5 h-5 text-blue-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Number of Successful Transactions</p>
            <p className="text-xl font-bold text-blue-600">{approvedTx}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-xl"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Pending Transactions</p>
            <p className="text-xl font-bold text-amber-600">{pendingTx}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-xl"><ArrowLeftRight className="w-5 h-5 text-purple-600" /></div>
          <div>
            <p className="text-xs text-gray-500">Float Exchanges</p>
            <p className="text-xl font-bold text-purple-600">{pendingFx} pending</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {pendingFx > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          ⏳ You have {pendingFx} float exchange request(s) pending admin approval.
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Transactions</h3>
        {recentTx.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No transactions yet. Help customers request services.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Service</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Payment</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTx.map(tx => (
                  <tr key={tx.id}>
                    <td className="py-2.5 text-gray-800">{tx.customerName}</td>
                    <td className="py-2.5 text-gray-600">{tx.provider}</td>
                    <td className="py-2.5 font-medium">{formatTZS(tx.amount)}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs ${tx.isOnCredit ? 'bg-purple-100 text-purple-700' : tx.paymentMethod === 'cod' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {tx.isOnCredit ? 'OC' : tx.paymentMethod === 'cod' ? 'COD' : 'Credit'}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(tx.status)}`}>{tx.status}</span>
                    </td>
                    <td className="py-2.5 text-xs text-gray-400">{formatDate(tx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profile Info */}
      {profile && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Account Information</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Email:</span> <span className="font-medium ml-1">{profile.email}</span></div>
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium ml-1">{profile.phone}</span></div>
            <div><span className="text-gray-500">National ID:</span> <span className="font-medium ml-1">{profile.nationalId}</span></div>
            <div><span className="text-gray-500">Commission Rate:</span> <span className="font-medium ml-1">{profile.commissionRate}%</span></div>
            {profile.businessName && <div><span className="text-gray-500">Business:</span> <span className="font-medium ml-1">{profile.businessName}</span></div>}
            <div><span className="text-gray-500">Registered:</span> <span className="font-medium ml-1">{formatDate(profile.createdAt)}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
