import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { listCustomersFn, saveCustomerProfileFn, listTransactionsByCustomerFn, getCreditPortfolioFn } from '@/server/db.functions'
import { formatTZS, formatDate, statusColor, tierLabel } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, User, CreditCard } from 'lucide-react'
import type { CustomerProfile, Transaction, CreditPortfolio } from '@/lib/types'

export const Route = createFileRoute('/admin/customers')({
  loader: () => listCustomersFn(),
  component: AdminCustomers,
})

function AdminCustomers() {
  const initial = Route.useLoaderData() as CustomerProfile[]
  const [customers, setCustomers] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState<CustomerProfile | null>(null)
  const [selectedPortfolio, setSelectedPortfolio] = useState<CreditPortfolio | null>(null)
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([])
  const [showPortfolio, setShowPortfolio] = useState(false)

  const updateStatus = async (c: CustomerProfile, status: 'approved' | 'rejected') => {
    setLoading(c.id)
    try {
      const updated = { ...c, status, updatedAt: new Date().toISOString() }
      await saveCustomerProfileFn({ data: updated })
      setCustomers(prev => prev.map(x => x.id === c.id ? updated : x))
      if (selected?.id === c.id) setSelected(updated)
      setMessage(`Customer ${status} successfully`)
      setTimeout(() => setMessage(''), 3000)
    } finally {
      setLoading(null)
    }
  }

  const updateBalance = async (c: CustomerProfile, delta: number) => {
    setLoading(c.id)
    try {
      const updated = { ...c, walletBalance: Math.max(0, c.walletBalance + delta), updatedAt: new Date().toISOString() }
      await saveCustomerProfileFn({ data: updated })
      setCustomers(prev => prev.map(x => x.id === c.id ? updated : x))
      if (selected?.id === c.id) setSelected(updated)
    } finally {
      setLoading(null)
    }
  }

  const updateCreditLimit = async (c: CustomerProfile, newLimit: number) => {
    setLoading(c.id)
    try {
      const updated = { ...c, creditLimit: newLimit, updatedAt: new Date().toISOString() }
      await saveCustomerProfileFn({ data: updated })
      setCustomers(prev => prev.map(x => x.id === c.id ? updated : x))
      if (selected?.id === c.id) setSelected(updated)
      if (selectedPortfolio) {
        const portfolio = await getCreditPortfolioFn({ data: { customerId: c.id } })
        if (portfolio) setSelectedPortfolio(portfolio)
      }
    } finally {
      setLoading(null)
    }
  }

  const viewPortfolio = async (c: CustomerProfile) => {
    setSelected(c)
    setShowPortfolio(true)
    const [txs, portfolio] = await Promise.all([
      listTransactionsByCustomerFn({ data: { customerId: c.id } }),
      getCreditPortfolioFn({ data: { customerId: c.id } }),
    ])
    setCustomerTransactions(txs)
    if (portfolio) setSelectedPortfolio(portfolio)
  }

  const viewDetails = async (c: CustomerProfile) => {
    setSelected(c)
    setShowPortfolio(false)
    const txs = await listTransactionsByCustomerFn({ data: { customerId: c.id } })
    setCustomerTransactions(txs)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm mt-1">Manage customer accounts, wallets, and credit portfolios</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
            {customers.filter(c => c.status === 'pending').length} Pending
          </span>
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
            {customers.filter(c => c.status === 'approved').length} Active
          </span>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
            {customers.filter(c => c.tier === 'premier').length} Premier
          </span>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{message}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 border-b">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Wallet</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No customers yet</td></tr>
                ) : (
                  customers.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewDetails(c)}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{c.fullName}</div>
                        <div className="text-xs text-gray-400">{c.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.tier === 'premier' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {tierLabel(c.tier)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                      <td className="px-4 py-3 font-medium text-green-600">{formatTZS(c.walletBalance)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.status)}`}>
                          {c.status === 'approved' ? <CheckCircle className="w-3 h-3" /> : c.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {c.status === 'pending' && (
                            <>
                              <button onClick={e => { e.stopPropagation(); updateStatus(c, 'approved') }} disabled={loading === c.id}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded disabled:opacity-50">Approve</button>
                              <button onClick={e => { e.stopPropagation(); updateStatus(c, 'rejected') }} disabled={loading === c.id}
                                className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded disabled:opacity-50">Reject</button>
                            </>
                          )}
                          {c.status === 'approved' && (
                            <button onClick={e => { e.stopPropagation(); updateStatus(c, 'rejected') }} disabled={loading === c.id}
                              className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded disabled:opacity-50">Suspend</button>
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

        {/* Detail / Portfolio Panel */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selected.tier === 'premier' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                    <User className={`w-6 h-6 ${selected.tier === 'premier' ? 'text-purple-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selected.fullName}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(selected.status)}`}>{selected.status}</span>
                    <span className={`ml-1 text-xs px-2 py-0.5 rounded-full ${selected.tier === 'premier' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {tierLabel(selected.tier)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Toggle between Details and Portfolio */}
              {selected.tier === 'premier' && (
                <div className="flex gap-2">
                  <button onClick={() => setShowPortfolio(false)}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-medium ${!showPortfolio ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    Details
                  </button>
                  <button onClick={() => viewPortfolio(selected)}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-medium ${showPortfolio ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    Credit Portfolio
                  </button>
                </div>
              )}

              {!showPortfolio ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium text-right">{selected.email}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{selected.phone}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">National ID</span><span className="font-medium">{selected.nationalId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Address</span><span className="font-medium text-right max-w-32 truncate">{selected.address}</span></div>
                  <div className="border-t pt-2 space-y-2">
                    <div className="flex justify-between"><span className="text-gray-500">Wallet Balance</span><span className="font-bold text-green-600">{formatTZS(selected.walletBalance)}</span></div>
                    {selected.tier === 'premier' && (
                      <>
                        <div className="flex justify-between"><span className="text-gray-500">Credit Limit</span><span className="font-bold text-purple-600">{formatTZS(selected.creditLimit)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Credit Used</span><span className="font-medium text-red-600">{formatTZS(selected.creditUsed)}</span></div>
                      </>
                    )}
                    <div className="flex justify-between"><span className="text-gray-500">Registered</span><span className="font-medium">{formatDate(selected.createdAt)}</span></div>
                  </div>
                  {selected.status === 'approved' && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">Wallet Top-Up</p>
                      <div className="flex gap-2">
                        {[10000, 50000, 100000].map(amt => (
                          <button key={amt} onClick={() => updateBalance(selected, amt)} disabled={loading === selected.id}
                            className="flex-1 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs rounded-lg font-medium disabled:opacity-50">
                            +{(amt / 1000)}K
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {selected.tier === 'premier' && selected.status === 'approved' && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">Set Credit Limit</p>
                      <div className="flex gap-2">
                        {[200000, 500000, 1000000].map(amt => (
                          <button key={amt} onClick={() => updateCreditLimit(selected, amt)} disabled={loading === selected.id}
                            className="flex-1 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs rounded-lg font-medium disabled:opacity-50">
                            {formatTZS(amt)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedPortfolio ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-purple-700">
                    <CreditCard className="w-4 h-4" />
                    <h4 className="font-semibold text-sm">Credit Portfolio</h4>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Credit Limit</span><span className="font-bold text-purple-700">{formatTZS(selectedPortfolio.creditLimit)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Credit Used</span><span className="font-bold text-red-600">{formatTZS(selectedPortfolio.creditUsed)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Available</span><span className="font-bold text-green-600">{formatTZS(selectedPortfolio.creditAvailable)}</span></div>
                    <div className="flex justify-between border-t border-purple-200 pt-2"><span className="text-gray-500">Outstanding</span><span className="font-bold text-purple-700">{formatTZS(selectedPortfolio.outstandingBalance)}</span></div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-medium text-gray-600">Recent Credit Transactions</p>
                    {customerTransactions.filter(t => t.isOnCredit).slice(0, 5).map(tx => (
                      <div key={tx.id} className="flex justify-between py-1 border-b border-gray-50">
                        <span className="text-gray-500">{tx.provider}</span>
                        <span className={`font-medium ${tx.status === 'approved' ? 'text-green-600' : tx.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`}>
                          {formatTZS(tx.amount)}
                        </span>
                      </div>
                    ))}
                    {customerTransactions.filter(t => t.isOnCredit).length === 0 && (
                      <p className="text-gray-400 text-center py-2">No credit transactions</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Loading portfolio...</p>
                </div>
              )}

              {/* Customer Transactions */}
              {customerTransactions.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Recent Transactions ({customerTransactions.length})</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {customerTransactions.slice(0, 5).map(tx => (
                      <div key={tx.id} className="flex justify-between py-1 text-xs">
                        <div>
                          <span className="text-gray-700">{tx.provider}</span>
                          {tx.isOnCredit && <span className="ml-1 text-purple-600">(OC)</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{formatTZS(tx.amount)}</span>
                          <span className={`px-1 py-0.5 rounded text-xs ${statusColor(tx.status)}`}>{tx.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a customer to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
