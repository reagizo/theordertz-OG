// Sync Manager - Handles bidirectional sync between Supabase and Firebase
// This utility manages the sync lifecycle for all platforms

import {
  syncUserToFirebase,
  syncAgentToFirebase,
  syncCustomerToFirebase,
  syncTransactionToFirebase,
  syncFloatRequestToFirebase,
  syncFloatExchangeToFirebase,
  syncAuditLogToFirebase,
  syncPasswordResetRequestToFirebase,
  syncAllTablesToFirebase,
  syncTableToFirebase,
  getSyncStatus,
  subscribeToUsers,
  subscribeToAgents,
  subscribeToCustomers,
  subscribeToTransactions,
  subscribeToFloatRequests,
  subscribeToFloatExchanges,
} from './firebase-db'

export interface SyncConfig {
  autoSync: boolean
  syncInterval: number // milliseconds
  enableRealtime: boolean
  syncOnOnline: boolean
}

export interface SyncStats {
  lastSync: Date | null
  syncCount: number
  errors: number
  isSyncing: boolean
}

class SyncManager {
  private config: SyncConfig = {
    autoSync: true,
    syncInterval: 60000, // 1 minute
    enableRealtime: true,
    syncOnOnline: true,
  }

  private stats: SyncStats = {
    lastSync: null,
    syncCount: 0,
    errors: 0,
    isSyncing: false,
  }

  private syncTimer: NodeJS.Timeout | null = null
  private subscriptions: Array<() => void> = []
  private listeners: Array<(stats: SyncStats) => void> = []

  constructor(config?: Partial<SyncConfig>) {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    if (typeof window !== 'undefined') {
      this.setupOnlineListener()
      if (this.config.autoSync) {
        this.startAutoSync()
      }
    }
  }

  // Update configuration
  updateConfig(config: Partial<SyncConfig>) {
    this.config = { ...this.config, ...config }
    
    if (config.autoSync !== undefined) {
      if (config.autoSync) {
        this.startAutoSync()
      } else {
        this.stopAutoSync()
      }
    }
  }

  // Get current sync stats
  getStats(): SyncStats {
    return { ...this.stats }
  }

  // Subscribe to stats changes
  onStatsChange(callback: (stats: SyncStats) => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.getStats()))
  }

  // Setup online/offline listener
  private setupOnlineListener() {
    const handleOnline = () => {
      if (this.config.syncOnOnline) {
        this.syncAll()
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', () => {
      // Handle offline state - could queue changes
    })

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }

  // Start automatic sync
  private startAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
    }

    this.syncTimer = setInterval(() => {
      this.syncAll()
    }, this.config.syncInterval)
  }

  // Stop automatic sync
  private stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  // Sync all tables from Supabase to Firebase
  async syncAll(): Promise<{ success: boolean; results?: any; error?: string }> {
    if (this.stats.isSyncing) {
      return { success: false, error: 'Sync already in progress' }
    }

    this.stats.isSyncing = true
    this.notifyListeners()

    try {
      const result = await syncAllTablesToFirebase()
      
      if (result.success) {
        this.stats.lastSync = new Date()
        this.stats.syncCount++
      } else {
        this.stats.errors++
      }

      this.stats.isSyncing = false
      this.notifyListeners()
      
      return result
    } catch (error) {
      this.stats.isSyncing = false
      this.stats.errors++
      this.notifyListeners()
      
      return { success: false, error: String(error) }
    }
  }

  // Sync specific table
  async syncTable(tableName: string): Promise<{ success: boolean; result?: any; error?: string }> {
    return syncTableToFirebase(tableName)
  }

  // Sync individual record
  async syncRecord(tableName: string, data: any): Promise<{ success: boolean; error?: string }> {
    switch (tableName) {
      case 'users':
        return syncUserToFirebase(data)
      case 'agents':
        return syncAgentToFirebase(data)
      case 'customers':
        return syncCustomerToFirebase(data)
      case 'transactions':
        return syncTransactionToFirebase(data)
      case 'float_requests':
        return syncFloatRequestToFirebase(data)
      case 'float_exchanges':
        return syncFloatExchangeToFirebase(data)
      case 'audit_log':
        return syncAuditLogToFirebase(data)
      case 'password_reset_requests':
        return syncPasswordResetRequestToFirebase(data)
      default:
        return { success: false, error: `Unknown table: ${tableName}` }
    }
  }

  // Get sync status from Cloudflare Worker
  async getStatus(): Promise<{ success: boolean; status?: any; error?: string }> {
    return getSyncStatus()
  }

  // Setup real-time listeners for Firebase changes
  enableRealtimeListeners() {
    if (!this.config.enableRealtime) return

    // Users
    this.subscriptions.push(
      subscribeToUsers((data) => {
        console.log('[Sync] Users updated:', data.length)
        // Emit custom event or trigger callback
        window.dispatchEvent(new CustomEvent('firebase-users-updated', { detail: data }))
      })
    )

    // Agents
    this.subscriptions.push(
      subscribeToAgents((data) => {
        console.log('[Sync] Agents updated:', data.length)
        window.dispatchEvent(new CustomEvent('firebase-agents-updated', { detail: data }))
      })
    )

    // Customers
    this.subscriptions.push(
      subscribeToCustomers((data) => {
        console.log('[Sync] Customers updated:', data.length)
        window.dispatchEvent(new CustomEvent('firebase-customers-updated', { detail: data }))
      })
    )

    // Transactions
    this.subscriptions.push(
      subscribeToTransactions((data) => {
        console.log('[Sync] Transactions updated:', data.length)
        window.dispatchEvent(new CustomEvent('firebase-transactions-updated', { detail: data }))
      })
    )

    // Float Requests
    this.subscriptions.push(
      subscribeToFloatRequests((data) => {
        console.log('[Sync] Float requests updated:', data.length)
        window.dispatchEvent(new CustomEvent('firebase-float-requests-updated', { detail: data }))
      })
    )

    // Float Exchanges
    this.subscriptions.push(
      subscribeToFloatExchanges((data) => {
        console.log('[Sync] Float exchanges updated:', data.length)
        window.dispatchEvent(new CustomEvent('firebase-float-exchanges-updated', { detail: data }))
      })
    )
  }

  // Cleanup - stop all sync and listeners
  destroy() {
    this.stopAutoSync()
    this.subscriptions.forEach(unsubscribe => unsubscribe())
    this.subscriptions = []
    this.listeners = []
  }
}

// Global sync manager instance
let syncManager: SyncManager | null = null

// Initialize sync manager
export function initSyncManager(config?: Partial<SyncConfig>): SyncManager {
  if (!syncManager) {
    syncManager = new SyncManager(config)
  }
  return syncManager
}

// Get sync manager instance
export function getSyncManager(): SyncManager | null {
  return syncManager
}

// Destroy sync manager
export function destroySyncManager() {
  if (syncManager) {
    syncManager.destroy()
    syncManager = null
  }
}
