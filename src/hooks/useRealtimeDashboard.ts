// Option A: Realtime Dashboard with Firestore subscriptions
// This hook provides real-time updates from Firestore collections

import { useEffect, useState, useCallback } from 'react'
import {
  subscribeToTestAccounts,
  subscribeToRealAccounts,
  subscribeToRegistrationAlerts,
  subscribeToUserUpdates
} from '@/lib/firebase-db'

// Define DocumentData type inline to prevent server-side Firebase loading
export type DocumentData = Record<string, unknown>

export interface RealtimeDashboardData {
  testAccounts: DocumentData[]
  realAccounts: DocumentData[]
  registrationAlerts: DocumentData[]
  userUpdates: DocumentData[]
  loading: boolean
  error: string | null
}

export function useRealtimeDashboard(enabled: boolean = true) {
  const [data, setData] = useState<RealtimeDashboardData>({
    testAccounts: [],
    realAccounts: [],
    registrationAlerts: [],
    userUpdates: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!enabled) return

    let unsubscribers: (() => void)[] = []

    // Subscribe to test accounts
    const unsubTestAccounts = subscribeToTestAccounts((testAccounts) => {
      setData(prev => ({ ...prev, testAccounts, loading: false }))
    })
    unsubscribers.push(unsubTestAccounts)

    // Subscribe to real accounts
    const unsubRealAccounts = subscribeToRealAccounts((realAccounts) => {
      setData(prev => ({ ...prev, realAccounts, loading: false }))
    })
    unsubscribers.push(unsubRealAccounts)

    // Subscribe to registration alerts
    const unsubRegistrationAlerts = subscribeToRegistrationAlerts((registrationAlerts) => {
      setData(prev => ({ ...prev, registrationAlerts, loading: false }))
    })
    unsubscribers.push(unsubRegistrationAlerts)

    // Subscribe to user updates (for real-time activity feed)
    const unsubUserUpdates = subscribeToUserUpdates((userUpdates) => {
      setData(prev => ({ ...prev, userUpdates, loading: false }))
    })
    unsubscribers.push(unsubUserUpdates)

    // Cleanup all subscriptions
    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [enabled])

  const refresh = useCallback(() => {
    setData(prev => ({ ...prev, loading: true }))
  }, [])

  return { ...data, refresh }
}

// Hook for subscribing to a specific collection
export function useRealtimeCollection<T = DocumentData>(
  collectionName: string,
  constraints: any[] = [],
  enabled: boolean = true
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    try {
      const { subscribeToCollection } = require('@/lib/firebase-db')
      const unsubscribe = subscribeToCollection(collectionName, constraints, (collectionData: DocumentData[]) => {
        setData(collectionData as T[])
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (err) {
      setError(String(err))
      setLoading(false)
    }
  }, [collectionName, JSON.stringify(constraints), enabled])

  return { data, loading, error }
}
