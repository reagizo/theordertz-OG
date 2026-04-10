import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useSettings } from '@/contexts/SettingsContext'
import { saveAgentProfileFn, listSuperAgentsFn } from '@/server/db.functions'
import { generateId } from '@/lib/utils'
import { Mail, Lock, User, Phone, MapPin, Building2, ArrowRight, Upload, X, Camera, Shield } from 'lucide-react'
import type { SuperAgentProfile } from '@/lib/types'

export const Route = createFileRoute('/register/agent')({
  loader: () => {
    try {
      return listSuperAgentsFn()
    } catch {
      return []
    }
  },
  component: AgentRegisterPage,
})

function AgentRegisterPage() {
  const { signup } = useAuth()
  const { addRegistrationAlert, updateUser } = useSettings()
  const router = useRouter()
  const superAgents = Route.useLoaderData() as SuperAgentProfile[]
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', nationalId: '', address: '', businessName: '', password: '', confirmPassword: '',
    superAgentId: '',
  })
  const [profilePicture, setProfilePicture] = useState<string>('')
  const pictureInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (superAgents.length > 0 && !form.superAgentId) {
      const activeAgents = superAgents.filter(a => a.status === 'active')
      if (activeAgents.length > 0) {
        setForm(f => ({ ...f, superAgentId: activeAgents[0].id }))
      }
    }
  }, [superAgents])

  const handlePictureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Image must be less than 2MB'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { if (ev.target?.result) setProfilePicture(ev.target.result as string) }
    reader.readAsDataURL(file)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  const isTestProfile = form.fullName.toLowerCase().includes('test') || form.email.toLowerCase().includes('test') || form.businessName?.toLowerCase().includes('test')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const adminEmail = 'rkaijage@gmail.com'
      const userId = isTestProfile ? `test-${crypto.randomUUID()}` : generateId()
      const user = await signup(form.email, form.password, { full_name: form.fullName, role: 'agent', isTestAccount: isTestProfile, adminRequestedBy: adminEmail })
      const now = new Date().toISOString()
      await saveAgentProfileFn({
        data: {
          id: user.id || userId, fullName: form.fullName, email: form.email, phone: form.phone,
          nationalId: form.nationalId, address: form.address, businessName: form.businessName || undefined,
          status: 'pending', createdAt: now, updatedAt: now, floatBalance: 0, commissionRate: 2.5, commissionEarned: 0,
          isTestAccount: isTestProfile, adminRequestedBy: adminEmail,
          assignedSuperAgentId: form.superAgentId || undefined,
        } as any,
      })
      if (profilePicture && user.id) {
        await updateUser(user.id, { profilePicture })
      }
      const selectedSuperAgent = superAgents.find(a => a.id === form.superAgentId)
      const alertMessage = `New ${isTestProfile ? 'TEST ' : ''}agent registration from ${form.phone || form.email}. ${selectedSuperAgent ? `Assigned to: ${selectedSuperAgent.fullName}. ` : ''}${isTestProfile ? `Linked to admin ${adminEmail}. ` : ''}Awaiting admin approval.`
      addRegistrationAlert({
        type: 'agent',
        name: form.fullName,
        email: form.email,
        message: alertMessage,
        isTestAccount: isTestProfile,
        adminRequestedBy: adminEmail,
      })
      router.navigate({ to: '/agent' })
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

      <div className="max-w-2xl mx-auto relative z-10 flex flex-col items-center">
        <div className="mb-4 flex flex-col items-center">
          <img src="/logo.svg" alt="The Order-Reagizo Service Company" className="w-20 h-20 sm:w-24 sm:h-24 mb-2 drop-shadow-lg" />
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A5F] text-center" style={{ fontFamily: 'Playfair Display, serif' }}>The Order-Reagizo</h1>
          <p className="text-sm text-[#1E3A5F]/70 text-center">Service Company</p>
        </div>
        <p className="text-[#1E3A5F]/60 text-sm mb-6">Agent Registration</p>

        <div className="w-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 sm:p-8 border border-white/60">
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>Register as Agent</h2>
          <p className="text-gray-500 text-sm mb-6">Complete KYC verification to register as an authorized agent</p>

          {/* Profile Picture Upload */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="relative">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-16 h-16 rounded-full object-cover shadow ring-2 ring-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow ring-2 ring-gray-200">
                  {form.fullName[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <button
                type="button"
                onClick={() => pictureInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow hover:bg-indigo-700 transition-colors"
              >
                <Camera className="w-3 h-3 text-white" />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Profile Photo</p>
              <p className="text-xs text-gray-400 mb-2">JPG, PNG. Max 2MB.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => pictureInputRef.current?.click()} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors">
                  <Upload className="w-3 h-3" /> Upload
                </button>
                {profilePicture && (
                  <button type="button" onClick={() => setProfilePicture('')} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors">
                    <X className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
            </div>
            <input ref={pictureInputRef} type="file" accept="image/*" onChange={handlePictureUpload} className="hidden" />
          </div>

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
              <div>
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="fullName" value={form.fullName} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                    placeholder="John Doe" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="email" type="email" value={form.email} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                    placeholder="agent@example.com" />
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
                  placeholder="XXXXXXXXXXXXXXXXXX" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Physical Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="address" value={form.address} onChange={handleChange} required
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                    placeholder="Street, City, Region" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Business Name (Optional)</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input name="businessName" value={form.businessName} onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                    placeholder="Your business trading name" />
                </div>
              </div>
              {superAgents.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Select Super Agent *</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      name="superAgentId"
                      value={form.superAgentId}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                    >
                      <option value="">Select a Super Agent</option>
                      {superAgents.filter(a => a.status === 'active').map(agent => (
                        <option key={agent.id} value={agent.id}>
                          {agent.fullName} {agent.phone ? `(${agent.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Choose the Super Agent you will work under</p>
                </div>
              )}
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

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-700">
              <strong>Note:</strong> Your registration will be reviewed by an administrator. You may need to confirm your email address before accessing your account.
            </div>

            {isTestProfile && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                <strong>Test Profile Detected:</strong> This account will be linked to admin rkaijage@gmail.com for testing and monitoring purposes.
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                <>Submit Registration<ArrowRight className="w-4 h-4" /></>
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
