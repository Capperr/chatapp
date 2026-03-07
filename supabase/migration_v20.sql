-- Migration v20: Solarie tan system
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tan_level int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tan_expires_at timestamptz;
