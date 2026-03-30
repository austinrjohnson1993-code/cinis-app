-- Cinis migration 020: extend meal_log table with template tracking and AI parsing fields
-- Adds support for meal templates and stores AI-parsed nutrition data

ALTER TABLE IF EXISTS meal_log
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES meal_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS items jsonb,
ADD COLUMN IF NOT EXISTS confidence text;

-- Create index for template lookups
CREATE INDEX IF NOT EXISTS idx_meal_log_template_id ON meal_log(template_id);
CREATE INDEX IF NOT EXISTS idx_meal_log_user_logged_date ON meal_log(user_id, logged_at);
