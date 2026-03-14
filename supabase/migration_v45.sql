-- Migration v45: Ensure notifications table has all required columns
-- Safe to run even if columns already exist

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6366f1';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS emoji TEXT NOT NULL DEFAULT '🔔';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
