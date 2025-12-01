import { describe, it, expect, beforeEach, vi } from 'vitest';
import { requireAuth, requireRole, optionalAuth, isAdmin } from '../auth.js';
import {
  createMockAccount,
  createMockAdminAccount,
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../__tests__/utils/testHelpers.js';
import { accountService } from '../../services/accountService.js';

describe('Auth Middleware', () => {
  describe('requireAuth', () => {
    it('should allow authenticated requests', () => {
      const account = createMockAccount();
      const req = createMockRequest(account);
      const res = createMockResponse();
      const next = createMockNext();

      requireAuth(req as any, res as any, next);

      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      requireAuth(req as any, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    });
  });

  describe('requireRole', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should allow access with correct role', async () => {
      const account = createMockAdminAccount();
      await accountService.create(account);

      const req = createMockRequest(account);
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('admin');
      await middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalledOnce();
      expect(req.account).toEqual(expect.objectContaining({ role: 'admin' }));
    });

    it('should deny access with wrong role', async () => {
      const account = createMockAccount({ role: 'user' });
      await accountService.create(account);

      const req = createMockRequest(account);
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('admin');
      await middleware(req as any, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: { required: ['admin'], current: 'user' },
        },
      });
    });

    it('should deny access when not authenticated', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('admin');
      await middleware(req as any, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should allow multiple roles', async () => {
      const userAccount = createMockAccount({ role: 'user' });
      await accountService.create(userAccount);

      const req = createMockRequest(userAccount);
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('user', 'admin');
      await middleware(req as any, res as any, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('should handle account not found in database', async () => {
      const account = createMockAccount();
      // Don't create account in database

      const req = createMockRequest(account);
      const res = createMockResponse();
      const next = createMockNext();

      const middleware = requireRole('user');
      await middleware(req as any, res as any, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        },
      });
    });
  });

  describe('optionalAuth', () => {
    it('should add account if authenticated', async () => {
      const account = createMockAccount();
      await accountService.create(account);

      const req = createMockRequest(account);
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req as any, res as any, next);

      expect(next).toHaveBeenCalledOnce();
      expect(req.account).toBeDefined();
    });

    it('should continue without account if not authenticated', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req as any, res as any, next);

      expect(next).toHaveBeenCalledOnce();
      expect(req.account).toBeUndefined();
    });

    it('should continue even if account lookup fails', async () => {
      const account = createMockAccount();
      // Don't create account in database

      const req = createMockRequest(account);
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuth(req as any, res as any, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin account', () => {
      const account = createMockAdminAccount();
      const req = createMockRequest(account);

      expect(isAdmin(req as any)).toBe(true);
    });

    it('should return false for user account', () => {
      const account = createMockAccount({ role: 'user' });
      const req = createMockRequest(account);

      expect(isAdmin(req as any)).toBe(false);
    });

    it('should return false for no account', () => {
      const req = createMockRequest();

      expect(isAdmin(req as any)).toBe(false);
    });
  });
});
