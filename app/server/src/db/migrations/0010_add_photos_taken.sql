-- Migration: Add photos_taken counter to accounts table
ALTER TABLE accounts ADD COLUMN photos_taken INTEGER NOT NULL DEFAULT 0;
