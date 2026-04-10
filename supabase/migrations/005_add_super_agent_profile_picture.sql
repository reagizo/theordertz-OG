-- Migration: Add profile picture and user link to super_agents
-- Run this in Supabase SQL Editor

-- Add profile_picture column
ALTER TABLE super_agents ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add user_id column to link super_agent to app_users
ALTER TABLE super_agents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES app_users(id);
