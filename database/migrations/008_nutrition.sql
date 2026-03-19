-- 008_nutrition.sql
-- Nutrition/diet tracking for AI coaching context

CREATE TABLE IF NOT EXISTS nutrition_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL, -- 'meal', 'supplement', 'protein', 'hydration'
  name text NOT NULL,
  notes text,
  logged_at timestamptz DEFAULT now()
);

ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own nutrition" ON nutrition_entries
  FOR ALL USING (auth.uid() = user_id);

-- Persistent staples list stored on profiles for low-latency AI injection
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nutrition_staples text[] DEFAULT ARRAY[]::text[];
