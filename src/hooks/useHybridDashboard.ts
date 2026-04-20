// Option C: Hybrid push-triggered dashboard refresh
// Option C: Hybrid approach - push notifications trigger dashboard refresh with Firestore data
// This hook combines FCM push notifications with Firestore real-time subscriptions

import { useEffect, useState, useCallback, useRef } from 'react'
import { 
  onForegroundMessage,
  requestNotificationPermission,
  isNotificationSupported
} from '@/lib/firebase-fcm'
import { 
  subscribeToTestAccounts, 
  subscribeToRealAccounts, 
  subscribeToRegistrationAlerts,
  subscribeToUserUpdates,
  addUserUpdate
} from '@/lib/firebase-db'

// Define DocumentData type inline to prevent server-side Firebase loading
export type DocumentData = Record<string, unknown>

export interface HybridDashboardData {
  testAccounts: DocumentData[]
  realAccounts: DocumentData[]
  registrationAlerts: DocumentData[]
  userUpdates: DocumentData[]
  lastRefresh: Date | null
  loading: boolean
  error: string | null
}

export function useHybridDashboard(userId: string | null, enabled: boolean = true) {
  const [data, setData] = useState<HybridDashboardData>({
    testAccounts: [],
    realAccounts: [],
    registrationAlerts: [],
    userUpdates: [],
    lastRefresh: null,
    loading: true,
    error: null,
  })
  
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const refreshTriggerRef = useRef(0)

  // Check notification support
  useEffect(() => {
    setIsSupported(isNotificationSupported())
    if (typeof window !== 'undefined') {
      setPermission(Notification.permission)
    }
  }, [])

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!userId || !isSupported) {
      return { success: false, error: 'Notifications not supported or no user ID' }
    }

    const result = await requestNotificationPermission(userId)
    if (result.success) {
      setPermission('granted')
    }
    return result
  }, [userId, isSupported])

  // Refresh dashboard data
  const refresh = useCallback(() => {
    refreshTriggerRef.current++
    setData(prev => ({ ...prev, loading: true }))
  }, [])

  // Subscribe to Firestore collections (Realtime aspect)
  useEffect(() => {
    if (!enabled) return

    let unsubscribers: (() => void)[] = []

    // Subscribe to test accounts
    const unsubTestAccounts = subscribeToTestAccounts((testAccounts) => {
      setData(prev => ({ 
        ...prev, 
        testAccounts, 
        loading: false,
        lastRefresh: new Date()
      }))
    })
    unsubscribers.push(unsubTestAccounts)

    // Subscribe to real accounts
    const unsubRealAccounts = subscribeToRealAccounts((realAccounts) => {
      setData(prev => ({ 
        ...prev, 
        realAccounts, 
        loading: false,
        lastRefresh: new Date()
      }))
    })
    unsubscribers.push(unsubRealAccounts)

    // Subscribe to registration alerts
    const unsubRegistrationAlerts = subscribeToRegistrationAlerts((registrationAlerts) => {
      setData(prev => ({ 
        ...prev, 
        registrationAlerts, 
        loading: false,
        lastRefresh: new Date()
      }))
    })
    unsubscribers.push(unsubRegistrationAlerts)

    // Subscribe to user updates
    const unsubUserUpdates = subscribeToUserUpdates((userUpdates) => {
      setData(prev => ({ 
        ...prev, 
        userUpdates, 
        loading: false,
        lastRefresh: new Date()
      }))
    })
    unsubscribers.push(unsubUserUpdates)

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [enabled, refreshTriggerRef.current])

  // Listen for push notifications and trigger refresh (Hybrid aspect)
  useEffect(() => {
    if (!isSupported || permission !== 'granted' || !enabled) return

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Push notification received, triggering dashboard refresh:', payload)
      
      // Log the user update for tracking
      if (userId && payload.data) {
        addUserUpdate({
          userId,
          userEmail: payload.data.email || 'unknown',
          action: payload.data.type || 'notification_received',
          details: payload.data,
        }).catch(err => console.error('Failed to log user update:', err))
      }

      // Trigger dashboard refresh
      refresh()
    })

    return () => unsubscribe()
  }, [isSupported, permission, userId, enabled, refresh])

  return {
    ...data,
    isSupported,
    permission,
    requestPermission,
    refresh,
  }
}

// Hook for hybrid admin dashboard with automatic refresh on push
export function useHybridAdminDashboard(userId: string | null, enabled: boolean = true) {
  const dashboardData = useHybridDashboard(userId, enabled)

  // Send a push notification that will trigger refresh on all admin dashboards
  const triggerAdminRefresh = useCallback(async (action: string, details: Record<string, unknown>) => {
    if (!userId) return { success: false, error: 'No user ID' }

    // Add user update (this will trigger real-time update via Firestore)
    await addUserUpdate({
      userId,
      userEmail: details.email as string || 'admin',
      action,
      details,
    })

    return { success: true }
  }, [userId])

  return {
    ...dashboardData,
    triggerAdminRefresh,
  }
}
