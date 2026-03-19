-- Add stripe_customer_id column to profiles table for reliable customer lookup
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);
