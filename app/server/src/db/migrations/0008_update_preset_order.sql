-- Set initial order based on current row order
UPDATE preset_prompts SET order_index = (
  SELECT COUNT(*) FROM preset_prompts p2 WHERE p2.rowid <= preset_prompts.rowid
) - 1;
