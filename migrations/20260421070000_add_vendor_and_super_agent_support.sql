-- Add vendor and super_agent to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'vendor';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_agent';

-- Update registration_alerts to include vendor and super_agent
ALTER TABLE registration_alerts 
  DROP CONSTRAINT IF EXISTS registration_alerts_alert_type_check;

ALTER TABLE registration_alerts 
  ADD CONSTRAINT registration_alerts_alert_type_check 
  CHECK (alert_type IN ('agent', 'customer', 'vendor', 'super_agent'));

-- Add is_test_account flag to registration_alerts if not exists
ALTER TABLE registration_alerts 
  ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT FALSE;

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  status record_status NOT NULL DEFAULT 'pending',
  float_balance BIGINT NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 2.50,
  commission_earned BIGINT NOT NULL DEFAULT 0,
  service_areas TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

-- Create super_agents table
CREATE TABLE IF NOT EXISTS super_agents (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  status record_status NOT NULL DEFAULT 'pending',
  float_balance BIGINT NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 3.00,
  commission_earned BIGINT NOT NULL DEFAULT 0,
  region VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_super_agents_status ON super_agents(status);

-- Add is_test_account to vendors and super_agents
ALTER TABLE vendors 
  ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE super_agents 
  ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN NOT NULL DEFAULT FALSE;

-- Create indexes for test accounts
CREATE INDEX IF NOT EXISTS idx_vendors_test ON vendors(is_test_account);
CREATE INDEX IF NOT EXISTS idx_super_agents_test ON super_agents(is_test_account);

-- Enable RLS on new tables
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_agents ENABLE ROW LEVEL SECURITY;

-- RLS policies for vendors
CREATE POLICY vendors_select ON vendors
  FOR SELECT USING (
    id = current_user_id() OR is_admin()
  );

CREATE POLICY vendors_update ON vendors
  FOR UPDATE USING (
    id = current_user_id() OR is_admin()
  );

CREATE POLICY vendors_insert_admin ON vendors
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY vendors_delete_admin ON vendors
  FOR DELETE USING (is_admin());

-- RLS policies for super_agents
CREATE POLICY super_agents_select ON super_agents
  FOR SELECT USING (
    id = current_user_id() OR is_admin()
  );

CREATE POLICY super_agents_update ON super_agents
  FOR UPDATE USING (
    id = current_user_id() OR is_admin()
  );

CREATE POLICY super_agents_insert_admin ON super_agents
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY super_agents_delete_admin ON super_agents
  FOR DELETE USING (is_admin());

-- Add audit triggers for new tables
CREATE TRIGGER audit_vendors AFTER INSERT OR UPDATE OR DELETE ON vendors
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_super_agents AFTER INSERT OR UPDATE OR DELETE ON super_agents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Add updated_at triggers for new tables
CREATE TRIGGER set_updated_at_vendors BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_super_agents BEFORE UPDATE ON super_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update clear_test_data function to include vendors and super_agents
CREATE OR REPLACE FUNCTION clear_test_data()
RETURNS void AS $$
BEGIN
  DELETE FROM float_exchanges WHERE is_test_account = TRUE;
  DELETE FROM float_requests WHERE is_test_account = TRUE;
  DELETE FROM transactions WHERE is_test_account = TRUE;
  DELETE FROM customers WHERE is_test_account = TRUE;
  DELETE FROM agents WHERE is_test_account = TRUE;
  DELETE FROM vendors WHERE is_test_account = TRUE;
  DELETE FROM super_agents WHERE is_test_account = TRUE;
  DELETE FROM users WHERE is_test_account = TRUE;
  DELETE FROM registration_alerts WHERE is_test_account = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_production_stats to include vendors and super_agents
CREATE OR REPLACE FUNCTION get_production_stats()
RETURNS TABLE (
  total_transactions BIGINT,
  total_revenue BIGINT,
  total_agents BIGINT,
  total_customers BIGINT,
  total_vendors BIGINT,
  total_super_agents BIGINT,
  pending_transactions BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM transactions WHERE is_test_account = FALSE),
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE is_test_account = FALSE AND status = 'approved'),
    (SELECT COUNT(*) FROM agents WHERE is_test_account = FALSE),
    (SELECT COUNT(*) FROM customers WHERE is_test_account = FALSE),
    (SELECT COUNT(*) FROM vendors WHERE is_test_account = FALSE),
    (SELECT COUNT(*) FROM super_agents WHERE is_test_account = FALSE),
    (SELECT COUNT(*) FROM transactions WHERE is_test_account = FALSE AND status = 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
