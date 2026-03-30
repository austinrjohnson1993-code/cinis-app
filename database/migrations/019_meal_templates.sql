-- Cinis migration 019: meal_templates table for storing user's favorite meal templates
-- Enables quick logging of frequently eaten meals with pre-set macros

CREATE TABLE IF NOT EXISTS meal_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  calories integer DEFAULT 0,
  protein_g numeric DEFAULT 0,
  carbs_g numeric DEFAULT 0,
  fat_g numeric DEFAULT 0,
  log_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see their own templates
CREATE POLICY meal_templates_select ON meal_templates
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY meal_templates_insert ON meal_templates
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY meal_templates_update ON meal_templates
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY meal_templates_delete ON meal_templates
  FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meal_templates_user_log_count ON meal_templates(user_id, log_count DESC);
CREATE INDEX IF NOT EXISTS idx_meal_templates_user_created ON meal_templates(user_id, created_at DESC);
