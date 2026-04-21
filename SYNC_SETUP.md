# Multi-Platform Sync System Setup Guide

This guide explains how to set up the sync system between Supabase, Firebase, and Cloudflare for your The Order-Reagizo Service Company application.

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Localhost     │◄────────┤  Cloudflare      │────────►│   Supabase      │
│   (Dev)         │  Sync   │  Workers         │  Sync   │   (PostgreSQL)  │
└─────────────────┘ Service  └──────────────────┘ Service  └─────────────────┘
       │                       │                      │
       │                       │                      │
       └───────────────────────┼──────────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │    Firebase     │
                      │   (Firestore)   │
                      │  Real-time Sync │
                      └─────────────────┘
                               │
                ┌──────────────┼──────────────┐
                ▼              ▼              ▼
           ┌─────────┐   ┌─────────┐   ┌─────────┐
           │  iPhone │   │ Laptop  │   │ Other   │
           │   App   │   │  Web    │   │ Devices │
           └─────────┘   └─────────┘   └─────────┘
```

## Sync Flow

1. **Source of Truth**: Supabase PostgreSQL database
2. **Sync Layer**: Cloudflare Workers sync Supabase → Firebase
3. **Real-time**: Firebase Firestore provides real-time sync to all devices
4. **Offline Support**: Mobile devices queue changes and sync when online

## Prerequisites

- Supabase project with your existing database
- Firebase project with Firestore enabled
- Cloudflare account for Workers
- Node.js 18+ installed

## Step 1: Configure Firebase

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing "the-ordertz"
3. Enable Firestore Database in Test Mode (or configure rules later)

### 1.2 Get Firebase Configuration

1. Go to Project Settings → General → Your apps
2. Add a Web app
3. Copy the firebaseConfig object

### 1.3 Update Environment Variables

Add to your `.env` file:

```bash
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
VITE_FIREBASE_VAPID_KEY=your-vapid-key
```

## Step 2: Configure Cloudflare Workers

### 2.1 Update Wrangler Configuration

Edit `workers/sync-service/wrangler.toml`:

```toml
name = "theordertz-sync-service"
main = "index.ts"
compatibility_date = "2026-04-04"

[vars]
VITE_SUPABASE_URL = "https://your-project.supabase.co"
VITE_SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
FIREBASE_PROJECT_ID = "your-project-id"
FIREBASE_SERVICE_ACCOUNT_KEY = "your-service-account-json-as-string"
```

### 2.2 Get Firebase Service Account JSON Key

The Cloudflare Worker now accepts the service account JSON key directly and handles OAuth2 token generation automatically.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project: `the-ordertz`
3. Go to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
5. Name it `firebase-sync-worker`
6. Click **Create and Continue**
7. Add role: **Firebase Admin SDK Administrator Service Agent**
8. Click **Done**
9. Click the service account → **Keys** tab → **Add Key** → **Create New Key**
10. Select **JSON** and click **Create** (download the file)
11. Open the JSON file and copy the entire content
12. Convert it to a single-line string (replace newlines with `\n`)
13. Add it to `workers/sync-service/wrangler.toml` as `FIREBASE_SERVICE_ACCOUNT_KEY`

### 2.3 Deploy Cloudflare Worker

```bash
cd workers/sync-service
npm install
wrangler deploy
```

Note the deployed URL (e.g., `https://theordertz-sync-service.workers.dev`)

### 2.4 Update Sync Service URL

Add to your `.env` file:

```bash
VITE_SYNC_SERVICE_URL=https://theordertz-sync-service.workers.dev
```

## Step 3: Configure Supabase

Your Supabase database is already configured with the following tables:
- users
- agents
- customers
- transactions
- float_requests
- float_exchanges
- audit_log
- registration_alerts
- password_reset_requests

Update `wrangler.jsonc` with your Supabase credentials:

```jsonc
{
  "vars": {
    "VITE_SUPABASE_URL": "https://your-project.supabase.co",
    "VITE_SUPABASE_ANON_KEY": "your-anon-key",
    "VITE_SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
    "FIREBASE_PROJECT_ID": "your-project-id",
    "FIREBASE_ACCESS_TOKEN": "your-firebase-access-token"
  }
}
```

## Step 4: Install Mobile Dependencies (Optional)

For mobile sync features, install Capacitor plugins:

```bash
npm install @capacitor/local-notifications @capacitor/network
npx cap sync
```

## Step 5: Initialize Sync in Your App

### 5.1 In Root Component

```tsx
import { useEffect } from 'react'
import { initSyncManager } from '@/lib/sync-manager'

function App() {
  useEffect(() => {
    // Initialize sync manager
    const syncManager = initSyncManager({
      autoSync: true,
      syncInterval: 60000, // 1 minute
      enableRealtime: true,
      syncOnOnline: true,
    })

    return () => {
      syncManager.destroy()
    }
  }, [])

  return <YourApp />
}
```

### 5.2 Using the Sync Hook

```tsx
import { useSync } from '@/hooks/useSync'

function Dashboard() {
  const { stats, syncAll, syncTable } = useSync()

  const handleSyncAll = async () => {
    const result = await syncAll()
    if (result.success) {
      console.log('Sync completed')
    }
  }

  return (
    <div>
      <p>Last sync: {stats.lastSync?.toLocaleString()}</p>
      <p>Sync count: {stats.syncCount}</p>
      <button onClick={handleSyncAll}>Sync Now</button>
    </div>
  )
}
```

### 5.3 Mobile Sync Setup

```tsx
import { useEffect } from 'react'
import { initMobileSync } from '@/lib/mobile-sync'

function MobileApp() {
  useEffect(() => {
    const mobileSync = initMobileSync({
      enableOfflineMode: true,
      syncOnNetworkChange: true,
      notifyOnSyncComplete: true,
      retryFailedSyncs: true,
      maxRetries: 3,
    })

    return () => {
      // Cleanup if needed
    }
  }, [])

  return <YourMobileApp />
}
```

## Step 6: Firebase Firestore Security Rules

Configure Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

For production, implement more granular rules based on user roles.

## Step 7: Test the Sync

### 7.1 Test Cloudflare Worker

```bash
curl https://theordertz-sync-service.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-21T00:00:00.000Z"
}
```

### 7.2 Test Sync Status

```bash
curl https://theordertz-sync-service.workers.dev/sync/status
```

### 7.3 Test Manual Sync

```bash
curl -X POST https://theordertz-sync-service.workers.dev/sync/all
```

### 7.4 Test in Browser

1. Open your app in browser
2. Make a change in Supabase
3. Check if it syncs to Firebase
4. Check real-time updates in browser console

## Step 8: Monitor Sync

The sync manager provides statistics:

```typescript
const { stats } = useSync()
// stats.lastSync - Last sync timestamp
// stats.syncCount - Total sync count
// stats.errors - Error count
// stats.isSyncing - Current sync status
```

## Conflict Resolution Strategy

The sync system uses a **last-write-wins** strategy based on timestamps:

1. **Supabase is source of truth** - All authoritative writes go to Supabase
2. **Firebase is read-mostly** - Used for real-time sync and offline support
3. **Timestamp comparison** - When conflicts occur, the record with the latest `updated_at` wins
4. **Audit log** - All changes are logged in Supabase `audit_log` table

For custom conflict resolution, extend the `sync-manager.ts` with your logic.

## Troubleshooting

### Sync Not Working

1. Check Cloudflare Worker logs: `wrangler tail`
2. Verify Firebase credentials in `.env`
3. Check Supabase service role key has proper permissions
4. Ensure Firestore is enabled in Firebase Console

### Mobile Sync Issues

1. Verify Capacitor plugins are installed
2. Check network permissions in Android/iOS
3. Review local storage for pending syncs
4. Enable debug logs in mobile-sync.ts

### Firebase Real-time Not Updating

1. Check Firestore security rules
2. Verify Firebase initialization in browser
3. Check browser console for errors
4. Ensure real-time listeners are enabled

## Performance Considerations

- **Sync Interval**: Default is 60 seconds. Adjust based on your needs.
- **Batch Size**: Cloudflare Worker syncs 100 records at a time.
- **Real-time Listeners**: Only enable for collections you need.
- **Mobile Offline**: Limit pending sync queue size to prevent storage issues.

## Production Checklist

- [ ] Set up Firebase production security rules
- [ ] Enable Firestore in production mode
- [ ] Configure Cloudflare Workers with production secrets
- [ ] Set up monitoring and alerting
- [ ] Test offline sync on mobile devices
- [ ] Configure backup strategy for Firebase
- [ ] Document sync failure recovery procedures
- [ ] Set up log aggregation for sync service

## Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Supabase Documentation](https://supabase.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)

## Support

For issues with the sync system:
1. Check this guide's troubleshooting section
2. Review Cloudflare Worker logs
3. Check Firebase Console for errors
4. Review Supabase logs for database issues
