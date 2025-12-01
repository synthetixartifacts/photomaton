import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const photos = sqliteTable('photos', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql `CURRENT_TIMESTAMP`),
    preset: text('preset').notNull(),
    originalPath: text('original_path').notNull(),
    transformedPath: text('transformed_path'),
    provider: text('provider'),
    processingTime: integer('processing_time'), // in milliseconds
    metadata: text('metadata', { mode: 'json' }),
    status: text('status').notNull().default('pending'), // pending, processing, completed, failed
});
//# sourceMappingURL=schema.js.map