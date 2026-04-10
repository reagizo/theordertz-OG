import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { listAllVendorsFn, saveVendorProfileFn, deleteVendorFn, syncVendorsToSupabaseFn } from '@/server/db.functions'
import { formatTZS, formatDateTime, statusColor } from '@/lib/utils'
import { useSettings } from '@/contexts/SettingsContext'
import { Users, Search, CheckCircle, XCircle, Clock, Trash2, Building2, RefreshCw } from 'lucide-react'

export const Route = createFileRoute('/admin/vendors')({
  loader: async () => {
    await syncVendorsToSupabaseFn()
    const { real, test } = await listAllVendorsFn()
    return { vendors: real, testVendors: test }
  },
  component: AdminVendorsPage,
})

function AdminVendorsPage() {
  const { settings } = useSettings()
  const data = Route.useLoaderData()
  const allVendors = data?.vendors ?? []
  const testVendors = data?.testVendors ?? []
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [showTest, setShowTest] = useState(false)

  const vendors = showTest ? testVendors : allVendors

  const filteredVendors = useMemo(() => {
    return vendors
      .filter(v => {
        if (filterStatus !== 'all' && v.status !== filterStatus) return false
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return (
          v.fullName.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.businessName.toLowerCase().includes(q) ||
          v.phone.includes(q)
        )
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [vendors, filterStatus, searchQuery])

  const handleApprove = async (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId)
    if (!vendor) return
    await saveVendorProfileFn({ data: { ...vendor, status: 'approved', updatedAt: new Date().toISOString() } })
    window.location.reload()
  }

  const handleReject = async (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId)
    if (!vendor) return
    await saveVendorProfileFn({ data: { ...vendor, status: 'rejected', updatedAt: new Date().toISOString() } })
    window.location.reload()
  }

  const handleDelete = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return
    await deleteVendorFn({ id: vendorId })
    window.location.reload()
  }

  const kpis = useMemo(() => ({
    total: vendors.length,
    pending: vendors.filter(v => v.status === 'pending').length,
    approved: vendors.filter(v => v.status === 'approved').length,
    rejected: vendors.filter(v => v.status === 'rejected').length,
  }), [vendors])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Vendors</h1>
          <p className="text-gray-300 text-sm mt-1">
            Manage vendor registrations
            <span className="ml-2 text-orange-400 font-medium">| Super Agent: {settings.superAgentName}</span>
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showTest}
            onChange={(e) => setShowTest(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Show test accounts
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
          <p className="text-2xl font-bold text-gray-900">{kpis.total}</p>
          <p className="text-sm text-gray-500">Total Vendors</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
          <p className="text-2xl font-bold text-yellow-600">{kpis.pending}</p>
          <p className="text-sm text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
          <p className="text-2xl font-bold text-green-600">{kpis.approved}</p>
          <p className="text-sm text-gray-500">Approved</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 text-center">
          <p className="text-2xl font-bold text-red-600">{kpis.rejected}</p>
          <p className="text-sm text-gray-500">Rejected</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="border-b border-gray-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="font-semibold text-gray-900">Vendor List ({filteredVendors.length})</h3>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendors..."
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Vendor</th>
                <th className="px-6 py-3">Business</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">KYC</th>
                <th className="px-6 py-3">Wallet</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No vendors found
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{vendor.businessName}</p>
                          <p className="text-xs text-gray-500">{vendor.businessType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-gray-900">{vendor.fullName}</p>
                      <p className="text-xs text-gray-500">{vendor.email}</p>
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-gray-600">{vendor.phone}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {vendor.address}
                      </p>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-1">
                        {vendor.tinNumber && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Hash className="w-3 h-3" /> TIN: {vendor.tinNumber}
                          </p>
                        )}
                        {vendor.vrNumber && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Hash className="w-3 h-3" /> VRN: {vendor.vrNumber}
                          </p>
                        )}
                        {!vendor.tinNumber && !vendor.vrNumber && (
                          <p className="text-xs text-gray-400">No KYC</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {formatTZS(vendor.walletBalance)}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(vendor.status)}`}>
                        {vendor.status === 'approved' && <CheckCircle className="w-3 h-3" />}
                        {vendor.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        {vendor.status === 'pending' && <Clock className="w-3 h-3" />}
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {vendor.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(vendor.id)}
                              className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(vendor.id)}
                              className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(vendor.id)}
                          className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                          title="Delete"
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
    </div>
  )
}