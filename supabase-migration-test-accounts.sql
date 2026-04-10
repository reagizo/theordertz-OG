-- Migration: Create test accounts tables for Supabase
-- Run this in your Supabase SQL Editor

-- 1. Create test_accounts table
CREATE TABLE IF NOT EXISTS test_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  profile_picture TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create real_accounts table
CREATE TABLE IF NOT EXISTS real_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  profile_picture TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create registration_alerts table
CREATE TABLE IF NOT EXISTS registration_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('agent', 'customer')),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  tier TEXT,
  message TEXT NOT NULL,
  is_test_account BOOLEAN DEFAULT FALSE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE test_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_alerts ENABLE ROW LEVEL SECURITY;

-- 5. Create policies (allow all for now)
CREATE POLICY "Allow public read test_accounts" ON test_accounts FOR SELECT USING (true);
CREATE POLICY "Allow public insert test_accounts" ON test_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read real_accounts" ON real_accounts FOR SELECT USING (true);
CREATE POLICY "Allow public insert real_accounts" ON real_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read registration_alerts" ON registration_alerts FOR SELECT USING (true);
CREATE POLICY "Allow public insert registration_alerts" ON registration_alerts FOR INSERT WITH CHECK (true);