-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID,
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
  id UUID,
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
