import { useSyncService } from '@/hooks/useSyncService'
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export function SyncStatus() {
  const {
    syncStatus,
    isInitialized,
    triggerSync,
    isAnyPlatformSyncing,
    getTotalPendingChanges,
    getTotalConflicts,
    getAllErrors,
    devices,
  } = useSyncService()

  if (!isInitialized) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>Initializing sync...</span>
      </div>
    )
  }

  const totalPending = getTotalPendingChanges()
  const totalConflicts = getTotalConflicts()
  const errors = getAllErrors()
  const isSyncing = isAnyPlatformSyncing()

  const handleSyncAll = async () => {
    await triggerSync()
  }

  const handleSyncCollection = async (collection: string) => {
    await triggerSync(collection)
  }

  const platforms = ['supabase', 'firebase', 'cloudflare', 'localhost'] as const

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white rounded-lg shadow-xl max-w-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          {isSyncing ? (
            <RefreshCw className="w-5 h-5 animate-spin text-blue-400" />
          ) : totalConflicts > 0 ? (
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          ) : errors.length > 0 ? (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-400" />
          )}
          <span className="font-semibold">Sync Status</span>
        </div>
        <button
          onClick={handleSyncAll}
          disabled={isSyncing}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          title="Sync all collections"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-2 bg-gray-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Pending: {totalPending}</span>
          <span className="text-gray-400">Conflicts: {totalConflicts}</span>
          <span className="text-gray-400">Devices: {devices.length}</span>
        </div>
      </div>

      {/* Platform Status */}
      <div className="px-4 py-2 space-y-2 max-h-60 overflow-y-auto">
        {platforms.map((platform) => {
          const status = syncStatus.get(platform)
          if (!status) return null

          return (
            <div key={platform} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {status.isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                ) : status.lastError ? (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                ) : status.lastSynced ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Clock className="w-4 h-4 text-gray-400" />
                )}
                <span className="capitalize">{platform}</span>
              </div>
              <div className="text-right text-xs text-gray-400">
                {status.lastSynced ? (
                  <span>{new Date(status.lastSynced).toLocaleTimeString()}</span>
                ) : (
                  <span>Not synced</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="px-4 py-2 bg-red-900/20 border-t border-red-900">
          <div className="text-xs text-red-400 font-semibold mb-1">Errors:</div>
          {errors.slice(0, 3).map((error, i) => (
            <div key={i} className="text-xs text-red-300 truncate">
              {error}
            </div>
          ))}
          {errors.length > 3 && (
            <div className="text-xs text-red-400">
              +{errors.length - 3} more
            </div>
          )}
        </div>
      )}

      {/* Connected Devices */}
      {devices.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 font-semibold mb-1">Connected Devices:</div>
          <div className="space-y-1">
            {devices.slice(0, 3).map((device) => (
              <div key={device.deviceId} className="flex items-center gap-2 text-xs">
                {device.isOnline ? (
                  <Wifi className="w-3 h-3 text-green-400" />
                ) : (
                  <WifiOff className="w-3 h-3 text-gray-500" />
                )}
                <span className="text-gray-300 truncate">
                  {device.platform.substring(0, 20)}
                </span>
              </div>
            ))}
            {devices.length > 3 && (
              <div className="text-xs text-gray-400">
                +{devices.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-gray-700">
        <div className="text-xs text-gray-400 font-semibold mb-1">Quick Sync:</div>
        <div className="flex flex-wrap gap-1">
          {['users', 'agents', 'customers', 'transactions'].map((collection) => (
            <button
              key={collection}
              onClick={() => handleSyncCollection(collection)}
              disabled={isSyncing}
              className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
            >
              {collection}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
