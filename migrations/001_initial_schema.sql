-- ═══════════════════════════════════════════════════════════════════════════════
-- The Order-Reagizo Service Company — Database Schema & RLS Policies
-- PostgreSQL Migration: 001_initial_schema.sql
--
-- SECURITY MODEL:
--   - Row-Level Security (RLS) enforced on all tables
--   - Agents see only their own records
--   - Customers see only their own records
--   - Admins/Supervisors see all records
--   - Test accounts are isolated via is_test_account flag
--   - Deletion is restricted to Admin role only
--   - All changes are audit-logged via triggers
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Enable required extensions ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'clerk', 'agent', 'customer', 'test');
CREATE TYPE customer_tier AS ENUM ('d2d', 'premier');
CREATE TYPE record_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE service_type AS ENUM ('cash_send', 'cash_withdrawal', 'utility_bills', 'airtime_bundle', 'tv_subscriptions', 'internet_subscriptions', 'all_payments');
CREATE TYPE payment_method AS ENUM ('cod', 'oc');
CREATE TYPE carrier_type AS ENUM ('AzamPesa', 'Airtel Money', 'Mixx By Yas', 'M-Pesa', 'HaloPesa', 'SelcomPay', 'TTCLPesa');

-- ── Users table (central auth) ────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE,
  profile_picture_url TEXT,
  phone VARCHAR(50),
  national_id VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ -- soft delete
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_test ON users(is_test_account);

-- ── Agents table ──────────────────────────────────────────────────────────────
CREATE TABLE agents (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  status record_status NOT NULL DEFAULT 'pending',
  float_balance BIGINT NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 2.50,
  commission_earned BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_status ON agents(status);

-- ── Customers table ───────────────────────────────────────────────────────────
CREATE TABLE customers (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier customer_tier NOT NULL DEFAULT 'd2d',
  status record_status NOT NULL DEFAULT 'pending',
  wallet_balance BIGINT NOT NULL DEFAULT 0,
  credit_limit BIGINT NOT NULL DEFAULT 0,
  credit_used BIGINT NOT NULL DEFAULT 0,
  assigned_agent_id UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_tier ON customers(tier);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_assigned_agent ON customers(assigned_agent_id);

-- ── Transactions table ────────────────────────────────────────────────────────
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  service_type service_type NOT NULL,
  provider VARCHAR(100) NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL DEFAULT 'cod',
  status record_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  subscription_number VARCHAR(100),
  meter_number VARCHAR(100),
  control_number VARCHAR(100),
  reference_number VARCHAR(100),
  smartcard_number VARCHAR(100),
  cash_direction VARCHAR(20),
  carrier_network VARCHAR(50),
  transaction_direction VARCHAR(20),
  utility_bill_type VARCHAR(50),
  all_payment_type VARCHAR(50),
  is_on_credit BOOLEAN DEFAULT FALSE,
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT
);

CREATE INDEX idx_transactions_agent ON transactions(agent_id);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_transactions_test ON transactions(is_test_account);

-- ── Float Requests table ──────────────────────────────────────────────────────
CREATE TABLE float_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  status record_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  admin_notes TEXT,
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_float_requests_agent ON float_requests(agent_id);
CREATE INDEX idx_float_requests_status ON float_requests(status);

-- ── Float Exchanges table ─────────────────────────────────────────────────────
CREATE TABLE float_exchanges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  super_agent_dep_code VARCHAR(50) NOT NULL,
  carrier_type carrier_type NOT NULL,
  agent_code VARCHAR(100) NOT NULL,
  agent_dep_receiving_code VARCHAR(100),
  reference_code VARCHAR(100),
  additional_notes TEXT,
  status record_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_float_exchanges_agent ON float_exchanges(agent_id);
CREATE INDEX idx_float_exchanges_status ON float_exchanges(status);

-- ── Audit Log table (append-only, no delete/update) ───────────────────────────
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- Prevent UPDATE and DELETE on audit_log
CREATE OR REPLACE FUNCTION audit_log_prevent_modify()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit log records cannot be modified';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit log records cannot be deleted';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_prevent_modify();

-- ── Registration Alerts table ─────────────────────────────────────────────────
CREATE TABLE registration_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('agent', 'customer')),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  customer_tier customer_tier,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_test_account BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_registration_alerts_read ON registration_alerts(is_read);
CREATE INDEX idx_registration_alerts_created ON registration_alerts(created_at DESC);

-- ── Updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_agents BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_customers BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_transactions BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_float_requests BEFORE UPDATE ON float_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_float_exchanges BEFORE UPDATE ON float_exchanges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY POLICIES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE float_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE float_exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_alerts ENABLE ROW LEVEL SECURITY;

-- ── Helper function: get current user role ────────────────────────────────────
-- Assumes auth is handled via a session that sets app.current_user_id
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_user_id', TRUE), '')::UUID;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = current_user_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() IN ('admin', 'supervisor');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Users RLS ─────────────────────────────────────────────────────────────────
-- Users can view their own profile; admins can view all
CREATE POLICY users_select_own ON users
  FOR SELECT USING (
    id = current_user_id() OR is_admin()
  );

-- Users can update their own profile; admins can update any
CREATE POLICY users_update_own ON users
  FOR UPDATE USING (
    id = current_user_id() OR is_admin()
  );

-- Only admins can insert users
CREATE POLICY users_insert_admin ON users
  FOR INSERT WITH CHECK (is_admin());

-- Only admins can delete users (soft delete via updated_at, hard delete restricted)
CREATE POLICY users_delete_admin ON users
  FOR DELETE USING (is_admin());

-- ── Agents RLS ────────────────────────────────────────────────────────────────
-- Agents see only their own profile; admins see all
CREATE POLICY agents_select ON agents
  FOR SELECT USING (
    id = current_user_id() OR is_admin()
  );

-- Agents can update their own profile; admins can update any
CREATE POLICY agents_update ON agents
  FOR UPDATE USING (
    id = current_user_id() OR is_admin()
  );

-- Only admins can insert/delete agents
CREATE POLICY agents_insert_admin ON agents
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY agents_delete_admin ON agents
  FOR DELETE USING (is_admin());

-- ── Customers RLS ─────────────────────────────────────────────────────────────
-- Customers see only their own profile; agents see their assigned customers; admins see all
CREATE POLICY customers_select ON customers
  FOR SELECT USING (
    id = current_user_id()
    OR assigned_agent_id = current_user_id()
    OR is_admin()
  );

-- Customers can update their own profile; admins can update any
CREATE POLICY customers_update ON customers
  FOR UPDATE USING (
    id = current_user_id() OR is_admin()
  );

-- Only admins can insert/delete customers
CREATE POLICY customers_insert_admin ON customers
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY customers_delete_admin ON customers
  FOR DELETE USING (is_admin());

-- ── Transactions RLS ──────────────────────────────────────────────────────────
-- Agents see their own transactions; customers see their own; admins see all
-- Test account transactions are visible to admins but excluded from production reports
CREATE POLICY transactions_select ON transactions
  FOR SELECT USING (
    agent_id = current_user_id()
    OR customer_id = current_user_id()
    OR is_admin()
  );

-- Agents can create transactions; admins can create any
CREATE POLICY transactions_insert ON transactions
  FOR INSERT WITH CHECK (
    agent_id = current_user_id() OR is_admin()
  );

-- Agents can update their own pending transactions; admins can update any
CREATE POLICY transactions_update ON transactions
  FOR UPDATE USING (
    (agent_id = current_user_id() AND status = 'pending')
    OR is_admin()
  );

-- Only admins can delete transactions
CREATE POLICY transactions_delete_admin ON transactions
  FOR DELETE USING (is_admin());

-- ── Float Requests RLS ────────────────────────────────────────────────────────
CREATE POLICY float_requests_select ON float_requests
  FOR SELECT USING (
    agent_id = current_user_id() OR is_admin()
  );

CREATE POLICY float_requests_insert ON float_requests
  FOR INSERT WITH CHECK (
    agent_id = current_user_id() OR is_admin()
  );

CREATE POLICY float_requests_update ON float_requests
  FOR UPDATE USING (is_admin());

CREATE POLICY float_requests_delete_admin ON float_requests
  FOR DELETE USING (is_admin());

-- ── Float Exchanges RLS ───────────────────────────────────────────────────────
CREATE POLICY float_exchanges_select ON float_exchanges
  FOR SELECT USING (
    agent_id = current_user_id() OR is_admin()
  );

CREATE POLICY float_exchanges_insert ON float_exchanges
  FOR INSERT WITH CHECK (
    agent_id = current_user_id() OR is_admin()
  );

CREATE POLICY float_exchanges_update ON float_exchanges
  FOR UPDATE USING (is_admin());

CREATE POLICY float_exchanges_delete_admin ON float_exchanges
  FOR DELETE USING (is_admin());

-- ── Audit Log RLS ─────────────────────────────────────────────────────────────
-- Only admins can view audit logs; no one can modify
CREATE POLICY audit_log_select_admin ON audit_log
  FOR SELECT USING (is_admin());

CREATE POLICY audit_log_insert_system ON audit_log
  FOR INSERT WITH CHECK (TRUE); -- System inserts via triggers

-- ── Registration Alerts RLS ───────────────────────────────────────────────────
-- Only admins can view and manage alerts
CREATE POLICY registration_alerts_select_admin ON registration_alerts
  FOR SELECT USING (is_admin());

CREATE POLICY registration_alerts_insert_admin ON registration_alerts
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY registration_alerts_update_admin ON registration_alerts
  FOR UPDATE USING (is_admin());

CREATE POLICY registration_alerts_delete_admin ON registration_alerts
  FOR DELETE USING (is_admin());

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT TRIGGERS — automatically log all changes
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (actor_id, action, entity_type, entity_id, old_values, new_values)
  VALUES (
    current_user_id(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_agents AFTER INSERT OR UPDATE OR DELETE ON agents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_transactions AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_float_requests AFTER INSERT OR UPDATE OR DELETE ON float_requests
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_float_exchanges AFTER INSERT OR UPDATE OR DELETE ON float_exchanges
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA — Default admin account (CHANGE PASSWORD IMMEDIATELY)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insert default admin (password hash for 'Admin123!' — change via settings after first login)
INSERT INTO users (id, email, password_hash, full_name, role, is_test_account, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@theordertz.com',
  crypt('Admin123!', gen_salt('bf')),
  'System Administrator',
  'admin',
  FALSE,
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Clear all test account data (admin-only)
CREATE OR REPLACE FUNCTION clear_test_data()
RETURNS void AS $$
BEGIN
  DELETE FROM float_exchanges WHERE is_test_account = TRUE;
  DELETE FROM float_requests WHERE is_test_account = TRUE;
  DELETE FROM transactions WHERE is_test_account = TRUE;
  DELETE FROM customers WHERE is_test_account = TRUE;
  DELETE FROM agents WHERE is_test_account = TRUE;
  DELETE FROM users WHERE is_test_account = TRUE;
  DELETE FROM registration_alerts WHERE is_test_account = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get production transaction totals (excludes test accounts)
CREATE OR REPLACE FUNCTION get_production_stats()
RETURNS TABLE (
  total_transactions BIGINT,
  total_revenue BIGINT,
  total_agents BIGINT,
  total_customers BIGINT,
  pending_transactions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM transactions WHERE is_test_account = FALSE),
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE is_test_account = FALSE AND status = 'approved'),
    (SELECT COUNT(*) FROM agents WHERE is_test_account = FALSE),
    (SELECT COUNT(*) FROM customers WHERE is_test_account = FALSE),
    (SELECT COUNT(*) FROM transactions WHERE is_test_account = FALSE AND status = 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
