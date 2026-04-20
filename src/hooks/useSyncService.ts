// React hook for the multi-platform sync service
import { useEffect, useState, useCallback } from 'react'
import { syncService } from '@/lib/sync-service'

// Define SyncStatus type inline to prevent server-side module loading
export interface SyncStatus {
  lastSynced: Date | null
  isSyncing: boolean
  pendingChanges: number
  conflicts: number
  lastError: string | null
  platform: 'supabase' | 'firebase' | 'cloudflare' | 'localhost'
}

export function useSyncService() {
  const [syncStatus, setSyncStatus] = useState<Map<string, SyncStatus>>(new Map())
  const [isInitialized, setIsInitialized] = useState(false)
  const [devices, setDevices] = useState<any[]>([])

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    // Subscribe to sync status changes
    const unsubscribe = syncService.subscribe((status) => {
      setSyncStatus(new Map(status))
      setIsInitialized(true)
      setDevices(syncService.getDevices())
    })

    // Register current device
    const deviceId = localStorage.getItem('deviceId') || generateDeviceId()
    localStorage.setItem('deviceId', deviceId)
    syncService.registerDevice(deviceId, navigator.platform)

    return () => {
      unsubscribe()
    }
  }, [])

  const triggerSync = useCallback(async (collection?: string) => {
    if (typeof window === 'undefined') return
    await syncService.triggerSync(collection)
  }, [])

  const getPlatformStatus = useCallback((platform: 'supabase' | 'firebase' | 'cloudflare' | 'localhost') => {
    return syncStatus.get(platform)
  }, [syncStatus])

  const isAnyPlatformSyncing = useCallback(() => {
    return Array.from(syncStatus.values()).some(status => status.isSyncing)
  }, [syncStatus])

  const getTotalPendingChanges = useCallback(() => {
    return Array.from(syncStatus.values()).reduce((total, status) => total + status.pendingChanges, 0)
  }, [syncStatus])

  const getTotalConflicts = useCallback(() => {
    return Array.from(syncStatus.values()).reduce((total, status) => total + status.conflicts, 0)
  }, [syncStatus])

  const getAllErrors = useCallback(() => {
    return Array.from(syncStatus.values())
      .map(status => status.lastError)
      .filter((error): error is string => error !== null)
  }, [syncStatus])

  return {
    syncStatus,
    isInitialized,
    triggerSync,
    getPlatformStatus,
    isAnyPlatformSyncing,
    getTotalPendingChanges,
    getTotalConflicts,
    getAllErrors,
    devices,
  }
}

function generateDeviceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}
