-- Migration v42: Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  emoji TEXT NOT NULL DEFAULT '🔔',
  title TEXT NOT NULL,
  subtitle TEXT,
  color TEXT DEFAULT '#6366f1',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User can read their own notifications
CREATE POLICY "notif_select" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Any authenticated user can insert a notification for anyone (needed for admin giving clothing)
CREATE POLICY "notif_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
-- User can update (mark as read) their own notifications
CREATE POLICY "notif_update" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- User can delete their own notifications
CREATE POLICY "notif_delete" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
