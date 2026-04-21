import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearSupabaseData() {
  console.log('=== CLEARING SUPABASE DATA ===')
  console.log('This will delete ALL data except admin@example.com and rkaijage@gmail.com users')
  console.log('')

  const adminEmails = ['admin@example.com', 'rkaijage@gmail.com']

  try {
    // Get admin user IDs to preserve them
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id, email')
      .in('email', adminEmails)

    const adminIds = adminUsers?.map(u => u.id) || []
    console.log('Preserving admin users:', adminUsers?.map(u => u.email).join(', ') || 'none')

    // Delete all data from tables in order (respecting foreign keys)
    const tables = [
      'transactions',
      'float_requests',
      'float_exchanges',
      'registration_alerts',
      'password_reset_requests',
      'agents',
      'customers',
      'vendors',
    ]

    for (const table of tables) {
      console.log(`Deleting from ${table}...`)
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

      if (error) {
        console.error(`  Error deleting from ${table}:`, error.message)
      } else {
        console.log(`  ✓ Deleted from ${table}`)
      }
    }

    // Delete all users except admins
    console.log('\nDeleting non-admin users...')
    const { error: userDeleteError } = await supabase
      .from('users')
      .delete()
      .not('email', 'in', `(${adminEmails.map(e => `'${e}'`).join(',')})`)

    if (userDeleteError) {
      console.error('  Error deleting users:', userDeleteError.message)
    } else {
      console.log('  ✓ Deleted non-admin users')
    }

    console.log('\n=== DATA CLEARED SUCCESSFULLY ===')
    console.log('Preserved users:', adminEmails.join(', '))

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

clearSupabaseData()
