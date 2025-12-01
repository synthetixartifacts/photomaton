import { runMigrations } from './index.js';

async function migrate() {
  try {
    await runMigrations();
    console.log('✅ Database migration completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  }
}

migrate();