// React hook for managing sync between Supabase and Firebase
import { useEffect, useState, useCallback } from 'react'
import { initSyncManager, getSyncManager, destroySyncManager, type SyncConfig, type SyncStats } from '@/lib/sync-manager'

export function useSync(config?: Partial<SyncConfig>) {
  const [stats, setStats] = useState<SyncStats>({
    lastSync: null,
    syncCount: 0,
    errors: 0,
    isSyncing: false,
  })
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const manager = initSyncManager(config)
    setIsInitialized(true)

    // Subscribe to stats changes
    const unsubscribe = manager.onStatsChange((newStats) => {
      setStats(newStats)
    })

    // Enable real-time listeners
    manager.enableRealtimeListeners()

    return () => {
      unsubscribe()
      destroySyncManager()
      setIsInitialized(false)
    }
  }, [])

  const syncAll = useCallback(async () => {
    const manager = getSyncManager()
    if (!manager) return { success: false, error: 'Sync manager not initialized' }
    return manager.syncAll()
  }, [])

  const syncTable = useCallback(async (tableName: string) => {
    const manager = getSyncManager()
    if (!manager) return { success: false, error: 'Sync manager not initialized' }
    return manager.syncTable(tableName)
  }, [])

  const syncRecord = useCallback(async (tableName: string, data: any) => {
    const manager = getSyncManager()
    if (!manager) return { success: false, error: 'Sync manager not initialized' }
    return manager.syncRecord(tableName, data)
  }, [])

  const getStatus = useCallback(async () => {
    const manager = getSyncManager()
    if (!manager) return { success: false, error: 'Sync manager not initialized' }
    return manager.getStatus()
  }, [])

  const updateConfig = useCallback((newConfig: Partial<SyncConfig>) => {
    const manager = getSyncManager()
    if (!manager) return
    manager.updateConfig(newConfig)
  }, [])

  return {
    stats,
    isInitialized,
    syncAll,
    syncTable,
    syncRecord,
    getStatus,
    updateConfig,
  }
}
