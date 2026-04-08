import { Link, useRouter } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  UserCheck,
  Wallet,
  CreditCard,
  History,
  LogOut,
  Settings,
  TrendingUp,
  Menu,
  X,
  Database,
  Globe,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { useSettings } from '@/contexts/SettingsContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

const adminNav: NavItem[] = [
  { label: t('navigation.dashboard'), to: '/admin', icon: LayoutDashboard },
  { label: t('navigation.transactions'), to: '/admin/transactions', icon: ArrowLeftRight },
  { label: t('navigation.agents'), to: '/admin/agents', icon: UserCheck },
  { label: t('navigation.customers'), to: '/admin/customers', icon: Users },
  { label: 'Users (DB)', to: '/admin/users', icon: Database },
  { label: t('navigation.floatRequests'), to: '/admin/float-requests', icon: TrendingUp },
  { label: t('navigation.settings'), to: '/admin/settings', icon: Settings },
]

const agentNav: NavItem[] = [
  { label: t('navigation.dashboard'), to: '/agent', icon: LayoutDashboard },
  { label: t('navigation.transactions'), to: '/agent/transactions', icon: ArrowLeftRight },
  { label: t('navigation.floatExchange'), to: '/agent/float', icon: TrendingUp },
]

const customerNav: NavItem[] = [
  { label: t('navigation.wallet'), to: '/customer', icon: Wallet },
  { label: t('navigation.requestService'), to: '/customer/services', icon: CreditCard },
  { label: t('navigation.history'), to: '/customer/history', icon: History },
]

interface SidebarProps {
  role: 'admin' | 'agent' | 'customer' | 'test'
}

function AvatarWithPicture({ picture, name, size = 'md' }: { picture?: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  }
  if (picture) {
    return (
      <img
        src={picture}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover flex-shrink-0 shadow ring-2 ring-white/20`}
      />
    )
  }
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow ring-2 ring-white/20`}>
      {name[0]?.toUpperCase() ?? '?'}
    </div>
  )
}

export function Sidebar({ role }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const { settings } = useSettings()
  const { language, setLanguage, t } = useLanguage()
  const router = useRouter()
  const [userPicture, setUserPicture] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!user?.email) return
    console.log('Sidebar: fetching profile picture for', user.email)
    supabase.from('app_users').select('profile_picture').eq('email', user.email).maybeSingle().then(({ data, error }) => {
      if (error) {
        console.error('Sidebar: Supabase error fetching profile picture:', error)
        return
      }
      console.log('Sidebar: profile_picture from Supabase:', data?.profile_picture ? 'present' : 'null')
      if (data?.profile_picture) {
        setUserPicture(data.profile_picture)
      } else {
        // Check localStorage for old profile pictures and sync to Supabase
        let foundPicture: string | undefined
        try {
          // Check app_settings_v3
          const raw = localStorage.getItem('app_settings_v3')
          if (raw) {
            const settings = JSON.parse(raw)
            const found = settings.users?.find((u: any) => u.email === user.email)
            if (found?.profilePicture) foundPicture = found.profilePicture
          }
          // Check mock.user
          if (!foundPicture) {
            const muRaw = localStorage.getItem('mock.user')
            if (muRaw) {
              const mu = JSON.parse(muRaw)
              if (mu?.user_metadata?.profilePicture) foundPicture = mu.user_metadata.profilePicture
            }
          }
        } catch { /* ignore */ }

        if (foundPicture) {
          console.log('Sidebar: found profile picture in localStorage, syncing to Supabase...')
          setUserPicture(foundPicture)
          // Save to Supabase so it syncs across devices
          supabase.from('app_users').update({ profile_picture: foundPicture }).eq('email', user.email).then(({ error }) => {
            if (error) console.error('Sidebar: failed to sync profile picture to Supabase:', error)
            else console.log('Sidebar: profile picture synced to Supabase')
          })
        } else {
          console.log('Sidebar: no profile picture found anywhere')
        }
      }
    })
  }, [user?.email])

  const nav = (role === 'admin' || role === 'test') ? adminNav : role === 'agent' ? agentNav : customerNav
  const roleLabel = role === 'admin' ? t('navigation.agents') : role === 'agent' ? t('navigation.agents') : role === 'test' ? 'Test' : t('navigation.customers')

  const handleLogout = async () => {
    await logout()
    router.navigate({ to: '/login' })
  }

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'User'

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" className="w-9 h-9 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white font-bold text-xs leading-tight truncate" style={{ fontFamily: 'Playfair Display, serif' }}>The Order</p>
            <p className="text-pink-300 text-[10px] leading-tight">Reagizo Service Co.</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <AvatarWithPicture picture={userPicture} name={displayName} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {displayName}
            </p>
            <p className="text-xs text-pink-300">{roleLabel}</p>
          </div>
        </div>
      </div>

      {/* Super Agent Name (admin only) */}
      {role === 'admin' && (
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-[10px] text-white/50 uppercase tracking-wider mb-1">Super Agent</p>
          <p className="text-sm font-semibold text-white">{settings.superAgentName}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-all text-sm font-medium group"
            activeProps={{ className: 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-white border border-white/10' }}
            onClick={() => setOpen(false)}
          >
            <item.icon className="w-5 h-5 flex-shrink-0 group-hover:text-pink-300 transition-colors" />
            {item.label}
          </Link>
        ))}
      </nav>

       {/* Language Selector */}
       <div className="px-3 py-4 border-t border-white/10 space-y-2">
         <div className="flex items-center gap-2 text-sm text-white/80">
           <Globe className="w-4 h-4" />
           <span>{t('common.language')}</span>
         </div>
         <div className="flex gap-2">
           <button
             onClick={() => setLanguage('en')}
             className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
               language === 'en'
                 ? 'bg-white/20 text-white'
                 : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
             }`}
           >
             {t('common.english')}
           </button>
           <button
             onClick={() => setLanguage('sw')}
             className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
               language === 'sw'
                 ? 'bg-white/20 text-white'
                 : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
             }`}
           >
             {t('common.swahili')}
           </button>
         </div>
       </div>

       {/* Footer */}
       <div className="px-3 py-4 border-t border-white/10 space-y-1">
         <button
           onClick={handleLogout}
           className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-all text-sm font-medium"
         >
           <LogOut className="w-5 h-5" />
           {t('common.logout')}
         </button>
       </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden bg-gradient-to-r from-orange-500 to-pink-600 text-white p-2.5 rounded-xl shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#1E3A5F] to-[#2D4A6F] transform transition-transform lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 text-white/70 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50 bg-gradient-to-b from-[#1E3A5F] to-[#2D4A6F]">
        <SidebarContent />
      </div>
    </>
  )
}
