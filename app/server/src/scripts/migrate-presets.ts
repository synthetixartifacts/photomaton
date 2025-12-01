#!/usr/bin/env node

/**
 * Preset Migration Script
 *
 * This script migrates the default presets from the config system to the database.
 * It can be run safely multiple times (uses INSERT OR IGNORE).
 *
 * Usage:
 *   npm run migrate-presets
 *   or
 *   npx tsx src/scripts/migrate-presets.ts
 */

import { db } from '../db/index.js';
import { presetService } from '../services/preset.js';
import { defaultConfig } from '@photomaton/shared';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🚀 Starting preset migration...');

  try {
    // First, run the SQL migration to ensure the default presets are in the database
    console.log('📊 Running SQL migration...');

    const migrationPath = path.join(__dirname, '../db/migrations/0003_migrate_default_presets.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by statements and execute each one
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await db.run(statement);
      }
    }

    console.log('✅ SQL migration completed');

    // Check what presets we have in the database
    console.log('\n📋 Checking current presets in database...');
    const existingPresets = await presetService.list();

    console.log(`Found ${existingPresets.length} presets in database:`);
    existingPresets.forEach(preset => {
      console.log(`  - ${preset.presetId}: ${preset.name} (${preset.enabled ? 'enabled' : 'disabled'})`);
    });

    // Optionally migrate any config-based presets that aren't in the database yet
    console.log('\n🔄 Checking for any missing default presets...');
    const configPresets = defaultConfig.presets.availablePresets;

    for (const configPreset of configPresets) {
      const exists = await presetService.exists(configPreset.id);

      if (!exists) {
        console.log(`  Adding missing preset: ${configPreset.id}`);

        try {
          await presetService.create({
            presetId: configPreset.id,
            name: configPreset.name,
            description: configPreset.description,
            enabled: configPreset.enabled,
            icon: configPreset.icon,
            prompt: (configPreset as any).advancedPrompt?.basePrompt || configPreset.prompt,
          });

          console.log(`  ✅ Created preset: ${configPreset.id}`);
        } catch (error) {
          console.error(`  ❌ Failed to create preset ${configPreset.id}:`, error);
        }
      } else {
        console.log(`  ✓ Preset ${configPreset.id} already exists`);
      }
    }

    // Final status
    console.log('\n📊 Final preset status:');
    const stats = await presetService.getStats();

    console.log(`  Total presets: ${stats.totalPresets}`);
    console.log(`  Enabled presets: ${stats.enabledPresets}`);
    console.log(`  Disabled presets: ${stats.disabledPresets}`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('  1. Test the application to ensure presets load correctly');
    console.log('  2. Use the admin panel to manage presets');
    console.log('  3. Consider removing old config-based preset code if no longer needed');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as migratePresets };