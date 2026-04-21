import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { saveVendorProfileFn } from '@/server/db.functions'
import { generateId } from '@/lib/utils'
import { Mail, Lock, User, Phone, MapPin, Building2, Hash, ArrowRight } from 'lucide-react'
import AnimatedLogo from '@/components/AnimatedLogo'
import { isTestAccountByNameOrEmail, useSettings, SettingsProvider } from '@/contexts/SettingsContext'

const BUSINESS_TYPES = ['Retail Shop', 'Wholesale', 'Supermarket', 'Pharmacy', 'Restaurant', 'Mobile Vendor', 'Online Shop', 'Service Provider', 'Other']

export const Route = createFileRoute('/register/vendor')({
  component: VendorRegisterPage,
})

function VendorRegisterPage() {
  return (
    <SettingsProvider>
      <VendorRegisterContent />
    </SettingsProvider>
  )
}

function VendorRegisterContent() {
  const { signup } = useAuth()
  const router = useRouter()
  const { addTestAccount, addRealAccount, addRegistrationAlert } = useSettings()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', businessName: '', businessType: '', address: '',
    tinNumber: '', vrNumber: '', password: '', confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (!form.businessType) { setError('Please select a business type.'); return }
    setLoading(true)
    try {
      const isTest = isTestAccountByNameOrEmail(form.fullName, form.email)
      const user = await signup(form.email, form.password, { full_name: form.fullName, role: 'vendor', isTestAccount: isTest })
      const now = new Date().toISOString()
      await saveVendorProfileFn({
        data: {
          id: user.id || generateId(), fullName: form.fullName, email: form.email, phone: form.phone,
          businessName: form.businessName, businessType: form.businessType, address: form.address,
          tinNumber: form.tinNumber || undefined, vrNumber: form.vrNumber || undefined,
          status: 'pending', createdAt: now, updatedAt: now, walletBalance: 0,
        },
      })
      const accountData = { name: form.fullName, email: form.email, role: 'Vendor' as const, profilePicture: undefined, password: form.password }
      if (isTest) {
        addTestAccount(accountData)
      } else {
        addRealAccount(accountData)
      }
      addRegistrationAlert({
        type: 'vendor',
        name: form.fullName,
        email: form.email,
        message: `New vendor registration for ${form.businessName || form.fullName}. Awaiting admin approval.`,
        isTestAccount: isTest,
      })
      setShowSuccess(true)
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string }
      if (e?.status === 422) setError('Email already in use or invalid input.')
      else if (e?.status === 403) setError('Registrations are currently closed.')
      else setError(e?.message ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SettingsProvider>
      <div className="min-h-screen bg-[#0A2A66] flex items-center justify-center px-4 py-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C62828]/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#F57C00]/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4F46E5]/10 rounded-full blur-[150px]" />
        </div>

        <div className="max-w-lg mx-auto relative z-10 flex flex-col items-center">
          <div className="mb-6">
            <AnimatedLogo showText={true} animate={true} size="md" />
          </div>
          <p className="text-white/60 text-sm mb-6">Vendor Registration</p>

          <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-white mb-1" style={{ fontFamily: 'Aptos Display, Aptos, sans-serif' }}>Register as Vendor</h2>
            <p className="text-white/60 text-sm mb-6">Start accepting payments with The Order platform</p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {showSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Registration Submitted</h3>
                <p className="text-white/80 text-sm mb-6">
                  Your application has been sent to administrator, once approved you may log in using your credentials set
                </p>
                <button
                  onClick={() => router.navigate({ to: '/login' })}
                  className="px-6 py-3 bg-gradient-to-r from-[#4F46E5] to-[#C62828] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all text-sm"
                >
                  Go to Login
                </button>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-white/80 mb-1.5">Contact Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input name="fullName" value={form.fullName} onChange={handleChange} required
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/50 focus:border-[#4F46E5] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                          placeholder="Contact person full name" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-1.5">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input name="email" type="email" value={form.email} onChange={handleChange} required
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/50 focus:border-[#4F46E5] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                          placeholder="you@example.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-1.5">Phone Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input name="phone" value={form.phone} onChange={handleChange} required
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/50 focus:border-[#4F46E5] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                          placeholder="+255 7XX XXX XXX" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-1.5">Business Name *</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input name="businessName" value={form.businessName} onChange={handleChange} required
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/50 focus:border-[#4F46E5] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                          placeholder="Your business name" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-1.5">Business Type *</label>
                      <select name="businessType" value={form.businessType} onChange={handleChange} required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/50 focus:border-[#4F46E5] text-white text-sm transition-all shadow-sm">
                        <option value="" className="text-gray-900">Select business type</option>
                        {BUSINESS_TYPES.map(bt => (
                          <option key={bt} value={bt} className="text-gray-900">{bt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-white/80 mb-1.5">Business Address *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input name="address" value={form.address} onChange={handleChange} required
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/50 focus:border-[#4F46E5] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                          placeholder="Street, City, Region" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-1.5">TIN Number (Optional)</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input name="tinNumber" value={form.tinNumber} onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/50 focus:border-[#4F46E5] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                          placeholder="TIN" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-1.5">VRN (Optional)</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input name="vrNumber" value={form.vrNumber} onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/50 focus:border-[#4F46E5] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                          placeholder="VAT Reg. Number" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-1.5">Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={8}
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/50 focus:border-[#4F46E5] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                          placeholder="Min. 8 characters" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white/80 mb-1.5">Confirm Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/50 focus:border-[#4F46E5] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                          placeholder="Re-enter password" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating account...
                      </span>
                    ) : (
                      <>Register Vendor<ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <p className="mt-6 pt-6 border-t border-white/10 text-center text-sm text-white/50">
                  Already have an account?{' '}
                  <Link to="/login" className="text-[#4F46E5] font-medium hover:text-[#4F46E5]/80 underline underline-offset-4 transition-colors">Sign in</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </SettingsProvider>
  )
}