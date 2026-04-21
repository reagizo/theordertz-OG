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

async function createUnreadAlert() {
  const email = 'test-agent-new@example.com'
  const name = 'New Test Agent'
  const alertType = 'agent'

  console.log('Creating unread registration alert...')
  console.log('Email:', email)
  console.log('Name:', name)

  try {
    // First, delete all existing alerts to clean up
    await supabase
      .from('registration_alerts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    // Create new unread alert
    const { error } = await supabase
      .from('registration_alerts')
      .insert({
        alert_type: alertType,
        name,
        email,
        customer_tier: null,
        message: `New ${alertType} registration request from ${email} - Pending approval by admin@example.com or rkaijage@gmail.com`,
        is_test_account: true,
        is_read: false, // Important: mark as unread
      })

    if (error) {
      console.error('Error creating alert:', error)
      throw error
    }

    console.log('Unread registration alert created successfully!')
    console.log('Both admin@example.com and rkaijage@gmail.com should now see this in the Registrations tab')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

createUnreadAlert()
