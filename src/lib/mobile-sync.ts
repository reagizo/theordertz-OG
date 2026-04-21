// Mobile sync utilities for Capacitor (iOS/Android)
// Handles offline-first sync with Firebase for mobile devices

import { Capacitor } from '@capacitor/core'
import { syncAllTablesToFirebase } from './firebase-db'

// Optional Capacitor plugins - will be undefined if not installed
let LocalNotifications: any = null
let Network: any = null

// Load optional plugins dynamically
async function loadOptionalPlugins() {
  try {
    const localNotifModule = await import('@capacitor/local-notifications')
    LocalNotifications = localNotifModule.LocalNotifications
  } catch (e) {
    console.warn('@capacitor/local-notifications not installed')
  }

  try {
    const networkModule = await import('@capacitor/network')
    Network = networkModule.Network
  } catch (e) {
    console.warn('@capacitor/network not installed')
  }
}

export interface MobileSyncConfig {
  enableOfflineMode: boolean
  syncOnNetworkChange: boolean
  notifyOnSyncComplete: boolean
  retryFailedSyncs: boolean
  maxRetries: number
}

class MobileSyncManager {
  private config: MobileSyncConfig = {
    enableOfflineMode: true,
    syncOnNetworkChange: true,
    notifyOnSyncComplete: true,
    retryFailedSyncs: true,
    maxRetries: 3,
  }

  private pendingSyncs: Array<{ tableName: string; data: any; timestamp: number }> = []
  private isOnline = true
  private retryCount = 0

  constructor(config?: Partial<MobileSyncConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    // Load optional plugins
    loadOptionalPlugins()

    if (Capacitor.isNativePlatform()) {
      this.setupMobileListeners()
    }
  }

  // Setup mobile-specific listeners
  private async setupMobileListeners() {
    // Request notification permissions
    try {
      if (LocalNotifications) {
        await LocalNotifications.requestPermissions()
      }
    } catch (error) {
      console.error('Failed to request notification permissions:', error)
    }

    // Network status listener
    if (Network) {
      Network.addListener('networkStatusChange', (status: any) => {
        this.isOnline = status.connected
        
        if (status.connected && this.config.syncOnNetworkChange) {
          this.syncPendingChanges()
        }
      })

      // Get initial network status
      const status = await Network.getStatus()
      this.isOnline = status.connected
    }
  }

  // Check if running on mobile
  isMobile(): boolean {
    return Capacitor.isNativePlatform()
  }

  // Check if online
  async isNetworkAvailable(): Promise<boolean> {
    if (!this.isMobile()) return true
    
    const status = await Network.getStatus()
    return status.connected
  }

  // Queue a sync operation for when offline
  queueSync(tableName: string, data: any) {
    if (!this.config.enableOfflineMode) {
      // If offline mode is disabled, try to sync immediately
      return this.syncNow(tableName, data)
    }

    this.pendingSyncs.push({
      tableName,
      data,
      timestamp: Date.now(),
    })

    // Save to local storage for persistence
    this.savePendingSyncs()

    console.log(`[Mobile Sync] Queued sync for ${tableName}`)
  }

  // Sync immediately (only if online)
  async syncNow(tableName: string, data: any): Promise<{ success: boolean; error?: string }> {
    const isOnline = await this.isNetworkAvailable()
    
    if (!isOnline) {
      if (this.config.enableOfflineMode) {
        this.queueSync(tableName, data)
        return { success: true }
      }
      return { success: false, error: 'No network connection' }
    }

    try {
      // Map table names to sync functions
      const syncFunctions: Record<string, any> = {
        users: (await import('./firebase-db')).syncUserToFirebase,
        agents: (await import('./firebase-db')).syncAgentToFirebase,
        customers: (await import('./firebase-db')).syncCustomerToFirebase,
        transactions: (await import('./firebase-db')).syncTransactionToFirebase,
        float_requests: (await import('./firebase-db')).syncFloatRequestToFirebase,
        float_exchanges: (await import('./firebase-db')).syncFloatExchangeToFirebase,
        audit_log: (await import('./firebase-db')).syncAuditLogToFirebase,
        password_reset_requests: (await import('./firebase-db')).syncPasswordResetRequestToFirebase,
      }

      const syncFn = syncFunctions[tableName]
      if (!syncFn) {
        return { success: false, error: `Unknown table: ${tableName}` }
      }

      const result = await syncFn(data)
      
      if (result.success && this.config.notifyOnSyncComplete) {
        await this.notifySyncSuccess(tableName)
      }

      return result
    } catch (error) {
      console.error(`[Mobile Sync] Failed to sync ${tableName}:`, error)
      
      if (this.config.enableOfflineMode) {
        this.queueSync(tableName, data)
      }

      return { success: false, error: String(error) }
    }
  }

  // Sync all pending changes when back online
  async syncPendingChanges(): Promise<{ success: boolean; synced: number; failed: number }> {
    if (this.pendingSyncs.length === 0) {
      return { success: true, synced: 0, failed: 0 }
    }

    console.log(`[Mobile Sync] Syncing ${this.pendingSyncs.length} pending changes`)

    let synced = 0
    let failed = 0

    for (const pending of [...this.pendingSyncs]) {
      try {
        const result = await this.syncNow(pending.tableName, pending.data)
        
        if (result.success) {
          this.pendingSyncs = this.pendingSyncs.filter(p => p !== pending)
          synced++
        } else {
          failed++
        }
      } catch (error) {
        console.error(`[Mobile Sync] Failed to sync pending change:`, error)
        failed++
      }
    }

    this.savePendingSyncs()

    if (this.config.notifyOnSyncComplete) {
      await this.notifyBatchSyncComplete(synced, failed)
    }

    // Reset retry count on success
    if (synced > 0) {
      this.retryCount = 0
    }

    return { success: true, synced, failed }
  }

  // Sync all tables from Firebase (for mobile devices)
  async syncAllFromFirebase(): Promise<{ success: boolean; results?: any; error?: string }> {
    const isOnline = await this.isNetworkAvailable()
    
    if (!isOnline) {
      return { success: false, error: 'No network connection' }
    }

    return syncAllTablesToFirebase()
  }

  // Save pending syncs to local storage
  private savePendingSyncs() {
    try {
      localStorage.setItem('pending_syncs', JSON.stringify(this.pendingSyncs))
    } catch (error) {
      console.error('[Mobile Sync] Failed to save pending syncs:', error)
    }
  }

  // Load pending syncs from local storage
  private loadPendingSyncs() {
    try {
      const saved = localStorage.getItem('pending_syncs')
      if (saved) {
        this.pendingSyncs = JSON.parse(saved)
      }
    } catch (error) {
      console.error('[Mobile Sync] Failed to load pending syncs:', error)
    }
  }

  // Notify user of sync success
  private async notifySyncSuccess(tableName: string) {
    if (!this.config.notifyOnSyncComplete) return

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title: 'Sync Complete',
            body: `${tableName} synced successfully`,
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      })
    } catch (error) {
      console.error('[Mobile Sync] Failed to send notification:', error)
    }
  }

  // Notify user of batch sync completion
  private async notifyBatchSyncComplete(synced: number, failed: number) {
    if (!this.config.notifyOnSyncComplete) return

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title: 'Batch Sync Complete',
            body: `Synced: ${synced}, Failed: ${failed}`,
            schedule: { at: new Date(Date.now() + 100) },
          },
        ],
      })
    } catch (error) {
      console.error('[Mobile Sync] Failed to send notification:', error)
    }
  }

  // Get pending syncs count
  getPendingSyncsCount(): number {
    return this.pendingSyncs.length
  }

  // Clear all pending syncs
  clearPendingSyncs() {
    this.pendingSyncs = []
    this.savePendingSyncs()
  }

  // Update configuration
  updateConfig(config: Partial<MobileSyncConfig>) {
    this.config = { ...this.config, ...config }
  }
}

// Global mobile sync manager instance
let mobileSyncManager: MobileSyncManager | null = null

// Initialize mobile sync manager
export function initMobileSync(config?: Partial<MobileSyncConfig>): MobileSyncManager {
  if (!mobileSyncManager) {
    mobileSyncManager = new MobileSyncManager(config)
  }
  return mobileSyncManager
}

// Get mobile sync manager instance
export function getMobileSyncManager(): MobileSyncManager | null {
  return mobileSyncManager
}
