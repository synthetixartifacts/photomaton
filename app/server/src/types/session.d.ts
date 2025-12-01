import 'express-session';
import type { SessionData as SharedSessionData } from '@photomaton/shared';

/**
 * Extend express-session to include our session data
 */
declare module 'express-session' {
  interface SessionData extends SharedSessionData {
    authState?: string; // CSRF token for OAuth
    redirectAfterLogin?: string; // URL to redirect after successful login
  }
}

/**
 * Extend Express Request to include session with proper typing
 */
declare module 'express' {
  interface Request {
    session: SessionData;
  }
}
