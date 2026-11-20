-- 003-soft-delete-notes.sql
-- Adds soft-delete support: deleted_at column + partial index.
-- Run with: psql "$DATABASE_URL" -f migrations/003-soft-delete-notes.sql

ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS notes_active_idx ON notes(id) WHERE deleted_at IS NULL;
