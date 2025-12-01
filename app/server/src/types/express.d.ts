import type { Account } from '@photomaton/shared';

/**
 * Extend Express Request to include account and photo data
 */
declare global {
  namespace Express {
    interface Request {
      account?: Account;
      photo?: any; // Will be properly typed when we add photo types
    }
  }
}

export {};
