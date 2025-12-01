#!/usr/bin/env python3
"""
Import presets into production database
Usage: python3 scripts/import-presets.py [path-to-export.json]

This script:
1. Reads presets from export JSON file
2. Imports them into the database
3. Preserves existing presets (does not delete)
4. Updates presets if they already exist (by presetId)
"""

import sqlite3
import json
from datetime import datetime
import os
import sys

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Get import file path from args or use default
import_file_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(project_root, 'presets-export.json')
db_path = os.path.join(project_root, 'data/photomaton.db')

print('📥 Importing presets into database...\n')
print(f'Import file: {import_file_path}')
print(f'Database: {db_path}\n')

try:
    # Check if import file exists
    if not os.path.exists(import_file_path):
        print(f'❌ Import file not found: {import_file_path}')
        print('\nUsage: python3 scripts/import-presets.py [path-to-export.json]')
        exit(1)

    # Read import file
    with open(import_file_path, 'r') as f:
        import_data = json.load(f)

    if 'presets' not in import_data or not isinstance(import_data['presets'], list):
        print('❌ Invalid import file format')
        exit(1)

    print(f"Found {import_data['presetsCount']} presets in export file")
    print(f"Exported at: {import_data['exportedAt']}\n")

    # Open database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    inserted = 0
    updated = 0
    skipped = 0

    # Import each preset
    for preset in import_data['presets']:
        try:
            # Check if preset exists
            cursor.execute('SELECT id FROM preset_prompts WHERE preset_id = ?', (preset['preset_id'],))
            existing = cursor.fetchone()

            # Convert boolean to integer for SQLite
            enabled = 1 if preset['enabled'] else 0
            updated_at = datetime.utcnow().isoformat() + 'Z'

            if existing:
                # Update existing preset
                cursor.execute('''
                    UPDATE preset_prompts
                    SET name = ?,
                        description = ?,
                        enabled = ?,
                        icon = ?,
                        image_path = ?,
                        prompt = ?,
                        order_index = ?,
                        updated_at = ?
                    WHERE preset_id = ?
                ''', (
                    preset['name'],
                    preset.get('description'),
                    enabled,
                    preset.get('icon'),
                    preset.get('image_path'),
                    preset['prompt'],
                    preset['order_index'],
                    updated_at,
                    preset['preset_id']
                ))
                updated += 1
                print(f"  ✏️  Updated: {preset['name']} ({preset['preset_id']})")
            else:
                # Insert new preset
                cursor.execute('''
                    INSERT INTO preset_prompts
                    (id, preset_id, name, description, enabled, icon, image_path, prompt, order_index, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    preset['id'],
                    preset['preset_id'],
                    preset['name'],
                    preset.get('description'),
                    enabled,
                    preset.get('icon'),
                    preset.get('image_path'),
                    preset['prompt'],
                    preset['order_index'],
                    preset['created_at'],
                    updated_at
                ))
                inserted += 1
                print(f"  ✨ Inserted: {preset['name']} ({preset['preset_id']})")

        except Exception as e:
            print(f"  ❌ Failed to import {preset['name']}: {e}")
            skipped += 1

    # Commit changes
    conn.commit()
    conn.close()

    print(f'\n✅ Import complete!')
    print(f'  Inserted: {inserted}')
    print(f'  Updated: {updated}')
    print(f'  Skipped: {skipped}')
    print(f'  Total: {inserted + updated + skipped}')

    if skipped > 0:
        print(f'\n⚠️  {skipped} presets were skipped due to errors')

    print('\n📋 Next steps:')
    print('  1. Verify presets in admin panel')
    print('  2. Check that preset images are in /data/presets/')
    print('  3. Restart the app if needed: docker compose restart')

except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
    exit(1)
