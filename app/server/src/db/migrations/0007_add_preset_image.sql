-- Migration: Add imagePath column to preset_prompts table
-- This allows storing preview images for each preset

ALTER TABLE preset_prompts ADD COLUMN image_path TEXT;