// Option B: Push Alerts via FCM for the admin hub
// This hook provides push notification functionality using Firebase Cloud Messaging

import { useEffect, useState, useCallback } from 'react'
import {
  requestNotificationPermission,
  isNotificationSupported,
  getNotificationPermission
} from '@/lib/firebase-fcm'
import { subscribeToNotifications } from '@/lib/firebase-db'

// Define DocumentData type inline to prevent server-side Firebase loading
export type DocumentData = Record<string, unknown>

export interface PushAlertData {
  type: 'customer' | 'agent' | 'transaction' | 'float_request'
  message: string
  data: DocumentData
  timestamp: Date
}

export function usePushAlerts(userId: string | null, isAdmin: boolean = false) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [token, setToken] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<DocumentData[]>([])
  const [isSupported, setIsSupported] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setIsSupported(isNotificationSupported())
    setPermission(getNotificationPermission())
    setLoading(false)
  }, [])

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!userId || !isSupported) {
      return { success: false, error: 'Notifications not supported or no user ID' }
    }

    const result = await requestNotificationPermission(userId)
    if (result.success && result.token) {
      setToken(result.token)
      setPermission('granted')
    }
    return result
  }, [userId, isSupported])

  // Subscribe to foreground messages
  useEffect(() => {
    if (!isSupported || permission !== 'granted') return

    const unsubscribe = onForegroundMessage((payload) => {
      console.log('Foreground message received:', payload)
      // Handle foreground notification (show toast, banner, etc.)
      if (payload.notification) {
        // You can trigger a toast notification here
        console.log('Notification:', payload.notification.title, payload.notification.body)
      }
    })

    return () => unsubscribe()
  }, [isSupported, permission])

  // Subscribe to notifications for the current user
  useEffect(() => {
    if (!userId) return

    const unsubscribe = subscribeToNotifications(userId, (notificationData) => {
      setNotifications(notificationData)
    })

    return () => unsubscribe()
  }, [userId])

  // Send push notification to all admin users
  const sendAdminAlert = useCallback(async (title: string, body: string, data?: Record<string, unknown>) => {
    if (!isAdmin) {
      return { success: false, error: 'Not authorized to send admin alerts' }
    }

    return await sendPushNotificationToAdmins(title, body, data)
  }, [isAdmin])

  return {
    permission,
    token,
    notifications,
    isSupported,
    loading,
    requestPermission,
    sendAdminAlert,
  }
}

// Hook for admin-specific push alerts
export function useAdminPushAlerts(userId: string | null) {
  const { permission, token, notifications, isSupported, loading, requestPermission, sendAdminAlert } = usePushAlerts(userId, true)

  // Send alert when new registration is received
  const sendNewRegistrationAlert = useCallback(async (email: string, role: string) => {
    return await sendAdminAlert(
      'New Registration Request',
      `${email} has requested to register as ${role}`,
      { type: 'new_registration', email, role }
    )
  }, [sendAdminAlert])

  // Send alert when password reset is requested
  const sendPasswordResetAlert = useCallback(async (email: string) => {
    return await sendAdminAlert(
      'Password Reset Request',
      `${email} has requested a password reset`,
      { type: 'password_reset', email }
    )
  }, [sendAdminAlert])

  // Send alert when user updates their profile
  const sendUserUpdateAlert = useCallback(async (email: string, action: string) => {
    return await sendAdminAlert(
      'User Profile Updated',
      `${email} has ${action}`,
      { type: 'user_update', email, action }
    )
  }, [sendAdminAlert])

  return {
    permission,
    token,
    notifications,
    isSupported,
    loading,
    requestPermission,
    sendAdminAlert,
    sendNewRegistrationAlert,
    sendPasswordResetAlert,
    sendUserUpdateAlert,
  }
}
