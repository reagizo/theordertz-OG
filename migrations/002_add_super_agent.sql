-- Add super_agent role to existing user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_agent';

-- Create password_reset_requests table for tracking password reset requests
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  new_password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_requests(email);

-- Add RLS to password_reset_requests
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Only admins/super agents can view/manage password reset requests
CREATE POLICY password_reset_select_admin ON password_reset_requests
  FOR SELECT USING (
    (SELECT role FROM users WHERE id = current_setting('app.current_user_id', TRUE)::UUID) IN ('admin', 'super_agent')
  );

CREATE POLICY password_reset_insert_any ON password_reset_requests
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY password_reset_update_admin ON password_reset_requests
  FOR UPDATE USING (
    (SELECT role FROM users WHERE id = current_setting('app.current_user_id', TRUE)::UUID) IN ('admin', 'super_agent')
  );

CREATE POLICY password_reset_delete_admin ON password_reset_requests
  FOR DELETE USING (
    (SELECT role FROM users WHERE id = current_setting('app.current_user_id', TRUE)::UUID) IN ('admin', 'super_agent')
  );

-- Add super_agent to is_admin() function so super agents can manage users
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT current_user_role() IN ('admin', 'supervisor', 'super_agent');
$$ LANGUAGE sql STABLE SECURITY DEFINER;