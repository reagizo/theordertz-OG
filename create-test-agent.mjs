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

async function createTestAgent() {
  const email = 'test-agent-reagizo@example.com'
  const password = 'TestAgent123!'
  const fullName = 'John Doe'
  const phone = '+255123456789'
  const nationalId = '1234567890123'
  const address = 'Dar es Salaam, Tanzania'
  const businessName = 'Reagizo Test Agency'

  console.log('Creating test agent...')
  console.log('Email:', email)
  console.log('Password:', password)

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    let userId

    if (existingUser) {
      userId = existingUser.id
      console.log('User already exists, using existing ID:', userId)
    } else {
      // Create user in users table with all fields
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: password, // In production, this should be hashed
          full_name: fullName,
          phone,
          national_id: nationalId,
          address,
          role: 'agent',
          is_test_account: true,
          is_active: true,
        })
        .select()
        .single()

      if (userError) {
        console.error('Error creating user:', userError)
        throw userError
      }

      userId = newUser.id
      console.log('User created with ID:', userId)
    }

    // Create agent record (only agent-specific fields)
    const { data: agentData, error: agentError } = await supabase
      .from('agents')
      .upsert({
        id: userId,
        business_name: businessName,
        status: 'approved',
        float_balance: 0,
        commission_rate: 2.50,
        commission_earned: 0,
      })
      .select()
      .single()

    if (agentError) {
      console.error('Error creating agent:', agentError)
      throw agentError
    }

    console.log('Agent created successfully!')
    console.log('--- CREDENTIALS ---')
    console.log('Email:', email)
    console.log('Password:', password)
    console.log('-------------------')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

createTestAgent()
