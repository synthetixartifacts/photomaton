-- Migration: Add Google OAuth - Create new table with correct schema
CREATE TABLE IF NOT EXISTS accounts_new (
  id TEXT PRIMARY KEY,
  microsoft_id TEXT UNIQUE,
  google_id TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT,
  metadata TEXT,
  photos_taken INTEGER NOT NULL DEFAULT 0
);
