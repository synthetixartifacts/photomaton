import Database from 'better-sqlite3';
import * as schema from './schema.js';
export declare const db: import("drizzle-orm/better-sqlite3").BetterSQLite3Database<typeof schema> & {
    $client: Database.Database;
};
export declare function runMigrations(): Promise<void>;
export * from './schema.js';
//# sourceMappingURL=index.d.ts.map