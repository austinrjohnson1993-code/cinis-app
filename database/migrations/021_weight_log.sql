-- Cinis migration 021: weight_log table for tracking weight over time
-- Enables tracking weight trends and measurements in both lbs and kg

CREATE TABLE IF NOT EXISTS weight_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weight_lbs numeric NOT NULL,
  unit_entered text DEFAULT 'lbs',
  logged_date date NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE weight_log ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see their own weight log
CREATE POLICY weight_log_select ON weight_log
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY weight_log_insert ON weight_log
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY weight_log_update ON weight_log
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY weight_log_delete ON weight_log
  FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weight_log_user_date ON weight_log(user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_log_user_created ON weight_log(user_id, created_at DESC);
