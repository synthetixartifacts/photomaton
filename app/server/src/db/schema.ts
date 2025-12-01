import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Accounts table - stores user accounts with OAuth2 authentication (Microsoft and Google)
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  microsoftId: text('microsoft_id').unique(), // Optional - for Microsoft OAuth
  googleId: text('google_id').unique(), // Optional - for Google OAuth
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').notNull().default('user'), // 'user' | 'admin'
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  lastLoginAt: text('last_login_at'),
  metadata: text('metadata', { mode: 'json' }),
  photosTaken: integer('photos_taken').notNull().default(0), // Cumulative counter, never decreases
});

// Sessions table - stores express-session data
export const sessions = sqliteTable('sessions', {
  sid: text('sid').primaryKey(),
  sess: text('sess').notNull(),
  expired: integer('expired').notNull(),
});

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  preset: text('preset').notNull(),
  originalPath: text('original_path').notNull(),
  transformedPath: text('transformed_path'),
  provider: text('provider'),
  processingTime: integer('processing_time'), // in milliseconds
  metadata: text('metadata', { mode: 'json' }),
  status: text('status').notNull().default('pending'), // pending, processing, completed, failed
  accountId: text('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' })
    .default('00000000-0000-0000-0000-000000000000'), // Legacy account for backward compatibility
});

export const presetPrompts = sqliteTable('preset_prompts', {
  id: text('id').primaryKey(),
  presetId: text('preset_id').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  icon: text('icon'),
  imagePath: text('image_path'),
  prompt: text('prompt').notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  accountId: text('account_id')
    .references(() => accounts.id, { onDelete: 'cascade' }),
  // NULL account_id = global preset, non-NULL = user-specific preset
});

// Type exports
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type PresetPrompt = typeof presetPrompts.$inferSelect;
export type NewPresetPrompt = typeof presetPrompts.$inferInsert;