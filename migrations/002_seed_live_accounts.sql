-- ═══════════════════════════════════════════════════════════════════════════════
-- The Order-Reagizo Service Company — Seed Live Accounts
-- PostgreSQL Migration: 002_seed_live_accounts.sql
--
-- This migration inserts the production admin accounts that must persist
-- across all deployments and updates.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert REAGAN ROBERT KAIJAGE admin account (ONLY ADMINISTRATOR)
INSERT INTO users (id, email, password_hash, full_name, role, is_test_account, is_active)
VALUES (
  'a1b2c3d4-0001-0000-0000-000000000001',
  'rkaijage@gmail.com',
  crypt('@Eva0191!', gen_salt('bf')),
  'REAGAN ROBERT KAIJAGE',
  'admin',
  FALSE,
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- Insert Owner - Test Account (TEST role - not administrator)
INSERT INTO users (id, email, password_hash, full_name, role, is_test_account, is_active)
VALUES (
  'a1b2c3d4-0001-0000-0000-000000000002',
  'admin@example.com',
  crypt('admin', gen_salt('bf')),
  'Owner - Administrator',
  'test',
  TRUE,
  TRUE
) ON CONFLICT (email) DO NOTHING;
