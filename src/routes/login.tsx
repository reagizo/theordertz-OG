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
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(255,211,177,0.28),transparent_30%),linear-gradient(180deg,#ffd4b8_0%,#f8b4d9_35%,#d4a5e5_70%,#c9b1ff_100%)] flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-8%] left-[-10%] w-[320px] h-[320px] rounded-full border border-orange-300/40 blur-[0.5px]" />
        <div className="absolute top-10 left-[-5%] w-[180px] h-[180px] rounded-full border border-orange-300/20" />
        <div className="absolute bottom-[-12%] right-[-12%] w-[420px] h-[420px] rounded-full border border-pink-300/25" />
        <div className="absolute bottom-8 right-[-4%] w-[260px] h-[260px] rounded-full border border-pink-300/15" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <svg width="180" height="120" viewBox="0 0 200 140" className="mb-3 drop-shadow-md" aria-hidden="true">
            <polygon points="100,10 180,45 170,60 100,30 30,60 20,45" fill="#1a1a3e" />
            <polygon points="100,35 165,65 155,78 100,52 45,78 35,65" fill="#e8346a" />
            <polygon points="100,62 140,82 132,92 100,76 68,92 60,82" fill="#fbb040" />
          </svg>
          <h1 className="text-5xl sm:text-6xl text-[#1a1a3e] mb-1" style={{ fontFamily: 'Great Vibes, cursive' }}>
            The Order
          </h1>
          <p className="text-sm text-[#e8346a] tracking-[0.22em] uppercase font-semibold" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
            SERVICE COMPANY
          </p>
          <p className="text-[11px] text-[#e8346a] tracking-[0.18em] uppercase mt-1 font-medium">
            SERVICE INTERFACE PORTAL SYSTEM
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] bg-white/95 border border-white/80 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur-xl p-8 sm:p-10">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#fee4d8] to-transparent opacity-80" />
          <div className="relative">
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
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8346a]/25 focus:border-[#e8346a] text-sm transition-all"
                    placeholder="you@example.com"
                    autoComplete="email"
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
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e8346a]/25 focus:border-[#e8346a] text-sm transition-all"
                    placeholder="•••••"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-[#fbb040] to-[#e8346a] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center justify-center gap-2"
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

            <div className="mt-6 mb-4 flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 whitespace-nowrap">Don't have an account?</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-sm">
              <Link to="/register/agent" className="text-[#e8346a] font-medium hover:text-[#e8346a]/80 underline underline-offset-4 transition-colors">
                Register as Agent
              </Link>
              <Link to="/register/customer" className="text-[#fbb040] font-medium hover:text-[#fbb040]/80 underline underline-offset-4 transition-colors">
                Register as Customer
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-white/90 text-sm mt-8">
          © 2026 The Order Service Company. All rights reserved.
        </p>
      </div>
    </div>
  )
}
