import { beforeAll, afterAll, afterEach } from 'vitest';
import { db } from '../db/index.js';
import { accounts, sessions, photos } from '../db/schema.js';

// Clean up database before all tests
beforeAll(async () => {
  // Initialize test database if needed
  console.log('Test setup: Database initialized');
});

// Clean up database after each test to ensure isolation
afterEach(async () => {
  try {
    // Clean up test data (preserve legacy account)
    await db.delete(sessions).execute();
    await db.delete(photos).execute();
    await db
      .delete(accounts)
      .where((accounts) => accounts.id !== '00000000-0000-0000-0000-000000000000')
      .execute();
  } catch (error) {
    console.error('Test cleanup failed:', error);
  }
});

// Clean up after all tests
afterAll(async () => {
  console.log('Test teardown: Cleanup complete');
});
