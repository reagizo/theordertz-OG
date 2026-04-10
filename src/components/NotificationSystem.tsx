import { useState, useEffect, useRef } from 'react'
import { Bell, X } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

interface NotificationToast {
  id: string
  title: string
  message: string
  type: 'registration' | 'test-registration'
}

export function NotificationSystem() {
  const { settings } = useSettings()
  const [alerts, setAlerts] = useState(settings.registrationAlerts)
  const [toasts, setToasts] = useState<NotificationToast[]>([])
  const [lastAlertCount, setLastAlertCount] = useState(settings.registrationAlerts.length)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const previousAlertsRef = useRef(settings.registrationAlerts)

  useEffect(() => {
    previousAlertsRef.current = settings.registrationAlerts
    setAlerts(settings.registrationAlerts)
  }, [settings.registrationAlerts])

  useEffect(() => {
    const currentAlerts = settings.registrationAlerts
    const previousAlerts = previousAlertsRef.current
    
    const previousCount = previousAlerts.filter(a => !a.read).length
    const currentUnread = currentAlerts.filter(a => !a.read)
    
    if (currentUnread.length > previousCount) {
      const newAlerts = currentUnread.slice(previousCount)
      
      newAlerts.forEach(alert => {
        const toast: NotificationToast = {
          id: alert.id,
          title: alert.type === 'agent' ? 'New Agent Registration' : 'New Customer Registration',
          message: `${alert.name} - ${alert.email}`,
          type: alert.isTestAccount ? 'test-registration' : 'registration',
        }
        
        setToasts(prev => [...prev, toast])
        
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleC4hNIXa0607Hh8khOPVvnQ9V2Jom93iuH04ITKE3+bDMk01g9vkvyk9PYLc5b8lRkJjg7W7')
        audio.volume = 0.3
        audio.play().catch(() => {})
        
        if (Notification.permission === 'granted') {
          new Notification('New Registration', {
            body: `${alert.name} has registered`,
            icon: '/logo.png',
          })
        }
      })
    }
    
    previousAlertsRef.current = currentAlerts
    setLastAlertCount(currentUnread.length)
  }, [settings.registrationAlerts])

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    const timeouts = toasts.map((toast, index) => 
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 8000 - (index * 500))
    )
    return () => timeouts.forEach(clearTimeout)
  }, [toasts])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 p-4 rounded-lg shadow-lg border animate-slide-in ${
            toast.type === 'test-registration'
              ? 'bg-purple-900/95 border-purple-500 text-white'
              : 'bg-green-900/95 border-green-500 text-white'
          }`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <Bell className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{toast.title}</p>
            <p className="text-xs opacity-80 mt-0.5 truncate">{toast.message}</p>
            {toast.type === 'test-registration' && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-purple-600 rounded text-xs font-medium">TEST ACCOUNT</span>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}