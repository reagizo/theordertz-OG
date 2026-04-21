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

async function createAlertForExistingUser() {
  const email = 'test-agent@example.com'
  const name = 'Kuku Baga'
  const alertType = 'agent'
  const authUserId = 'ffa573a0-5ae9-4abf-be52-085f41690a54'

  console.log('Creating registration alert for existing Supabase Auth user...')
  console.log('Email:', email)
  console.log('Name:', name)
  console.log('Auth User ID:', authUserId)

  try {
    // First, check if user exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    let userId

    if (!existingUser) {
      // Create user in users table using the auth user's ID
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: authUserId,
          email,
          password_hash: 'managed_by_supabase_auth',
          full_name: name,
          role: 'agent',
          is_test_account: true,
          is_active: true,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        throw createError
      }
      userId = newUser.id
      console.log('User created in users table with ID:', userId)
    } else {
      userId = existingUser.id
      console.log('User already exists in users table with ID:', userId)
    }

    // Create registration alert
    const { error: alertError } = await supabase
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

    if (alertError) {
      console.error('Error creating alert:', alertError)
      throw alertError
    }

    console.log('Registration alert created successfully!')
    console.log('You can now approve this user in the admin dashboard')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

createAlertForExistingUser()
