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
    <div className="min-h-screen bg-gradient-to-br from-[#ffd4b8] via-[#f8b4d9] via-[#d4a5e5] to-[#c9b1ff] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Translucent logo watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <img src="/logo.svg" alt="" className="w-[600px] h-[600px] md:w-[800px] md:h-[800px] opacity-[0.06] scale-110" aria-hidden="true" />
      </div>
      {/* Decorative circular elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        {/* Top-left circles */}
        <div className="absolute -top-20 -left-20 w-[300px] h-[300px] rounded-full border border-orange-300/40" />
        <div className="absolute -top-10 -left-10 w-[200px] h-[200px] rounded-full border border-orange-300/25" />
        {/* Bottom-right circles */}
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full border border-pink-300/30" />
        <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] rounded-full border border-pink-300/20" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Logo & Brand */}
        <div className="mb-8 flex flex-col items-center">
          <img src="/logo.svg" alt="The Order - Reagizo Service Company" className="w-20 h-20 sm:w-24 sm:h-24 mb-2 drop-shadow-lg" />
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E3A5F] text-center" style={{ fontFamily: 'Playfair Display, serif' }}>The Order-Reagizo</h1>
          <p className="text-sm text-[#1E3A5F]/70 text-center">Service Company</p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-8 sm:p-10">
          <h2 className="text-xl font-semibold text-[#3D3B6E] mb-1">
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#3D3B6E] mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#e8346a]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8346a]/30 focus:border-[#e8346a] text-sm transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3D3B6E] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#e8346a]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e8346a]/30 focus:border-[#e8346a] text-sm transition-all"
                  placeholder="•••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#fbb040] to-[#e8346a] text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
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

          {/* Divider with text */}
          <div className="mt-6 mb-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 whitespace-nowrap">Don't have an account?</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="flex items-center justify-center gap-4 text-sm">
            <Link to="/register/agent" className="text-[#e8346a] font-medium hover:text-[#e8346a]/80 underline underline-offset-4 transition-colors">
              Register as Agent
            </Link>
            <Link to="/register/customer" className="text-[#fbb040] font-medium hover:text-[#fbb040]/80 underline underline-offset-4 transition-colors">
              Register as Customer
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/90 text-sm mt-8">
          © 2026 The Order Service Company. All rights reserved.
        </p>
      </div>
    </div>
  )
}
