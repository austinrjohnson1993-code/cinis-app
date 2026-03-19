-- Add push notification columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_subscription jsonb;

-- Index for filtering users with push enabled
CREATE INDEX IF NOT EXISTS idx_profiles_push_enabled ON profiles(push_notifications_enabled) WHERE push_notifications_enabled = true;
