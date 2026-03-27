-- Migration 017: waitlist table
-- Landing page email/phone signup for getcinis.app

CREATE TABLE IF NOT EXISTS waitlist (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  phone      text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE waitlist
  ADD CONSTRAINT waitlist_email_key UNIQUE (email);
