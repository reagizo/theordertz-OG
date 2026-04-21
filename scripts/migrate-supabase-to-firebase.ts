/**
 * Migration Script: Clone Supabase Tables to Firebase Firestore
 * 
 * This script performs a one-time migration of all data from Supabase to Firebase.
 * After migration, the sync-service.ts will handle ongoing synchronization.
 * 
 * Usage:
 *   npx tsx scripts/migrate-supabase-to-firebase.ts
 * 
 * Environment Variables Required:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_SERVICE_ROLE_KEY
 *   VITE_FIREBASE_API_KEY
 *   VITE_FIREBASE_PROJECT_ID
 */

import { createClient } from '@supabase/supabase-js'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { config } from 'dotenv'

// Load environment variables from .env file
config()

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

// Firebase Admin SDK configuration
// Supports either service account JSON file or environment variables
let firebaseConfig: any

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './service-account.json'

try {
  // Try to load from service account JSON file first (recommended)
  const serviceAccountPathResolved = resolve(serviceAccountPath)
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPathResolved, 'utf-8'))
  firebaseConfig = {
    credential: cert(serviceAccount),
  }
  console.log('✅ Loaded Firebase credentials from service account file:', serviceAccountPathResolved)
} catch (error) {
  // Fallback to environment variables
  console.log('⚠️  Service account file not found, trying environment variables...')
  
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin SDK credentials not found. Please either:\n' +
      '1. Create a service account JSON file from Firebase Console and set FIREBASE_SERVICE_ACCOUNT_PATH\n' +
      '2. Or set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables\n\n' +
      'To create a service account:\n' +
      '- Go to Firebase Console → Project Settings → Service Accounts\n' +
      '- Click "Generate new private key"\n' +
      '- Save the JSON file and set FIREBASE_SERVICE_ACCOUNT_PATH to its path'
    )
  }

  firebaseConfig = {
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  }
  console.log('✅ Loaded Firebase credentials from environment variables')
}

// Tables to migrate (in dependency order)
const tables = [
  'users',
  'agents',
  'customers',
  'transactions',
  'float_requests',
  'float_exchanges',
  'audit_log',
  'registration_alerts',
  'password_reset_requests',
]

// Initialize Supabase client
const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

// Initialize Firebase Admin
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

// Test Firestore connection and check if database exists
console.log('🔍 Checking Firestore database...')
try {
  await db.listCollections()
  console.log('✅ Firestore database is accessible')
} catch (error: any) {
  if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
    console.error('\n❌ Firestore database not found or not created.')
    console.error('\nTo create a Firestore database:')
    console.error('1. Go to Firebase Console: https://console.firebase.google.com/')
    console.error('2. Select your project: the-ordertz')
    console.error('3. Click "Build" → "Firestore Database"')
    console.error('4. Click "Create database"')
    console.error('5. Choose a location (recommended: us-central1 or closest to your users)')
    console.error('6. Choose "Start in test mode" (you can change rules later)')
    console.error('7. Click "Create"\n')
    process.exit(1)
  }
  throw error
}

// Migration statistics
interface MigrationStats {
  table: string
  totalRecords: number
  migratedRecords: number
  failedRecords: number
  errors: string[]
}

const stats: Map<string, MigrationStats> = new Map()

// Transform PostgreSQL data to Firestore-compatible format
function transformData(_tableName: string, data: any): any {
  const transformed = { ...data }

  // Convert UUID to string (already a string in JS, but ensure consistency)
  if (transformed.id) {
    transformed.id = String(transformed.id)
  }

  // Convert timestamps to Firestore Timestamp format
  const timestampFields = ['created_at', 'updated_at', 'last_login_at', 'approved_at', 'processed_at', 'requested_at']
  timestampFields.forEach(field => {
    if (transformed[field]) {
      transformed[field] = new Date(transformed[field])
    }
  })

  // Convert TIMESTAMPTZ to Date
  if (transformed.deleted_at) {
    transformed.deleted_at = new Date(transformed.deleted_at)
  }

  // Handle JSONB fields
  if (transformed.old_values && typeof transformed.old_values === 'object') {
    transformed.old_values = transformed.old_values
  }
  if (transformed.new_values && typeof transformed.new_values === 'object') {
    transformed.new_values = transformed.new_values
  }

  // Handle INET type (IP addresses)
  if (transformed.ip_address) {
    transformed.ip_address = String(transformed.ip_address)
  }

  // Add migration metadata
  transformed.migrated_at = new Date()
  transformed.migrated_from = 'supabase'

  return transformed
}

// Migrate a single table
async function migrateTable(tableName: string): Promise<MigrationStats> {
  console.log(`\n🔄 Starting migration for table: ${tableName}`)
  
  const tableStats: MigrationStats = {
    table: tableName,
    totalRecords: 0,
    migratedRecords: 0,
    failedRecords: 0,
    errors: [],
  }

  try {
    // Fetch all records from Supabase
    const { data: records, error } = await supabase
      .from(tableName)
      .select('*')

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`)
    }

    if (!records || records.length === 0) {
      console.log(`✅ Table ${tableName} is empty, skipping`)
      return tableStats
    }

    tableStats.totalRecords = records.length
    console.log(`📊 Found ${records.length} records in ${tableName}`)

    // Batch write to Firestore (max 500 operations per batch)
    const batchSize = 400
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = db.batch()
      const batchRecords = records.slice(i, i + batchSize)

      for (const record of batchRecords) {
        try {
          const docRef = db.collection(tableName).doc(record.id)
          const transformedData = transformData(tableName, record)
          batch.set(docRef, transformedData)
          tableStats.migratedRecords++
        } catch (error) {
          tableStats.failedRecords++
          tableStats.errors.push(`Record ${record.id}: ${error}`)
          console.error(`❌ Failed to transform record ${record.id}:`, error)
        }
      }

      // Commit the batch
      try {
        await batch.commit()
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)} completed (${batchRecords.length} records)`)
      } catch (error) {
        console.error(`❌ Batch commit failed:`, error)
        // If batch fails, try individual writes
        for (const record of batchRecords) {
          try {
            const docRef = db.collection(tableName).doc(record.id)
            const transformedData = transformData(tableName, record)
            await docRef.set(transformedData)
          } catch (individualError) {
            tableStats.failedRecords++
            tableStats.errors.push(`Record ${record.id} (individual): ${individualError}`)
          }
        }
      }
    }

    console.log(`✅ Migration completed for ${tableName}: ${tableStats.migratedRecords}/${tableStats.totalRecords} records migrated`)
  } catch (error) {
    console.error(`❌ Migration failed for ${tableName}:`, error)
    tableStats.errors.push(`Table migration failed: ${error}`)
  }

  return tableStats
}

// Main migration function
async function migrateAll() {
  console.log('🚀 Starting Supabase to Firebase migration...')
  console.log('📋 Tables to migrate:', tables.join(', '))

  // Validate environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials. Please set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY')
  }

  if (!process.env.VITE_FIREBASE_PROJECT_ID && !process.env.FIREBASE_PROJECT_ID) {
    throw new Error('Missing Firebase project ID. Please set VITE_FIREBASE_PROJECT_ID or FIREBASE_PROJECT_ID')
  }

  const startTime = Date.now()

  // Migrate each table
  for (const tableName of tables) {
    const tableStats = await migrateTable(tableName)
    stats.set(tableName, tableStats)
  }

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 MIGRATION SUMMARY')
  console.log('='.repeat(60))
  
  let totalRecords = 0
  let totalMigrated = 0
  let totalFailed = 0

  stats.forEach((stat, tableName) => {
    console.log(`\n📋 ${tableName}:`)
    console.log(`   Total records: ${stat.totalRecords}`)
    console.log(`   Migrated: ${stat.migratedRecords}`)
    console.log(`   Failed: ${stat.failedRecords}`)
    if (stat.errors.length > 0) {
      console.log(`   Errors: ${stat.errors.slice(0, 3).join(', ')}${stat.errors.length > 3 ? '...' : ''}`)
    }
    
    totalRecords += stat.totalRecords
    totalMigrated += stat.migratedRecords
    totalFailed += stat.failedRecords
  })

  console.log('\n' + '='.repeat(60))
  console.log('🎯 OVERALL STATISTICS')
  console.log('='.repeat(60))
  console.log(`Total records: ${totalRecords}`)
  console.log(`Successfully migrated: ${totalMigrated}`)
  console.log(`Failed: ${totalFailed}`)
  console.log(`Duration: ${duration}s`)
  console.log('='.repeat(60))

  if (totalFailed > 0) {
    console.log('\n⚠️  Some records failed to migrate. Check the errors above.')
    process.exit(1)
  } else {
    console.log('\n✅ Migration completed successfully!')
    console.log('🔄 The sync-service.ts will now handle ongoing synchronization.')
    process.exit(0)
  }
}

// Run migration
migrateAll().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
