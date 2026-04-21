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

async function createAgentForUser() {
  const email = 'test-agent@example.com'
  const name = 'Kuku Baga'

  console.log('Creating agent record for user...')
  console.log('Email:', email)
  console.log('Name:', name)

  try {
    // Get user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userError || !user) {
      console.error('User not found:', userError)
      throw new Error('User not found')
    }

    const userId = user.id
    console.log('User ID:', userId)

    // Create agent record
    const { error: agentError } = await supabase
      .from('agents')
      .insert({
        id: userId,
        business_name: name,
        status: 'approved',
        float_balance: 0,
        commission_rate: 2.50,
        commission_earned: 0,
      })

    if (agentError) {
      console.error('Error creating agent:', agentError)
      throw agentError
    }

    console.log('Agent record created successfully!')
    console.log('Now transactions can be created for this agent')

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

createAgentForUser()
