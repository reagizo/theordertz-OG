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

async function createRegistrationAlert() {
  const email = 'test-agent-reagizo@example.com'
  const name = 'John Doe'
  const alertType = 'agent'

  console.log('Creating registration alert for test agent...')
  console.log('Email:', email)
  console.log('Name:', name)

  try {
    const { error } = await supabase
      .from('registration_alerts')
      .insert({
        alert_type: alertType,
        name,
        email,
        customer_tier: null,
        message: `New ${alertType} registration request from ${email} - Pending approval by admin@example.com or rkaijage@gmail.com`,
        is_test_account: true,
        is_read: false,
      })

    if (error) {
      console.error('Error creating alert:', error)
      throw error
    }

    console.log('Registration alert created successfully!')
    console.log('You should now see this in the admin hub under Registrations tab')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

createRegistrationAlert()
