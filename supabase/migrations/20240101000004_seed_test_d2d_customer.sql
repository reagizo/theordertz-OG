-- ═══════════════════════════════════════════════════════════════════════════════
-- The Order-Reagizo Service Company — Test D2D Customer Account
-- PostgreSQL Migration: 20240101000004_seed_test_d2d_customer.sql
--
-- This migration creates a test D2D customer account for testing purposes.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert test D2D customer user
INSERT INTO users (id, email, password_hash, full_name, role, is_test_account, is_active, phone)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'test-d2d-customer@example.com',
  crypt('TestD2D123!', gen_salt('bf')),
  'Test D2D Customer',
  'customer',
  TRUE,
  TRUE,
  '+255123456789'
) ON CONFLICT (email) DO NOTHING;

-- Insert corresponding customer record with D2D tier (status pending for admin approval)
INSERT INTO customers (id, tier, status, wallet_balance, credit_limit, credit_used)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'd2d',
  'pending',
  50000,
  100000,
  0
) ON CONFLICT (id) DO NOTHING;
