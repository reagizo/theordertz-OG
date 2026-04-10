import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { saveCustomerProfileFn } from '@/server/db.functions'
import { generateId } from '@/lib/utils'
import { Mail, Lock, User, Phone, MapPin, ArrowRight } from 'lucide-react'
import type { CustomerTier } from '@/lib/types'
import AnimatedLogo from '@/components/AnimatedLogo'

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
    <div className="min-h-screen bg-[#1a1a3e] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Blur background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#e8346a]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#fbb040]/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4F46E5]/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-lg mx-auto relative z-10 flex flex-col items-center">
        {/* Logo Section */}
        <div className="mb-6">
          <AnimatedLogo showText={true} animate={true} size="md" />
        </div>
        <p className="text-white/60 text-sm mb-6">Customer Registration</p>

        <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-white mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Register as Customer</h2>
          <p className="text-white/60 text-sm mb-6">Create your account to access wallet services</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input name="fullName" value={form.fullName} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fbb040]/50 focus:border-[#fbb040] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                    placeholder="Your full name" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input name="email" type="email" value={form.email} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fbb040]/50 focus:border-[#fbb040] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                    placeholder="you@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input name="phone" value={form.phone} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fbb040]/50 focus:border-[#fbb040] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                    placeholder="+255 7XX XXX XXX" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">National ID *</label>
                <input name="nationalId" value={form.nationalId} onChange={handleChange} required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fbb040]/50 focus:border-[#fbb040] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                  placeholder="National ID number" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input name="address" value={form.address} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fbb040]/50 focus:border-[#fbb040] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                    placeholder="City, Region" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Customer Tier *</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-start gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${form.tier === 'd2d' ? 'border-[#fbb040] bg-[#fbb040]/10' : 'border-white/20 hover:border-white/40'}`}>
                    <input type="radio" name="tier" value="d2d" checked={form.tier === 'd2d'} onChange={handleChange} className="mt-0.5 accent-[#fbb040]" />
                    <div>
                      <p className="text-sm font-medium text-white">Day-to-Day (D2D)</p>
                      <p className="text-xs text-white/50">Standard customer</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-2 p-3 border-2 rounded-xl cursor-pointer transition-all ${form.tier === 'premier' ? 'border-[#fbb040] bg-[#fbb040]/10' : 'border-white/20 hover:border-white/40'}`}>
                    <input type="radio" name="tier" value="premier" checked={form.tier === 'premier'} onChange={handleChange} className="mt-0.5 accent-[#fbb040]" />
                    <div>
                      <p className="text-sm font-medium text-white">Premier Customer</p>
                      <p className="text-xs text-white/50">Credit options available</p>
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={8}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fbb040]/50 focus:border-[#fbb040] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                    placeholder="Min. 8 characters" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white/80 mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fbb040]/50 focus:border-[#fbb040] text-white placeholder-white/40 text-sm transition-all shadow-sm"
                    placeholder="Re-enter password" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#fbb040] to-[#e8346a] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2">
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

          <p className="mt-6 pt-6 border-t border-white/10 text-center text-sm text-white/50">
            Already have an account?{' '}
            <Link to="/login" className="text-[#fbb040] font-medium hover:text-[#fbb040]/80 underline underline-offset-4 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}