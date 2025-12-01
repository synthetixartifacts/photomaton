#!/usr/bin/env node
/**
 * Import presets into production database
 * Usage: node scripts/import-presets.js [path-to-export.json]
 *
 * This script:
 * 1. Reads presets from export JSON file
 * 2. Imports them into the database
 * 3. Preserves existing presets (does not delete)
 * 4. Updates presets if they already exist (by presetId)
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Get import file path from args or use default
const importFilePath = process.argv[2] || path.join(projectRoot, 'presets-export.json');
const dbPath = path.join(projectRoot, 'data/photomaton.db');

console.log('📥 Importing presets into database...\n');
console.log(`Import file: ${importFilePath}`);
console.log(`Database: ${dbPath}\n`);

try {
  // Check if import file exists
  if (!fs.existsSync(importFilePath)) {
    console.error(`❌ Import file not found: ${importFilePath}`);
    console.log('\nUsage: node scripts/import-presets.js [path-to-export.json]');
    process.exit(1);
  }

  // Read import file
  const importData = JSON.parse(fs.readFileSync(importFilePath, 'utf8'));

  if (!importData.presets || !Array.isArray(importData.presets)) {
    console.error('❌ Invalid import file format');
    process.exit(1);
  }

  console.log(`Found ${importData.presetsCount} presets in export file`);
  console.log(`Exported at: ${importData.exportedAt}\n`);

  // Open database
  const db = new Database(dbPath);

  // Prepare statements
  const checkStmt = db.prepare('SELECT id FROM preset_prompts WHERE presetId = ?');
  const insertStmt = db.prepare(`
    INSERT INTO preset_prompts (id, presetId, name, description, enabled, icon, imagePath, prompt, orderIndex, createdAt, updatedAt)
    VALUES (@id, @presetId, @name, @description, @enabled, @icon, @imagePath, @prompt, @orderIndex, @createdAt, @updatedAt)
  `);
  const updateStmt = db.prepare(`
    UPDATE preset_prompts
    SET name = @name,
        description = @description,
        enabled = @enabled,
        icon = @icon,
        imagePath = @imagePath,
        prompt = @prompt,
        orderIndex = @orderIndex,
        updatedAt = @updatedAt
    WHERE presetId = @presetId
  `);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // Import each preset
  for (const preset of importData.presets) {
    try {
      const existing = checkStmt.get(preset.presetId);

      // Convert boolean to integer for SQLite
      const presetData = {
        ...preset,
        enabled: preset.enabled ? 1 : 0,
        updatedAt: new Date().toISOString()
      };

      if (existing) {
        // Update existing preset
        updateStmt.run(presetData);
        updated++;
        console.log(`  ✏️  Updated: ${preset.name} (${preset.presetId})`);
      } else {
        // Insert new preset
        insertStmt.run(presetData);
        inserted++;
        console.log(`  ✨ Inserted: ${preset.name} (${preset.presetId})`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to import ${preset.name}: ${error.message}`);
      skipped++;
    }
  }

  db.close();

  console.log(`\n✅ Import complete!`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${inserted + updated + skipped}`);

  if (skipped > 0) {
    console.log(`\n⚠️  ${skipped} presets were skipped due to errors`);
  }

  console.log(`\n📋 Next steps:`);
  console.log(`  1. Verify presets in admin panel`);
  console.log(`  2. Check that preset images are in /data/presets/`);
  console.log(`  3. Restart the app if needed: docker compose restart`);

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
