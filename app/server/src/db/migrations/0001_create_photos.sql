CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  created_at INTEGER DEFAULT CURRENT_TIMESTAMP NOT NULL,
  preset TEXT NOT NULL,
  original_path TEXT NOT NULL,
  transformed_path TEXT,
  provider TEXT,
  processing_time INTEGER,
  metadata TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
);