import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Mail, Lock, ArrowRight, RefreshCw } from 'lucide-react'
import AnimatedLogo from '@/components/AnimatedLogo'
import { requestPasswordReset, listPendingPasswordResets, approvePasswordReset, rejectPasswordReset, type PasswordResetRequest } from '@/lib/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetMessage, setResetMessage] = useState('')
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      
      if (!user) {
        throw new Error('Login failed: No user returned')
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Navigate directly to role-based route
      const role = user.app_metadata?.roles?.[0] ?? 'guest'
      if (role === 'admin') {
        router.navigate({ to: '/admin' })
      } else if (role === 'agent') {
        router.navigate({ to: '/agent' })
      } else if (role === 'customer') {
        router.navigate({ to: '/customer' })
      } else {
        router.navigate({ to: '/' })
      }
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e?.message ?? 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail || !newPassword) {
      setResetMessage('Please enter email and new password.')
      return
    }
    if (newPassword.length < 6) {
      setResetMessage('Password must be at least 6 characters.')
      return
    }
    requestPasswordReset(resetEmail, newPassword)
    setResetMessage('Password reset requested. Admin must approve this request.')
    setResetEmail('')
    setNewPassword('')
  }

  return (
    <div className="min-h-screen bg-[#0A2A66] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Blur background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C62828]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#F57C00]/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0A2A66]/30 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Logo Section - Centered with text below */}
        <div className="mb-10">
          <AnimatedLogo showText={true} animate={true} size="lg" />
        </div>

        {/* Login Card */}
        <div className="w-full bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8 sm:p-10">
          <h2 className="text-xl font-semibold text-white mb-1">
            Welcome back
          </h2>
          <p className="text-white/60 text-sm mb-6">Sign in to your account to continue</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F57C00]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb040]/50 focus:border-[#fbb040] text-white placeholder-white/40 text-sm transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F57C00]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fbb040]/50 focus:border-[#fbb040] text-white placeholder-white/40 text-sm transition-all"
                  placeholder="•••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#fbb040] to-[#C62828] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowPasswordReset(!showPasswordReset)}
              className="w-full text-center text-sm text-white/60 hover:text-white/80 transition-colors flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {showPasswordReset ? 'Cancel Password Reset' : 'Forgot Password?'}
            </button>
          </form>

          {showPasswordReset && (
            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-sm font-semibold text-white mb-3">Request Password Reset</h3>
              {resetMessage && (
                <p className={`text-xs mb-3 ${resetMessage.includes('successfully') ? 'text-green-400' : 'text-amber-400'}`}>{resetMessage}</p>
              )}
              <form onSubmit={handlePasswordReset} className="space-y-3">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="Your email address"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 text-sm"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-600 text-white font-medium rounded-lg text-sm hover:bg-amber-700 transition-colors"
                >
                  Submit Request
                </button>
              </form>
              <p className="text-xs text-white/40 mt-2">Admin must approve your request before password is changed.</p>
            </div>
          )}

          {/* Divider with text */}
          <div className="mt-6 mb-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-xs text-white/40 whitespace-nowrap">Don't have an account?</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <div className="flex items-center justify-center gap-3 text-sm flex-wrap">
            <Link to="/register/vendor" className="text-[#4F46E5] font-medium hover:text-[#4F46E5]/80 underline underline-offset-4 transition-colors">
              Register as Vendor
            </Link>
            <Link to="/register/agent" className="text-[#F57C00] font-medium hover:text-[#F57C00]/80 underline underline-offset-4 transition-colors">
              Register as Agent
            </Link>
            <Link to="/register/customer" className="text-[#C62828] font-medium hover:text-[#C62828]/80 underline underline-offset-4 transition-colors">
              Register as Customer
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs mt-8">
          © 2026 The Order Service Company. All rights reserved.
        </p>
      </div>
    </div>
  )
}