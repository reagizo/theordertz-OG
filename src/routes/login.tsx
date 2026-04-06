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
    <div className="min-h-screen bg-gradient-to-br from-[#FFD4B8] via-[#FFD6E0] to-[#C9B1FF] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Decorative thin arcs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[300px] h-[300px] rounded-full border border-orange-300/40" />
        <div className="absolute -top-12 -left-12 w-[250px] h-[250px] rounded-full border border-orange-300/25" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full border border-purple-300/30" />
        <div className="absolute -bottom-16 -right-16 w-[300px] h-[300px] rounded-full border border-purple-300/20" />
      </div>

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Logo & Brand */}
        <div className="mb-6 flex flex-col items-center">
          {/* Chevron logo */}
          <svg width="120" height="80" viewBox="0 0 120 80" className="mb-2 drop-shadow-md" aria-hidden="true">
            <polygon points="60,5 95,25 85,35 60,20 35,35 25,25" fill="#2D2B55" />
            <polygon points="60,20 95,40 85,50 60,35 35,50 25,40" fill="#E8346A" />
            <polygon points="60,38 80,50 75,58 60,48 45,58 40,50" fill="#FBB040" />
          </svg>
          <h1 className="text-3xl sm:text-4xl text-[#2D2B55] text-center" style={{ fontFamily: 'Great Vibes, cursive, Playfair Display, serif' }}>
            The Order
          </h1>
          <p className="text-xs text-[#F97316] tracking-[0.2em] uppercase text-center mt-0.5">Service Company</p>
          <p className="text-xs text-[#F97316]/80 tracking-[0.15em] uppercase text-center mt-0.5">Service Interface Portal System</p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg p-8 sm:p-10">
          <h2 className="text-xl font-semibold text-[#3D3B6E] mb-1">
            Welcome back
          </h2>
          <p className="text-gray-400 text-sm mb-6">Sign in to your account to continue</p>

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
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E8346A]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E8346A]/30 focus:border-[#E8346A] text-sm transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3D3B6E] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E8346A]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E8346A]/30 focus:border-[#E8346A] text-sm transition-all"
                  placeholder="•••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#FBB040] to-[#E8346A] text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
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
            <Link to="/register/agent" className="text-[#E8346A] font-medium hover:text-[#E8346A]/80 underline underline-offset-4 transition-colors">
              Register as Agent
            </Link>
            <Link to="/register/customer" className="text-[#E8346A] font-medium hover:text-[#E8346A]/80 underline underline-offset-4 transition-colors">
              Register as Customer
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-6">
          © 2026 The Order Service Company. All rights reserved.
        </p>
      </div>
    </div>
  )
}
