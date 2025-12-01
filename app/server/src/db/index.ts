import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || '/data/photomaton.db';
const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });

export async function runMigrations() {
  console.log('Running database migrations...');

  try {
    // Create migrations directory path
    const migrationsPath = path.join(__dirname, 'migrations');

    // Run migrations
    migrate(db, { migrationsFolder: migrationsPath });

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

export * from './schema.js';