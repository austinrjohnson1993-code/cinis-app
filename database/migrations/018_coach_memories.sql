-- Cinis migration 018: coach_memories table for storing coach insights and patterns
-- Enables coach to remember key patterns, notes, and observations about the user

CREATE TABLE IF NOT EXISTS coach_memories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  category text DEFAULT 'pattern',
  source text DEFAULT 'user_note',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE coach_memories ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see their own memories
CREATE POLICY coach_memories_select ON coach_memories
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY coach_memories_insert ON coach_memories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY coach_memories_update ON coach_memories
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY coach_memories_delete ON coach_memories
  FOR DELETE
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coach_memories_user_created ON coach_memories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_memories_user_category ON coach_memories(user_id, category);
