import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { saveCustomerProfileFn } from '@/server/db.functions'
import { generateId } from '@/lib/utils'
import { Mail, Lock, User, Phone, MapPin, ArrowRight } from 'lucide-react'
import type { CustomerTier } from '@/lib/types'

export const Route = createFileRoute('/register/customer')({
  component: CustomerRegisterPage,
})

function CustomerRegisterPage() {
  const { signup } = useAuth()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', nationalId: '', address: '',
    tier: 'd2d' as CustomerTier, password: '', confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const user = await signup(form.email, form.password, { full_name: form.fullName, role: 'customer', tier: form.tier })
      const now = new Date().toISOString()
      await saveCustomerProfileFn({
        data: {
          id: user.id || generateId(), fullName: form.fullName, email: form.email, phone: form.phone,
          nationalId: form.nationalId, address: form.address, tier: form.tier, status: 'pending',
          createdAt: now, updatedAt: now, walletBalance: 0, creditLimit: form.tier === 'premier' ? 500000 : 0, creditUsed: 0,
        },
      })
      // Create registration alert for admin
      try {
        const raw = localStorage.getItem('app_settings_v3')
        const settings = raw ? JSON.parse(raw) : { superAgentName: 'Super Agent', users: [], registrationAlerts: [] }
        settings.registrationAlerts = settings.registrationAlerts || []
        settings.registrationAlerts.unshift({
          id: crypto.randomUUID(),
          type: 'customer',
          name: form.fullName,
          email: form.email,
          tier: form.tier,
          message: `New ${form.tier === 'premier' ? 'Premier' : 'D2D'} customer registration from ${form.phone || form.email}. Awaiting admin approval.`,
          read: false,
          createdAt: now,
        })
        localStorage.setItem('app_settings_v3', JSON.stringify(settings))
      } catch { /* ignore */ }
      router.navigate({ to: '/customer' })
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
    <div className="min-h-screen bg-gradient-to-br from-orange-200 via-pink-100 to-purple-300 py-8 px-4 relative overflow-hidden">
      {/* Translucent logo watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <img src="/logo.svg" alt="" className="w-[600px] h-[600px] md:w-[800px] md:h-[800px] opacity-[0.06] scale-110" aria-hidden="true" />
      </div>
      {/* Decorative arcs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full border-[3px] border-orange-300/30" />
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full border-[2px] border-orange-400/20" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full border-[3px] border-purple-300/30" />
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full border-[2px] border-purple-400/20" />
      </div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="max-w-lg mx-auto relative z-10 flex flex-col items-center">
        <div className="mb-4 flex flex-col items-center">
          <img src="/logo.svg" alt="The Order-Reagizo Service Company" className="w-20 h-20 sm:w-24 sm:h-24 mb-2 drop-shadow-lg" />
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A5F] text-center" style={{ fontFamily: 'Playfair Display, serif' }}>The Order-Reagizo</h1>
          <p className="text-sm text-[#1E3A5F]/70 text-center">Service Company</p>
        </div>
        <p className="text-[#1E3A5F]/60 text-sm mb-6">Customer Registration</p>

        <div className="w-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 sm:p-8 border border-white/60">
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Register as Customer</h2>
          <p className="text-gray-500 text-sm mb-6">Create your account to access wallet services</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="fullName" value={form.fullName} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                    placeholder="Your full name" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="email" type="email" value={form.email} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                    placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="phone" value={form.phone} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                    placeholder="+255 7XX XXX XXX" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">National ID *</label>
                <input name="nationalId" value={form.nationalId} onChange={handleChange} required
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                  placeholder="National ID number" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="address" value={form.address} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                    placeholder="City, Region" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Customer Tier *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-start gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${form.tier === 'd2d' ? 'border-[#EC4899] bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="tier" value="d2d" checked={form.tier === 'd2d'} onChange={handleChange} className="mt-0.5 accent-pink-600" />
                    <div>
                      <p className="text-sm font-medium text-[#1E3A5F]">Day-to-Day (D2D)</p>
                      <p className="text-xs text-gray-400">Standard customer</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${form.tier === 'premier' ? 'border-[#EC4899] bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="tier" value="premier" checked={form.tier === 'premier'} onChange={handleChange} className="mt-0.5 accent-pink-600" />
                    <div>
                      <p className="text-sm font-medium text-[#1E3A5F]">Premier Customer</p>
                      <p className="text-xs text-gray-400">Credit options available</p>
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={8}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                    placeholder="Min. 8 characters" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                    placeholder="Re-enter password" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                <>Create Account<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="mt-6 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#1E3A5F] font-medium hover:text-[#EC4899] underline underline-offset-4 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
