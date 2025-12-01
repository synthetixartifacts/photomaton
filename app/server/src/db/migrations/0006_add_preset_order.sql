-- Add orderIndex column to preset_prompts table
ALTER TABLE preset_prompts ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0;
