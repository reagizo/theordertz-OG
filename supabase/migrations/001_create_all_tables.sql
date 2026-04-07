-- Migration: Create all tables for cross-device sync
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  national_id TEXT,
  address TEXT,
  business_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  float_balance NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 2.5,
  commission_earned NUMERIC NOT NULL DEFAULT 0,
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE,
  admin_requested_by TEXT
);

-- Customers table
CREATE TABLE IF NOT EXISTS customer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  national_id TEXT,
  address TEXT,
  tier TEXT NOT NULL DEFAULT 'd2d',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  wallet_balance NUMERIC NOT NULL DEFAULT 0,
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  credit_used NUMERIC NOT NULL DEFAULT 0,
  assigned_agent_id UUID REFERENCES agent_profiles(id),
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE,
  admin_requested_by TEXT
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agent_profiles(id),
  customer_id UUID REFERENCES customer_profiles(id),
  customer_tier TEXT NOT NULL DEFAULT 'd2d',
  amount NUMERIC NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  is_on_credit BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

-- Float requests table
CREATE TABLE IF NOT EXISTS float_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agent_profiles(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE
);

-- Float exchanges table
CREATE TABLE IF NOT EXISTS float_exchanges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agent_profiles(id),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- App users table
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'Clerk',
  profile_picture TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Registration alerts table
CREATE TABLE IF NOT EXISTS registration_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  tier TEXT,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE,
  admin_requested_by TEXT
);

-- Seed default data
INSERT INTO app_users (name, email, role, password) VALUES ('REAGAN ROBERT KAIJAGE', 'rkaijage@gmail.com', 'Admin', '@Eva0191!') ON CONFLICT (email) DO NOTHING;
INSERT INTO app_users (name, email, role, password) VALUES ('Test Account', 'admin@example.com', 'Test', 'admin') ON CONFLICT (email) DO NOTHING;
INSERT INTO app_settings (key, value) VALUES ('super_agent_name', '"Super Agent"') ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE float_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE float_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all access (for now, can be tightened later)
CREATE POLICY "public_all_agents" ON agent_profiles FOR ALL USING (true);
CREATE POLICY "public_all_customers" ON customer_profiles FOR ALL USING (true);
CREATE POLICY "public_all_transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "public_all_float_requests" ON float_requests FOR ALL USING (true);
CREATE POLICY "public_all_float_exchanges" ON float_exchanges FOR ALL USING (true);
CREATE POLICY "public_all_settings" ON app_settings FOR ALL USING (true);
CREATE POLICY "public_all_users" ON app_users FOR ALL USING (true);
CREATE POLICY "public_all_alerts" ON registration_alerts FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_email ON agent_profiles(email);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agent_profiles(status);
CREATE INDEX IF NOT EXISTS idx_agents_test ON agent_profiles(is_test_account);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customer_profiles(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customer_profiles(status);
CREATE INDEX IF NOT EXISTS idx_customers_test ON customer_profiles(is_test_account);
CREATE INDEX IF NOT EXISTS idx_tx_agent ON transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_tx_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_tx_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON registration_alerts(read);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON registration_alerts(created_at DESC);
