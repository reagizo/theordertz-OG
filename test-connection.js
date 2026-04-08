import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

async function testConnection() {
  const { data, error } = await supabase.from('users').select('*')
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Data:', data)
  }
}

testConnection()