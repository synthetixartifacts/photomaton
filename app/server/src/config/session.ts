import session from 'express-session';
import connectSqlite3 from 'connect-sqlite3';
import { config } from './index.js';

const SQLiteStore = connectSqlite3(session);

/**
 * Session configuration for express-session
 * Uses SQLite for persistent session storage
 */
export const sessionConfig: session.SessionOptions = {
  store: new SQLiteStore({
    db: 'sessions.db',
    dir: '/data', // Persistent storage
    table: 'sessions',
  }) as any, // Type cast needed due to version mismatch
  secret: config.SESSION_SECRET,
  name: config.SESSION_NAME,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: config.SESSION_MAX_AGE, // 24 hours
    httpOnly: true, // Prevent XSS attacks
    secure: config.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax' as const, // CSRF protection
    path: '/',
  },
  rolling: true, // Reset expiration on activity
};

/**
 * Session cleanup configuration
 * Clean expired sessions every hour
 */
export const sessionCleanupInterval = 3600000; // 1 hour in milliseconds
