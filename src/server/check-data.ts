import { createRouteHandlerClient } from '@tanstack/react-start'
import { createServerFn } from '@tanstack/start'
import { supabase } from '@/lib/supabase'

export const checkData = createServerFn({ method: 'GET' })
  .handler(async () => {
    const results: Record<string, any> = {}

    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, is_test_account, is_active')
      .order('created_at', { ascending: false })
    
    results.users = {
      count: users?.length || 0,
      error: usersError?.message,
      data: users?.map(u => ({
        email: u.email,
        role: u.role,
        is_test_account: u.is_test_account,
        is_active: u.is_active
      }))
    }

    // Check agents table
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, business_name, status, float_balance')
      .order('created_at', { ascending: false })
    
    results.agents = {
      count: agents?.length || 0,
      error: agentsError?.message,
      data: agents?.map(a => ({
        id: a.id,
        business_name: a.business_name,
        status: a.status,
        float_balance: a.float_balance
      }))
    }

    // Check customers table
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, tier, status, wallet_balance')
      .order('created_at', { ascending: false })
    
    results.customers = {
      count: customers?.length || 0,
      error: customersError?.message,
      data: customers?.map(c => ({
        id: c.id,
        tier: c.tier,
        status: c.status,
        wallet_balance: c.wallet_balance
      }))
    }

    // Check transactions table
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, service_type, amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    results.transactions = {
      count: transactions?.length || 0,
      error: transactionsError?.message,
      data: transactions
    }

    // Check for orphaned records
    const agentUsers = users?.filter(u => u.role === 'agent') || []
    const customerUsers = users?.filter(u => u.role === 'customer') || []
    
    results.orphaned = {
      agents: [],
      customers: []
    }

    for (const agentUser of agentUsers) {
      const { data: agentRecord } = await supabase
        .from('agents')
        .select('id')
        .eq('id', agentUser.id)
        .single()
      
      if (!agentRecord) {
        results.orphaned.agents.push(agentUser.email)
      }
    }

    for (const customerUser of customerUsers) {
      const { data: customerRecord } = await supabase
        .from('customers')
        .select('id')
        .eq('id', customerUser.id)
        .single()
      
      if (!customerRecord) {
        results.orphaned.customers.push(customerUser.email)
      }
    }

    return results
  })
