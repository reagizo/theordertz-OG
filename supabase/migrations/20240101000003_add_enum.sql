-- Step 1: Add super_agent to user_role enum (run this first)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_agent';