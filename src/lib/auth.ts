// Supabase-based authentication
import { supabase, supabaseAdmin } from './supabase'

export type User = {
  id: string
  email: string
  name?: string
  role?: 'super_agent' | 'admin' | 'agent' | 'customer'
  app_metadata?: { roles?: string[]; isTestAccount?: boolean }
  user_metadata?: { full_name?: string; profilePicture?: string }
}

// Helper functions for backward compatibility
export function isTestUser(user?: User | null): boolean {
  return !!user?.app_metadata?.isTestAccount
}

export function getCurrentUserRole(user?: User | null): string {
  return user?.app_metadata?.roles?.[0] ?? 'guest'
}

// Password reset requests (now stored in Supabase)
export type PasswordResetRequest = {
  id: string
  email: string
  new_password_hash: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  processed_at?: string
  processed_by?: string
}

export async function requestPasswordReset(email: string, newPassword: string): Promise<PasswordResetRequest> {
  // Hash the password (simple implementation - in production use proper hashing)
  const passwordHash = newPassword // TODO: Implement proper hashing
  
  const { data, error } = await supabase
    .from('password_reset_requests')
    .insert({
      email,
      new_password_hash: passwordHash,
      status: 'pending',
    })
    .select()
    .single()
  
  if (error) throw error
  return data as PasswordResetRequest
}

export async function listPendingPasswordResets(): Promise<PasswordResetRequest[]> {
  const { data, error } = await supabase
    .from('password_reset_requests')
    .select('*')
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })
  
  if (error) throw error
  return (data || []) as PasswordResetRequest[]
}

export async function approvePasswordReset(requestId: string): Promise<boolean> {
  // Get the request
  const { data: request, error: fetchError } = await supabase
    .from('password_reset_requests')
    .select('*')
    .eq('id', requestId)
    .single()
  
  if (fetchError || !request) return false
  
  // Update user password in users table
  const { error: updateError } = await supabase
    .from('users')
    .update({ password_hash: request.new_password_hash })
    .eq('email', request.email)
  
  if (updateError) return false
  
  // Mark request as approved
  const { error: statusError } = await supabase
    .from('password_reset_requests')
    .update({
      status: 'approved',
      processed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
  
  return !statusError
}

export async function rejectPasswordReset(requestId: string): Promise<boolean> {
  const { error } = await supabase
    .from('password_reset_requests')
    .update({
      status: 'rejected',
      processed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
  
  return !error
}

// Registration management (now uses Supabase)
export type PendingRegistration = { 
  email: string
  role: 'agent' | 'customer'
  name?: string
  is_test_account?: boolean
}

export async function requestRegistration(
  email: string, 
  role: 'agent' | 'customer', 
  meta?: Record<string, unknown>
): Promise<void> {
  // Check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('email')
    .eq('email', email)
    .single()
  
  if (existingUser) return
  
  // Create registration alert for admin (visible to admin@example.com and rkaijage@gmail.com)
  const { error } = await supabaseAdmin
    .from('registration_alerts')
    .insert({
      alert_type: role,
      name: meta?.name as string || email,
      email,
      customer_tier: role === 'customer' ? 'd2d' : null,
      message: `New ${role} registration request from ${email} - Pending approval by admin@example.com or rkaijage@gmail.com`,
      is_test_account: !!meta?.isTestAccount,
    })
  
  if (error) throw error
}

export async function listPendingRegistrations(): Promise<PendingRegistration[]> {
  const { data, error } = await supabase
    .from('registration_alerts')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  
  return (data || []).map(alert => ({
    email: alert.email,
    role: alert.alert_type as 'agent' | 'customer',
    name: alert.name,
    is_test_account: alert.is_test_account,
  }))
}

export async function approveRegistration(email: string): Promise<User | null> {
  // Get the registration alert
  const { data: alert, error: fetchError } = await supabase
    .from('registration_alerts')
    .select('*')
    .eq('email', email)
    .eq('is_read', false)
    .single()
  
  if (fetchError || !alert) return null
  
  // Create user in users table
  const tempPassword = 'Temp123!' // TODO: Send password reset email instead
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: tempPassword, // TODO: Use proper hashing
      full_name: alert.name || email,
      role: alert.alert_type,
      is_test_account: alert.is_test_account,
      is_active: true,
    })
    .select()
    .single()

  if (createError) return null

  // Create corresponding agent or customer record with PENDING status for admin approval
  if (alert.alert_type === 'agent') {
    await supabaseAdmin
      .from('agents')
      .insert({
        id: newUser.id,
        business_name: alert.name || email,
        status: 'pending',
        float_balance: 0,
        commission_rate: 2.50,
        commission_earned: 0,
      })
  } else if (alert.alert_type === 'customer') {
    await supabaseAdmin
      .from('customers')
      .insert({
        id: newUser.id,
        tier: alert.customer_tier || 'd2d',
        status: 'pending',
        wallet_balance: 0,
        credit_limit: 0,
        credit_used: 0,
      })
  }
  
  // Mark alert as read
  await supabase
    .from('registration_alerts')
    .update({ is_read: true })
    .eq('id', alert.id)
  
  return {
    id: newUser.id,
    email: newUser.email,
    name: newUser.full_name,
    app_metadata: {
      roles: [newUser.role],
      isTestAccount: newUser.is_test_account,
    },
  }
}

export async function login(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  const user = data.user

  if (!user) throw new Error('Login failed')

  // Get role from user metadata (set during signup) first
  let role = user.user_metadata?.roles?.[0]
  let isTestAccount = user.user_metadata?.is_test_account

  // Fallback to email-based role determination if metadata is missing
  if (!role) {
    const getRoleForEmail = (email: string): string => {
      if (email === 'rkaijage@gmail.com' || email === 'admin@example.com') return 'admin'
      if (email.includes('agent')) return 'agent'
      if (email.includes('admin')) return 'admin'
      return 'customer'
    }
    role = getRoleForEmail(email)
  }

  if (isTestAccount === undefined) {
    isTestAccount = email.includes('test') || email.includes('example.com')
  }

  // Check approval status for agents and customers
  if (role === 'agent') {
    const { data: agentData } = await supabaseAdmin
      .from('agents')
      .select('status')
      .eq('id', user.id)
      .single()
    
    if (agentData?.status === 'rejected') {
      await supabase.auth.signOut()
      throw new Error('Your agent account has been rejected. Please contact the administrator.')
    }
    if (agentData?.status === 'pending') {
      await supabase.auth.signOut()
      throw new Error('Your agent account is pending approval. Please wait for administrator approval.')
    }
  } else if (role === 'customer') {
    const { data: customerData } = await supabaseAdmin
      .from('customers')
      .select('status')
      .eq('id', user.id)
      .single()
    
    if (customerData?.status === 'rejected') {
      await supabase.auth.signOut()
      throw new Error('Your customer account has been rejected. Please contact the administrator.')
    }
    if (customerData?.status === 'pending') {
      await supabase.auth.signOut()
      throw new Error('Your customer account is pending approval. Please wait for administrator approval.')
    }
  }

  return {
    id: user.id,
    email: user.email ?? '',
    name: user.user_metadata?.full_name ?? '',
    app_metadata: {
      roles: [role || 'customer'],
      isTestAccount: isTestAccount || false,
    },
  }
}

export async function signup(email: string, password: string, meta: Record<string, unknown>): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: meta.full_name,
        roles: [meta.role || 'customer'],
        is_test_account: meta.isTestAccount,
      },
    },
  })

  if (error) throw error

  const user = data.user

  if (!user) throw new Error('Signup failed')

  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name,
    app_metadata: {
      roles: user.user_metadata?.roles || ['customer'],
      isTestAccount: user.user_metadata?.is_test_account || false,
    },
  }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}

// ... (rest of the code remains the same)
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()

  if (error) return null

  const user = data.user

  if (!user) return null

  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name,
    app_metadata: {
      roles: user.user_metadata?.roles,
      isTestAccount: user.user_metadata?.is_test_account,
    },
  }
}

export async function seedLiveData(): Promise<void> {
  // Seed live data (live onboarding flow) for testing without demo seeds
  const pending = await listPendingRegistrations()
  const seedPending: Array<{ email: string; role: 'agent' | 'customer'; name?: string }> = [
    { email: 'live-agent1@example.com', role: 'agent', name: 'Live Agent One' },
    { email: 'live-customer1@example.com', role: 'customer', name: 'Live Customer One' },
  ]
  for (const s of seedPending) {
    const exists = pending.find(p => p.email === s.email)
    if (!exists) await requestRegistration(s.email, s.role, { name: s.name })
  }
  const existsAdmin = await supabase
    .from('users')
    .select('email')
    .eq('email', 'live-admin@example.com')
    .single()
  if (!existsAdmin.data) {
    await supabase
      .from('users')
      .insert({
        email: 'live-admin@example.com',
        password_hash: 'LivePwd!', // TODO: Use proper hashing
        full_name: 'Live Admin',
        role: 'admin',
        is_test_account: false,
        is_active: true,
      })
  }
  const existsAgent = await supabase
    .from('users')
    .select('email')
    .eq('email', 'live-agent1@example.com')
    .single()
  if (!existsAgent.data) {
    await supabase
      .from('users')
      .insert({
        email: 'live-agent1@example.com',
        password_hash: 'LivePwd!', // TODO: Use proper hashing
        full_name: 'Live Agent One',
        role: 'agent',
        is_test_account: false,
        is_active: true,
      })
  }
  const existsCustomer = await supabase
    .from('users')
    .select('email')
    .eq('email', 'live-customer1@example.com')
    .single()
  if (!existsCustomer.data) {
    await supabase
      .from('users')
      .insert({
        email: 'live-customer1@example.com',
        password_hash: 'LivePwd!', // TODO: Use proper hashing
        full_name: 'Live Customer One',
        role: 'customer',
        is_test_account: false,
        is_active: true,
      })
  }
}

export async function seedProductionLiveData(): Promise<void> {
  await seedLiveData()
  const additionalPending: Array<{ email: string; role: 'agent' | 'customer'; name?: string }> = [
    { email: 'live-agent2@example.com', role: 'agent', name: 'Live Agent Two' },
    { email: 'live-agent3@example.com', role: 'agent', name: 'Live Agent Three' },
    { email: 'live-customer2@example.com', role: 'customer', name: 'Live Customer Two' },
  ]
  const pending = await listPendingRegistrations()
  for (const a of additionalPending) {
    const exists = pending.find(p => p.email === a.email)
    if (!exists) await requestRegistration(a.email, a.role, { name: a.name })
  }
}

export function getRegisteredAccountsCount(): number {
  // TODO: Implement this function using Supabase
  return 0
}

// Function to check and sync data across Supabase tables
export async function checkAndSyncData() {
  console.log('=== Checking Supabase Tables ===\n')

  const results: Record<string, any> = {}

  // Check users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, role, is_test_account, is_active, full_name')
    .order('created_at', { ascending: false })
  
  console.log('--- USERS TABLE ---')
  if (usersError) {
    console.error('Error fetching users:', usersError)
  } else {
    console.log(`Total users: ${users?.length || 0}`)
    users?.forEach(u => {
      console.log(`  - ${u.email} | Role: ${u.role} | Test: ${u.is_test_account} | Active: ${u.is_active}`)
    })
  }
  results.users = users

  // Check agents table using admin client to bypass RLS
  const { data: agents, error: agentsError } = await supabaseAdmin
    .from('agents')
    .select('id, business_name, status, float_balance, commission_earned')
    .order('created_at', { ascending: false })
  
  console.log('\n--- AGENTS TABLE ---')
  if (agentsError) {
    console.error('Error fetching agents:', agentsError)
  } else {
    console.log(`Total agents: ${agents?.length || 0}`)
    agents?.forEach(a => {
      console.log(`  - ${a.business_name || 'N/A'} | Status: ${a.status} | Float: ${a.float_balance} | Commission: ${a.commission_earned}`)
    })
  }
  results.agents = agents

  // Check customers table using admin client to bypass RLS
  const { data: customers, error: customersError } = await supabaseAdmin
    .from('customers')
    .select('id, tier, status, wallet_balance, credit_limit, credit_used')
    .order('created_at', { ascending: false })
  
  console.log('\n--- CUSTOMERS TABLE ---')
  if (customersError) {
    console.error('Error fetching customers:', customersError)
  } else {
    console.log(`Total customers: ${customers?.length || 0}`)
    customers?.forEach(c => {
      console.log(`  - ID: ${c.id} | Tier: ${c.tier} | Status: ${c.status} | Wallet: ${c.wallet_balance} | Credit: ${c.credit_used}/${c.credit_limit}`)
    })
  }
  results.customers = customers

  // Check transactions table using admin client to bypass RLS
  const { data: transactions, error: transactionsError } = await supabaseAdmin
    .from('transactions')
    .select('id, service_type, amount, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  
  console.log('\n--- TRANSACTIONS TABLE ---')
  if (transactionsError) {
    console.error('Error fetching transactions:', transactionsError)
  } else {
    console.log(`Total transactions: ${transactions?.length || 0} (showing last 10)`)
    transactions?.forEach(t => {
      console.log(`  - ID: ${t.id} | Service: ${t.service_type} | Amount: ${t.amount} | Status: ${t.status} | Date: ${t.created_at}`)
    })
  }
  results.transactions = transactions

  // Check for orphaned records and sync them
  console.log('\n--- SYNCING ORPHANED RECORDS ---')
  
  const agentUsers = users?.filter(u => u.role === 'agent') || []
  const customerUsers = users?.filter(u => u.role === 'customer') || []
  
  let syncedAgents = 0
  let syncedCustomers = 0

  for (const agentUser of agentUsers) {
    const { data: agentRecord } = await supabaseAdmin
      .from('agents')
      .select('id')
      .eq('id', agentUser.id)
      .single()
    
    if (!agentRecord) {
      console.log(`  Creating agent record for ${agentUser.email}`)
      const { error: insertError } = await supabaseAdmin
        .from('agents')
        .insert({
          id: agentUser.id,
          business_name: agentUser.full_name || agentUser.email,
          status: 'approved',
          float_balance: 0,
          commission_rate: 2.50,
          commission_earned: 0,
        })
      
      if (!insertError) {
        syncedAgents++
      } else {
        console.error(`    Error: ${insertError.message}`)
      }
    }
  }

  for (const customerUser of customerUsers) {
    const { data: customerRecord } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('id', customerUser.id)
      .single()
    
    if (!customerRecord) {
      console.log(`  Creating customer record for ${customerUser.email}`)
      const { error: insertError } = await supabaseAdmin
        .from('customers')
        .insert({
          id: customerUser.id,
          tier: 'd2d',
          status: 'approved',
          wallet_balance: 0,
          credit_limit: 0,
          credit_used: 0,
        })
      
      if (!insertError) {
        syncedCustomers++
      } else {
        console.error(`    Error: ${insertError.message}`)
      }
    }
  }

  console.log(`\nSynced ${syncedAgents} agent records`)
  console.log(`Synced ${syncedCustomers} customer records`)

  console.log('\n=== END OF CHECK ===')
  
  return {
    results,
    synced: { agents: syncedAgents, customers: syncedCustomers }
  }
}