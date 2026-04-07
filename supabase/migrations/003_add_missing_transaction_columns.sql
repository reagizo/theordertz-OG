-- Migration: Add missing columns to transactions table
-- This adds all the fields that the application is trying to save

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
