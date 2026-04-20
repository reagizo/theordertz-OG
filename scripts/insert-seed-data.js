// Script to insert seed data into Supabase database
// Run with: node scripts/insert-seed-data.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dlgtwwknvlncprphejaj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZ3R3d2tudmxuY3BycGhlamFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI1MTU3NCwiZXhwIjoyMDkwODI3NTc0fQ.076NYiAofmB6E7gFthmmskllLt44V2pkDMtmnb_K7Tw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function insertSeedData() {
  console.log('Inserting seed admin accounts...')
  
  const admins = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@theordertz.com',
      password_hash: '$2a$10$placeholder',
      full_name: 'System Administrator',
      role: 'admin',
      is_test_account: false,
      is_active: true
    },
    {
      id: 'a1b2c3d4-0001-0000-0000-000000000001',
      email: 'rkaijage@gmail.com',
      password_hash: '$2a$10$placeholder',
      full_name: 'REAGAN ROBERT KAIJAGE',
      role: 'admin',
      is_test_account: false,
      is_active: true
    },
    {
      id: 'a1b2c3d4-0001-0000-0000-000000000002',
      email: 'admin@example.com',
      password_hash: '$2a$10$placeholder',
      full_name: 'Owner - Administrator',
      role: 'admin',
      is_test_account: false,
      is_active: true
    }
  ]
  
  for (const admin of admins) {
    try {
      const { error } = await supabase
        .from('users')
        .insert(admin)
      
      if (error) {
        if (error.code === '23505') { // Unique violation
          console.log(`✓ ${admin.email} already exists (skipping)`)
        } else if (error.code === '42P01') { // Relation does not exist
          console.log(`✗ Error: users table does not exist. Database schema not set up.`)
          console.log('\nPlease apply the full migrations first by running:')
          console.log('  supabase db push --yes')
          return
        } else {
          console.log(`✗ Error inserting ${admin.email}:`, error.message)
        }
      } else {
        console.log(`✓ Inserted admin: ${admin.email}`)
      }
    } catch (error) {
      console.log(`✗ Error with ${admin.email}:`, error.message)
    }
  }
  
  console.log('\nDone!')
}

insertSeedData()
