-- Migration 002: Create audit_trail table for cross-device sync
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  details TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all_audit_trail" ON audit_trail FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_trail(created_at DESC);
