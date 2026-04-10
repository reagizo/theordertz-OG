import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { listCustomersFn } from '@/server/db.functions'
import { formatTZS, formatDate, tierLabel } from '@/lib/utils'
import type { CustomerProfile } from '@/lib/types'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { Search, User, Mail, Phone, Wallet, Crown, Shield } from 'lucide-react'

export const Route = createFileRoute('/supervisor/customers')({
  loader: () => listCustomersFn(),
  component: SupervisorCustomersPage,
})

function SupervisorCustomersPage() {
  return (
    <SettingsProvider>
      <SupervisorCustomers />
    </SettingsProvider>
  )
}

function SupervisorCustomers() {
  const customers = Route.useLoaderData() as CustomerProfile[]
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<'all' | 'd2d' | 'premier'>('all')

  const filtered = useMemo(() => {
    let filtered = customers
    if (tierFilter !== 'all') filtered = filtered.filter(c => c.tier === tierFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(c =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
      )
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [customers, tierFilter, searchQuery])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-500 text-sm mt-1">View and manage customer profiles</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'd2d', 'premier'] as const).map((t) => (
          <button key={t} onClick={() => setTierFilter(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tierFilter === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {t === 'all' ? 'All' : t === 'd2d' ? 'D2D' : 'Premier'}
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers..."
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">No customers found</div>
        ) : filtered.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                {c.fullName[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{c.fullName}</h3>
                  {c.tier === 'premier' && <Crown className="w-4 h-4 text-yellow-500" />}
                </div>
                <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                  c.tier === 'premier' ? 'bg-pink-100 text-pink-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {tierLabel(c.tier)}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{c.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span className="truncate">{c.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Wallet className="w-4 h-4" />
                <span className="font-medium text-green-600">{formatTZS(c.walletBalance)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
              Joined {formatDate(c.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}