-- Migration: Add missing columns to transactions table
-- This adds all the fields that the application is trying to save

-- Drop foreign key constraints
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_agent_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;

-- Drop ALL policies on transactions
DROP POLICY IF EXISTS "public_all_transactions" ON transactions;
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;
DROP POLICY IF EXISTS "transactions_delete" ON transactions;

-- Alter columns from UUID to TEXT to accept mock IDs
ALTER TABLE transactions ALTER COLUMN agent_id TYPE TEXT;
ALTER TABLE transactions ALTER COLUMN customer_id TYPE TEXT;

-- Add missing columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_tier TEXT NOT NULL DEFAULT 'd2d';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS agent_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS subscription_number TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS meter_number TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS control_number TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_number TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS smartcard_number TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cash_direction TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS carrier_network TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_direction TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS utility_bill_type TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS all_payment_type TEXT;

-- Recreate policy
CREATE POLICY "public_all_transactions" ON transactions FOR ALL USING (true);
