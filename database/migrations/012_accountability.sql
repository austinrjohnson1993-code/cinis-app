-- Accountability partner tables
-- Migration 012 — accountability pairs + messages

CREATE TABLE IF NOT EXISTS accountability_pairs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, partner_id)
);

CREATE TABLE IF NOT EXISTS accountability_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pair_id uuid REFERENCES accountability_pairs(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE accountability_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pairs" ON accountability_pairs
  FOR ALL USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users manage own messages" ON accountability_messages
  FOR ALL USING (auth.uid() = sender_id);
