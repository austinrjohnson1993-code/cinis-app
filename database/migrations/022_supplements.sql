-- Cinis migration 022: supplements table for tracking user's supplement regimen
-- Stores information about supplements, dosages, timing, and frequency

CREATE TABLE IF NOT EXISTS supplements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  dose text,
  form text,
  timing_groups text,
  frequency text,
  frequency_days integer,
  note text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see their own supplements
CREATE POLICY supplements_select ON supplements
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY supplements_insert ON supplements
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY supplements_update ON supplements
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY supplements_delete ON supplements
  FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supplements_user_active ON supplements(user_id, active);
CREATE INDEX IF NOT EXISTS idx_supplements_user_created ON supplements(user_id, created_at);
