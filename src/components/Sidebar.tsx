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
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { useSettings } from '@/contexts/SettingsContext'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Transactions', to: '/admin/transactions', icon: ArrowLeftRight },
  { label: 'Agents', to: '/admin/agents', icon: UserCheck },
  { label: 'Customers', to: '/admin/customers', icon: Users },
  { label: 'Float Requests', to: '/admin/float-requests', icon: TrendingUp },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
]

const agentNav: NavItem[] = [
  { label: 'Dashboard', to: '/agent', icon: LayoutDashboard },
  { label: 'Transactions', to: '/agent/transactions', icon: ArrowLeftRight },
  { label: 'Float Exchange', to: '/agent/float', icon: TrendingUp },
]

const customerNav: NavItem[] = [
  { label: 'My Wallet', to: '/customer', icon: Wallet },
  { label: 'Request Service', to: '/customer/services', icon: CreditCard },
  { label: 'History', to: '/customer/history', icon: History },
]

interface SidebarProps {
  role: 'admin' | 'agent' | 'customer'
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
  const router = useRouter()

  const nav = role === 'admin' ? adminNav : role === 'agent' ? agentNav : customerNav
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'agent' ? 'Agent' : 'Customer'

  const handleLogout = async () => {
    await logout()
    router.navigate({ to: '/login' })
  }

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'User'
  const userPicture = user?.user_metadata?.profilePicture

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

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-all text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
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
