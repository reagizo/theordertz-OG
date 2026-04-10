import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { user, loading, role } = useAuth()
  const router = useRouter()
  const [colorIndex, setColorIndex] = useState(0)

  const colors = ['#F57C00', '#C62828', '#0A2A66', '#F57C00', '#C62828']

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % colors.length)
    }, 500)
    return () => clearInterval(interval)
  }, [colors.length])

  useEffect(() => {
    if (loading) return
    try {
      if (!user) {
        router.navigate({ to: '/login' })
      } else if (role === 'admin') {
        router.navigate({ to: '/admin' })
      } else if (role === 'agent') {
        router.navigate({ to: '/agent' })
      } else if (role === 'customer') {
        router.navigate({ to: '/customer' })
      } else if (role === 'vendor') {
        router.navigate({ to: '/vendor' })
      } else {
        router.navigate({ to: '/login' })
      }
    } catch (err) {
      console.error('Navigation error:', err)
    }
  }, [user, loading, role, router])

  return (
    <div className="min-h-screen bg-[#0A2A66] flex items-center justify-center relative overflow-hidden">
      {/* Blur background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#e8346a]/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#fbb040]/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#4F46E5]/10 rounded-full blur-[150px]" />
      </div>

      {/* Translucent watermark logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <img 
          src="/logo.png" 
          alt="" 
          className="w-[500px] h-[500px] opacity-[0.08] scale-110" 
          aria-hidden="true" 
        />
      </div>

      <div className="text-center relative z-10">
        <div className="flex justify-center mb-8">
          <img 
            src="/logo.png" 
            alt="Service Interface Portal System" 
            className="w-32 h-32 object-contain drop-shadow-2xl opacity-80"
          />
        </div>
        <div className="flex items-center justify-center gap-2">
          <span 
            className="text-2xl font-semibold tracking-wider transition-colors duration-500"
            style={{ color: colors[colorIndex], fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            LOADING
          </span>
          <span className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-[#fbb040] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-[#e8346a] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-[#4F46E5] animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
      </div>
    </div>
  )
}