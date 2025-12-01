import { Request, Response, NextFunction } from 'express';
import { accountService } from '../services/accountService.js';
import { logger } from '../utils/logger.js';
import type { UserRole } from '@photomaton/shared';

/**
 * Require authentication - user must be logged in
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.session.accountId) {
      logger.warn({ path: req.path, method: req.method }, 'Unauthenticated access attempt');
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Load account from database and attach to request
    const account = await accountService.getById(req.session.accountId);

    if (!account) {
      logger.warn({ accountId: req.session.accountId }, 'Account not found for session');
      req.session.destroy(() => {}); // Clear invalid session
      res.status(401).json({
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        },
      });
      return;
    }

    // Store account in request for later use
    req.account = account;
    next();
  } catch (error) {
    logger.error({ error, path: req.path }, 'Authentication check failed');
    next(error);
  }
}

/**
 * Require specific role(s)
 * Usage: requireRole('admin') or requireRole('admin', 'user')
 */
export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.session.accountId) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      // Get account from database to verify current role
      const account = await accountService.getById(req.session.accountId);

      if (!account) {
        logger.warn({ accountId: req.session.accountId }, 'Account not found for session');
        req.session.destroy(() => {}); // Clear invalid session
        res.status(401).json({
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found',
          },
        });
        return;
      }

      // Check if user has required role
      if (!roles.includes(account.role)) {
        logger.warn(
          { accountId: account.id, role: account.role, requiredRoles: roles, path: req.path },
          'Insufficient permissions'
        );
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
            details: { required: roles, current: account.role },
          },
        });
        return;
      }

      // Store account in request for later use
      req.account = account;
      next();
    } catch (error) {
      logger.error({ error, path: req.path }, 'Role check failed');
      next(error);
    }
  };
}

/**
 * Optional authentication - user info added if logged in
 * Does not block unauthenticated requests
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.session.accountId) {
      const account = await accountService.getById(req.session.accountId);
      if (account) {
        req.account = account;
      }
    }
    next();
  } catch (error) {
    // Non-blocking - continue even if error
    logger.error({ error }, 'Optional auth failed');
    next();
  }
}

/**
 * Check if user is admin (for conditional features)
 */
export function isAdmin(req: Request): boolean {
  return req.account?.role === 'admin';
}
