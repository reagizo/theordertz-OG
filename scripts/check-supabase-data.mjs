// Script to check and sync Supabase data across tables
import { supabase } from '../src/lib/supabase.js'

async function checkTables() {
  console.log('=== Checking Supabase Tables ===\n')

  // Check users table
  console.log('--- USERS TABLE ---')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, is_test_account, is_active')
    .order('created_at', { ascending: false })
  
  if (usersError) {
    console.error('Error fetching users:', usersError)
  } else {
    console.log(`Total users: ${users?.length || 0}`)
    users?.forEach(u => {
      console.log(`  - ${u.email} | Role: ${u.role} | Test: ${u.is_test_account} | Active: ${u.is_active}`)
    })
  }

  // Check agents table
  console.log('\n--- AGENTS TABLE ---')
  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, business_name, status, float_balance, commission_earned')
    .order('created_at', { ascending: false })
  
  if (agentsError) {
    console.error('Error fetching agents:', agentsError)
  } else {
    console.log(`Total agents: ${agents?.length || 0}`)
    agents?.forEach(a => {
      console.log(`  - ${a.business_name || 'N/A'} | Status: ${a.status} | Float: ${a.float_balance} | Commission: ${a.commission_earned}`)
    })
  }

  // Check customers table
  console.log('\n--- CUSTOMERS TABLE ---')
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, tier, status, wallet_balance, credit_limit, credit_used')
    .order('created_at', { ascending: false })
  
  if (customersError) {
    console.error('Error fetching customers:', customersError)
  } else {
    console.log(`Total customers: ${customers?.length || 0}`)
    customers?.forEach(c => {
      console.log(`  - ID: ${c.id} | Tier: ${c.tier} | Status: ${c.status} | Wallet: ${c.wallet_balance} | Credit: ${c.credit_used}/${c.credit_limit}`)
    })
  }

  // Check transactions table
  console.log('\n--- TRANSACTIONS TABLE ---')
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('id, service_type, amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (transactionsError) {
    console.error('Error fetching transactions:', transactionsError)
  } else {
    console.log(`Total transactions: ${transactions?.length || 0} (showing last 10)`)
    transactions?.forEach(t => {
      console.log(`  - ID: ${t.id} | Service: ${t.service_type} | Amount: ${t.amount} | Status: ${t.status} | Date: ${t.created_at}`)
    })
  }

  // Check for orphaned records (users without agent/customer records)
  console.log('\n--- CHECKING ORPHANED RECORDS ---')
  const { data: adminUsers } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('role', 'admin')
  
  console.log(`Admin users: ${adminUsers?.length || 0}`)
  adminUsers?.forEach(u => console.log(`  - ${u.email}`))

  const { data: agentUsers } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('role', 'agent')
  
  console.log(`Agent users: ${agentUsers?.length || 0}`)
  
  const { data: customerUsers } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('role', 'customer')
  
  console.log(`Customer users: ${customerUsers?.length || 0}`)

  // Check if agents have corresponding agent records
  for (const agentUser of agentUsers || []) {
    const { data: agentRecord } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentUser.id)
      .single()
    
    if (!agentRecord) {
      console.log(`  ⚠️ Agent user ${agentUser.email} missing agent record`)
    }
  }

  // Check if customers have corresponding customer records
  for (const customerUser of customerUsers || []) {
    const { data: customerRecord } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerUser.id)
      .single()
    
    if (!customerRecord) {
      console.log(`  ⚠️ Customer user ${customerUser.email} missing customer record`)
    }
  }

  console.log('\n=== END OF CHECK ===')
}

checkTables().catch(console.error)
