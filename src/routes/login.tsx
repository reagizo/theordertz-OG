import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Mail, Lock, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      // Small delay to let auth state propagate before navigation
      await new Promise(resolve => setTimeout(resolve, 300))
      router.navigate({ to: '/' })
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e?.message ?? 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-200 via-pink-100 to-purple-300 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Translucent logo watermark background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <img
          src="/logo.svg"
          alt=""
          className="w-[600px] h-[600px] md:w-[800px] md:h-[800px] opacity-[0.06] scale-110"
          aria-hidden="true"
        />
      </div>

      {/* Decorative arcs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full border-[3px] border-orange-300/30" />
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full border-[2px] border-orange-400/20" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full border-[3px] border-purple-300/30" />
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full border-[2px] border-purple-400/20" />
      </div>

      {/* Soft glow overlays */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Logo & Brand */}
        <div className="mb-4 flex flex-col items-center">
          <img src="/logo.svg" alt="The Order-Reagizo Service Company" className="w-28 h-28 sm:w-32 sm:h-32 mb-2 drop-shadow-lg" />
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A5F] text-center" style={{ fontFamily: 'Playfair Display, serif' }}>
            The Order-Reagizo
          </h1>
          <p className="text-sm text-[#1E3A5F]/70 text-center mt-0.5">Service Company</p>
          <p className="text-xs text-[#1E3A5F]/50 text-center mt-0.5">Mobile Wallet Transfer System</p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 sm:p-8 border border-white/60">
          <h2 className="text-xl font-bold text-[#1E3A5F] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
            Welcome back
          </h2>
          <p className="text-gray-500 text-sm mb-6">Sign in to your account to continue</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E3A5F] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#EC4899]/30 focus:border-[#EC4899] text-sm transition-all shadow-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
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
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-500 mb-3">Don't have an account?</p>
            <div className="flex items-center justify-center gap-3 text-sm">
              <Link to="/register/agent" className="text-[#1E3A5F] font-medium hover:text-[#EC4899] underline underline-offset-4 transition-colors">
                Register as Agent
              </Link>
              <span className="text-gray-300">|</span>
              <Link to="/register/customer" className="text-[#1E3A5F] font-medium hover:text-[#EC4899] underline underline-offset-4 transition-colors">
                Register as Customer
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#1E3A5F]/50 text-xs mt-6">
          © {new Date().getFullYear()} The Order-Reagizo Service Company. All rights reserved.
        </p>
      </div>
    </div>
  )
}
