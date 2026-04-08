#!/usr/bin/env node

/**
 * Seed test accounts into Supabase Auth
 * 
 * This script creates test user accounts in Supabase's authentication system.
 * Run this after deploying your migrations to ensure test accounts exist.
 * 
 * Usage:
 *   node scripts/seed-test-accounts.mjs
 * 
 * Environment Variables:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Admin service role key (for creating users)
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '../.env.local')

try {
  const envContent = readFileSync(envPath, 'utf-8')
  const lines = envContent.split('\n')
  for (const line of lines) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim()
      if (value) {
        process.env[key.trim()] = value
      }
    }
  }
} catch (err) {
  console.warn(`⚠️  Could not load .env.local: ${err.message}`)
}

// Configuration
const testAccounts = [
  {
    email: 'rkaijage@gmail.com',
    password: '@Eva0191!',
    name: 'REAGAN ROBERT KAIJAGE',
    role: 'admin',
  },
  {
    email: 'admin@example.com',
    password: 'admin',
    name: 'Admin Test Account',
    role: 'test',
  },
  {
    email: 'reagizo@hotmail.com',
    password: 'reagizo123',
    name: 'Reagizo Test Account',
    role: 'customer',
  },
]

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error()
  console.error('Please set these in your .env.local file and try again.')
  process.exit(1)
}

// Create admin client (requires service role key)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

console.log('🔄 Seeding test accounts into Supabase...\n')

// Seed accounts
let successCount = 0
let skipCount = 0
let errorCount = 0

for (const account of testAccounts) {
  try {
    console.log(`📧 Processing: ${account.email}`)

    // Create user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: account.name,
      },
    })

    if (error) {
      // If user already exists, that's okay - just skip
      const errorMsg = (error.message || error.msg || JSON.stringify(error)).toLowerCase()      
      if (errorMsg.includes('already') || errorMsg.includes('exist')) {
        console.log(`   ✓ User already exists, skipping\n`)
        skipCount++
        continue
      }

      // Other errors are real problems
      throw new Error(error.message || JSON.stringify(error))
    }

    if (data?.user?.id) {
      console.log(`   ✓ Created successfully (ID: ${data.user.id})\n`)
      successCount++
    }
  } catch (err) {
    console.error(`   ✗ Error: ${err.message}\n`)
    errorCount++
  }
}

// Summary
console.log('═'.repeat(50))
console.log('📊 Seed Summary:')
console.log(`   ✓ Created: ${successCount}`)
console.log(`   ⊘ Skipped: ${skipCount}`)
console.log(`   ✗ Errors: ${errorCount}`)
console.log('═'.repeat(50))
console.log()

if (errorCount > 0) {
  console.error('⚠️  Some accounts failed to seed. Check the errors above.')
  process.exit(1)
}

console.log('✅ Test accounts ready! You can now log in with:')
console.log()
for (const account of testAccounts) {
  console.log(`   Email: ${account.email}`)
  console.log(`   Password: ${account.password}`)
  console.log(`   Role: ${account.role}`)
  console.log()
}
