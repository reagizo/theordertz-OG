# Supabase to Firebase Sync Setup

This document explains how to set up ongoing synchronization between Supabase and Firebase Firestore, including the initial migration and real-time sync.

## Overview

The sync system consists of two parts:

1. **Initial Migration** (`scripts/migrate-supabase-to-firebase.ts`) - One-time script to clone all existing Supabase data to Firebase
2. **Ongoing Sync** (`src/lib/sync-service.ts`) - Real-time synchronization that keeps both databases in sync

## Tables Synced

All tables from your Supabase schema are synchronized:

- `users`
- `agents`
- `customers`
- `transactions`
- `float_requests`
- `float_exchanges`
- `audit_log` (preserved)
- `registration_alerts`
- `password_reset_requests`

## Prerequisites

### Environment Variables

Add these to your `.env` file:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Firebase
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Firebase Admin (for migration script) - Optional
# Only needed if not using service account JSON file
FIREBASE_SERVICE_ACCOUNT_PATH=./service-account.json
```

### Firebase Service Account (Recommended)

For the migration script, you need a Firebase Admin SDK service account. The easiest method is to use a service account JSON file:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `service-account.json` in your project root
4. The migration script will automatically detect and use it

**Alternative: Environment Variables**

If you prefer not to use a JSON file, you can set these environment variables instead:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (with `\n` replaced by actual newlines)

## Step 1: Initial Migration

**First, create a Firebase service account:**

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file as `service-account.json` in your project root
4. **Important:** Never commit this file to version control (add to `.gitignore`)

**Then run the migration:**

```bash
npm run migrate:firebase
```

The script will automatically detect the `service-account.json` file and use it for authentication.

This script will:
- Connect to Supabase using the service role key
- Fetch all records from each table
- Transform PostgreSQL data types to Firestore-compatible formats
- Batch write to Firebase (400 records per batch)
- Provide a summary of migrated records

### Data Transformations

The migration automatically handles:

- **UUIDs** → Strings
- **TIMESTAMPTZ** → JavaScript Date objects
- **JSONB fields** → Plain objects
- **INET (IP addresses)** → Strings
- **Enums** → Strings (Firestore has no native enum type)

## Step 2: Ongoing Sync

After the initial migration, the sync service (`src/lib/sync-service.ts`) automatically handles ongoing synchronization.

### How It Works

1. **Supabase Realtime** - Listens to PostgreSQL changes via Supabase realtime subscriptions
2. **Firebase Realtime** - Listens to Firestore changes via onSnapshot
3. **Sync Queue** - Changes are queued and processed every second
4. **Conflict Detection** - Uses timestamps to detect and handle conflicts
5. **Retry Logic** - Automatic retries for failed operations (3 attempts)

### Sync Direction

The sync is **bidirectional**:
- Supabase changes → Firebase
- Firebase changes → Supabase

### Conflict Resolution

When the same record is modified in both databases:
- Compares `updated_at` timestamps
- If incoming change is older than existing by >1 second → Conflict
- Conflicts are logged and require manual resolution
- Otherwise, the newer change wins

## Manual Sync Trigger

You can manually trigger a full sync of all collections or a specific collection:

```typescript
import { syncService } from './lib/sync-service'

// Sync all collections
await syncService.triggerSync()

// Sync specific collection
await syncService.triggerSync('users')
```

## Monitoring Sync Status

Subscribe to sync status updates:

```typescript
import { syncService } from './lib/sync-service'

const unsubscribe = syncService.subscribe((status) => {
  console.log('Sync status:', status)
  // status is a Map of platform -> SyncStatus
})

// Unsubscribe when done
unsubscribe()
```

### Sync Status Interface

```typescript
interface SyncStatus {
  lastSynced: Date | null
  isSyncing: boolean
  pendingChanges: number
  conflicts: number
  lastError: string | null
  platform: 'supabase' | 'firebase' | 'cloudflare' | 'localhost'
}
```

## Audit Log Preservation

The `audit_log` table is fully synchronized to Firebase. All audit entries from Supabase are preserved and kept in sync in real-time.

## Troubleshooting

### Migration Fails

- Verify Supabase credentials have read access
- Check Firebase service account has write access
- Ensure network connectivity to both services

### Sync Not Working

- Check browser console for errors
- Verify Firebase is initialized (check `src/lib/firebase.ts`)
- Ensure Supabase realtime is enabled for your tables
- Check RLS policies allow read access

### Conflicts

- Check sync status for conflict count
- Review `sync_logs` collection in Firebase for details
- Manually resolve conflicts in the source database

## Performance Considerations

- **Batch Size**: Migration uses 400 records per batch to stay within Firestore limits
- **Sync Interval**: Queue processes every second
- **Retry Logic**: Failed operations retry up to 3 times with exponential backoff
- **Memory**: Large datasets may require running migration in chunks

## Security Notes

- Service role key bypasses RLS - use only for migration script
- Firebase service account has admin privileges - keep secure
- Browser sync uses anon key - respects RLS policies
- Never commit service account keys to version control

## Next Steps

1. Set up environment variables
2. Generate Firebase service account
3. Run initial migration: `npm run migrate:firebase`
4. Verify data in Firebase Console
5. Test ongoing sync by making changes in Supabase
6. Monitor sync status in your application
