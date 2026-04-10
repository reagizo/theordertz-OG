-- Migration: Add Super Agents table and link to customers/agents
-- Run this in Supabase SQL Editor

-- Create super_agents table
CREATE TABLE IF NOT EXISTS super_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE,
  admin_requested_by TEXT
);

-- Add assigned_super_agent_id to customer_profiles
ALTER TABLE customer_profiles 
ADD COLUMN IF NOT EXISTS assigned_super_agent_id UUID REFERENCES super_agents(id);

-- Add assigned_super_agent_id to agent_profiles
ALTER TABLE agent_profiles 
ADD COLUMN IF NOT EXISTS assigned_super_agent_id UUID REFERENCES super_agents(id);

-- Add assigned_super_agent_id to transactions (to track which super agent processed)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS assigned_super_agent_id UUID REFERENCES super_agents(id);

-- Add assigned_super_agent_id to float_requests
ALTER TABLE float_requests 
ADD COLUMN IF NOT EXISTS assigned_super_agent_id UUID REFERENCES super_agents(id);

-- Insert a default Super Agent (you can modify or add more)
INSERT INTO super_agents (id, full_name, email, phone, status)
VALUES (
  uuid_generate_v4(),
  'The Order Admin',
  'superagent@theorder.co.tz',
  '+255700000001',
  'active'
) ON CONFLICT (email) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_profiles_super_agent ON customer_profiles(assigned_super_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_profiles_super_agent ON agent_profiles(assigned_super_agent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_super_agent ON transactions(assigned_super_agent_id);
