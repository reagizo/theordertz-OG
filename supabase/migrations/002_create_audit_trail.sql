-- Migration: Create audit_trail table for cross-device sync
-- Run this in Supabase SQL Editor

-- Audit trail table
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  details TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all access
CREATE POLICY "public_all_audit_trail" ON audit_trail FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_trail(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_trail(actor);
