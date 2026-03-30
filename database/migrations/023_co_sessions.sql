-- Cinis migration 023: co_sessions and co_session_nudges for Focus Co-Session feature

CREATE TABLE IF NOT EXISTS co_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_code text NOT NULL UNIQUE,
  duration_minutes integer NOT NULL DEFAULT 25,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'active', 'complete', 'cancelled')),
  host_task text,
  guest_task text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS co_session_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES co_sessions(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_co_sessions_host ON co_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_co_sessions_guest ON co_sessions(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_co_sessions_code ON co_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_co_sessions_status ON co_sessions(status);
CREATE INDEX IF NOT EXISTS idx_co_session_nudges_session ON co_session_nudges(session_id);

-- RLS
ALTER TABLE co_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE co_session_nudges ENABLE ROW LEVEL SECURITY;

-- Users can access sessions they host or join
CREATE POLICY "users can access their co_sessions"
  ON co_sessions FOR ALL
  USING (
    auth.uid() = host_user_id OR
    auth.uid() = guest_user_id
  );

-- Users can access nudges in their sessions
CREATE POLICY "users can access nudges in their sessions"
  ON co_session_nudges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM co_sessions s
      WHERE s.id = session_id
      AND (s.host_user_id = auth.uid() OR s.guest_user_id = auth.uid())
    )
  );
