// Script to sync Supabase database schema and seed data
// Run with: node scripts/sync-supabase.js

const { createClient } = require('@supabase/supabase-js')

// Use the same credentials from vite.config.ts
const supabaseUrl = 'https://dlgtwwknvlncprphejaj.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZ3R3d2tudmxuY3BycGhlamFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI1MTU3NCwiZXhwIjoyMDkwODI3NTc0fQ.076NYiAofmB6E7gFthmmskllLt44V2pkDMtmnb_K7Tw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAndApplyMigrations() {
  console.log('Checking database state...')
  
  try {
    // Check if users table exists
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_production_stats')
      .catch(() => ({ data: null, error: new Error('Function not found') }))
    
    if (tablesError) {
      console.log('Database schema not fully set up. Applying seed data...')
      
      // Insert seed admin accounts
      const admins = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@theordertz.com',
          password_hash: '$2a$10$placeholder', // This should be replaced with actual bcrypt hash
          full_name: 'System Administrator',
          role: 'admin',
          is_test_account: false,
          is_active: true
        },
        {
          id: 'a1b2c3d4-0001-0000-0000-000000000001',
          email: 'rkaijage@gmail.com',
          password_hash: '$2a$10$placeholder', // This should be replaced with actual bcrypt hash
          full_name: 'REAGAN ROBERT KAIJAGE',
          role: 'admin',
          is_test_account: false,
          is_active: true
        },
        {
          id: 'a1b2c3d4-0001-0000-0000-000000000002',
          email: 'admin@example.com',
          password_hash: '$2a$10$placeholder', // This should be replaced with actual bcrypt hash
          full_name: 'Owner - Administrator',
          role: 'admin',
          is_test_account: false,
          is_active: true
        }
      ]
      
      for (const admin of admins) {
        const { error: insertError } = await supabase
          .from('users')
          .insert(admin)
        
        if (insertError && !insertError.message.includes('duplicate')) {
          console.log(`Error inserting ${admin.email}:`, insertError.message)
        } else {
          console.log(`✓ Inserted admin: ${admin.email}`)
        }
      }
      
      console.log('\nSeed data applied successfully!')
      console.log('Note: Passwords need to be set manually through the Supabase dashboard or auth system.')
    } else {
      console.log('✓ Database schema is already set up')
      console.log('Production stats:', tables)
    }
    
  } catch (error) {
    console.error('Error:', error.message)
    console.log('\nNote: If the schema is partially applied, you may need to:')
    console.log('1. Check the Supabase dashboard at https://app.supabase.com/project/dlgtwwknvlncprphejaj')
    console.log('2. Apply migrations manually through the SQL editor')
    console.log('3. Or reset the database and apply migrations from scratch')
  }
}

checkAndApplyMigrations()
