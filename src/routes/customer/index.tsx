import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { getCustomerProfileFn, listTransactionsByCustomerFn } from '@/server/db.functions'
import { formatTZS, formatDate, statusColor, tierLabel } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { Wallet, ArrowUpRight, Clock, CheckCircle, CreditCard, Upload, X } from 'lucide-react'
import type { CustomerProfile, Transaction } from '@/lib/types'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/customer/')({
  component: CustomerWallet,
})

function CustomerWallet() {
  const { user } = useAuth()
  const pictureInputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id || !user?.email) return
    const saved = localStorage.getItem(`profile_picture_${user.id}`)
    if (saved) setProfilePicture(saved)

    Promise.all([
      getCustomerProfileFn({ data: { id: user.id } }),
      listTransactionsByCustomerFn({ data: { customerId: user.id } }),
      supabase.from('users').select('profile_picture_url').eq('id', user.id).maybeSingle(),
      supabase.from('customer_profiles').select('full_name, email, tier').eq('email', user.email).maybeSingle(),
    ]).then(([p, txs, userData, customerData]) => {
      if (customerData?.data?.full_name) {
        setProfile({ ...p!, fullName: customerData.data.full_name, email: customerData.data.email || p?.email || user.email, tier: customerData.data.tier || p?.tier } as CustomerProfile)
      } else {
        setProfile(p || { id: user.id, fullName: user.user_metadata?.full_name || user.email, email: user.email, tier: 'd2d', phone: '', nationalId: '', address: '', status: 'approved', createdAt: '', updatedAt: '', walletBalance: 0, creditLimit: 0, creditUsed: 0, isTestAccount: false })
      }
      setTransactions(txs)
      if (userData?.data?.profile_picture_url && !saved) {
        setProfilePicture(userData.data.profile_picture_url)
        localStorage.setItem(`profile_picture_${user.id}`, userData.data.profile_picture_url)
      }
    }).finally(() => setLoading(false))
  }, [user?.id, user?.email])

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      if (ev.target?.result) {
        const dataUrl = ev.target.result as string
        setProfilePicture(dataUrl)
        localStorage.setItem(`profile_picture_${user.id}`, dataUrl)
        await supabase.from('users').update({ profile_picture_url: dataUrl }).eq('id', user.id)
        await supabase.from('app_users').update({ profile_picture: dataUrl }).eq('email', user.email)
      }
    }
    reader.readAsDataURL(file)
  }

  const removePicture = async () => {
    if (!user?.id || !user?.email) return
    setProfilePicture(null)
    localStorage.removeItem(`profile_picture_${user.id}`)
    await supabase.from('users').update({ profile_picture_url: null }).eq('id', user.id)
    await supabase.from('app_users').update({ profile_picture: null }).eq('email', user.email)
  }

  if (loading) return <div className="text-gray-400 text-sm py-8">Loading...</div>

  const recentTx = transactions.slice(0, 5)
  const approvedTx = transactions.filter(t => t.status === 'approved')
  const pendingTx = transactions.filter(t => t.status === 'pending')
  const totalAmount = approvedTx.reduce((s, t) => s + t.amount, 0)
  const creditTxs = transactions.filter(t => t.isOnCredit)
  const totalCreditUsed = creditTxs.filter(t => t.status === 'approved').reduce((s, t) => s + t.amount, 0)
  const creditAvailable = (profile?.creditLimit || 0) - totalCreditUsed

  const displayName = profile?.fullName ?? user?.email ?? 'Customer'
  const avatarLetter = displayName[0]?.toUpperCase() ?? '?'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Wallet</h1>
          <p className="text-gray-500 text-sm mt-1">
            {displayName}
            {profile?.tier && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${profile.tier === 'premier' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {tierLabel(profile.tier)}
              </span>
            )}
            {profile?.status === 'pending' && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs">Account Pending Approval</span>
            )}
          </p>
        </div>
        {/* Profile Picture */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-base font-bold text-gray-900">{displayName}</p>
            <p className="text-sm text-gray-500">{profile?.email ?? user?.email}</p>
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

      {/* Wallet Balance Card */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-green-200" />
            <span className="text-green-200 text-sm">Total Amount Transacted</span>
          </div>
          <p className="text-4xl font-bold mb-1">{formatTZS(totalAmount)}</p>
          <p className="text-green-300 text-sm">{profile?.email}</p>
          <div className="mt-4 pt-4 border-t border-green-500 flex gap-4 text-sm">
            <div>
              <p className="text-green-200">Total Requests</p>
              <p className="font-bold">{transactions.length}</p>
            </div>
            <div>
              <p className="text-green-200">Approved</p>
              <p className="font-bold">{approvedTx.length}</p>
            </div>
            <div>
              <p className="text-green-200">Pending</p>
              <p className="font-bold">{pendingTx.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Info for Premier Customers */}
      {profile?.tier === 'premier' && (
        <div className="bg-gradient-to-r from-purple-700 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-purple-200" />
              <span className="text-purple-200 text-sm">Credit Line</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-purple-200 text-xs">Credit Limit</p>
                <p className="text-xl font-bold">{formatTZS(profile.creditLimit ?? 0)}</p>
              </div>
              <div>
                <p className="text-purple-200 text-xs">Credit Used</p>
                <p className="text-xl font-bold">{formatTZS(totalCreditUsed)}</p>
              </div>
              <div>
                <p className="text-purple-200 text-xs">Available</p>
                <p className="text-xl font-bold">{formatTZS(creditAvailable)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/customer/services"
          className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="bg-green-100 p-2.5 rounded-lg">
            <ArrowUpRight className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Request Service</p>
            <p className="text-xs text-gray-400">Cash, Bills, TV, Internet</p>
          </div>
        </Link>
        <Link to="/customer/history"
          className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-3 hover:shadow-md transition-shadow">
          <div className="bg-blue-100 p-2.5 rounded-lg">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">View History</p>
            <p className="text-xs text-gray-400">{transactions.length} transactions</p>
          </div>
        </Link>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Recent Activity</h3>
          <Link to="/customer/history" className="text-xs text-green-600 hover:underline">View all</Link>
        </div>
        {recentTx.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No transactions yet.</p>
            <Link to="/customer/services" className="mt-2 inline-block text-sm text-green-600 hover:underline">
              Request your first service →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTx.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tx.status === 'approved' ? 'bg-green-100' : tx.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                  {tx.status === 'approved' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-yellow-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{tx.provider} {tx.isOnCredit && <span className="text-purple-600 text-xs">(OC)</span>}</p>
                  <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{formatTZS(tx.amount)}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColor(tx.status)}`}>{tx.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile Info */}
      {profile && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Account Details</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-500">Phone:</span> <span className="font-medium ml-1">{profile.phone}</span></div>
            <div><span className="text-gray-500">Address:</span> <span className="font-medium ml-1">{profile.address}</span></div>
            <div><span className="text-gray-500">Tier:</span> <span className="font-medium ml-1">{tierLabel(profile.tier)}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
