import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pino from 'pino';
import { requireRole } from '../../middleware/auth.js';
import { accountService } from '../../services/accountService.js';
import { validateBody, validateParams } from '../../middleware/validation.js';

const logger = pino({ name: 'api-admin-accounts' });
const router = Router();

// CRITICAL: All routes require admin role
router.use(requireRole('admin'));

/**
 * GET /admin/accounts
 * List all accounts (admin only)
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await accountService.listAccounts();

    // Remove sensitive fields before sending
    const safeAccounts = accounts.map((account) => ({
      id: account.id,
      email: account.email,
      name: account.name,
      role: account.role,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      lastLoginAt: account.lastLoginAt,
      // Exclude microsoftId and sensitive metadata
    }));

    logger.info({ count: safeAccounts.length }, 'Admin listed all accounts');
    res.json({ accounts: safeAccounts });
  } catch (error) {
    logger.error({ error }, 'Failed to list accounts');
    next(error);
  }
});

/**
 * GET /admin/accounts/:id
 * Get specific account details (admin only)
 */
const AccountIdSchema = z.object({
  id: z.string().uuid('Invalid account ID format'),
});

router.get(
  '/:id',
  validateParams(AccountIdSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const account = await accountService.getById(id);

      if (!account) {
        res.status(404).json({
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Account not found',
          },
        });
        return;
      }

      // Return safe account data
      res.json({
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        lastLoginAt: account.lastLoginAt,
        metadata: account.metadata,
      });
    } catch (error) {
      logger.error({ error, accountId: req.params.id }, 'Failed to get account');
      next(error);
    }
  }
);

/**
 * PATCH /admin/accounts/:id/role
 * Update account role (admin only)
 */
const UpdateRoleSchema = z.object({
  role: z.enum(['user', 'admin'], {
    errorMap: () => ({ message: 'Role must be either "user" or "admin"' }),
  }),
});

router.patch(
  '/:id/role',
  validateParams(AccountIdSchema),
  validateBody(UpdateRoleSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Prevent demoting yourself
      if (id === req.account!.id && role === 'user') {
        res.status(400).json({
          error: {
            code: 'CANNOT_DEMOTE_SELF',
            message: 'You cannot demote your own account from admin',
          },
        });
        return;
      }

      const account = await accountService.updateRole(id, role);

      logger.info(
        { accountId: id, newRole: role, updatedBy: req.account!.id },
        'Account role updated'
      );

      res.json({
        success: true,
        account: {
          id: account.id,
          email: account.email,
          name: account.name,
          role: account.role,
          updatedAt: account.updatedAt,
        },
      });
    } catch (error) {
      logger.error({ error, accountId: req.params.id }, 'Failed to update account role');
      next(error);
    }
  }
);

/**
 * GET /admin/accounts/stats
 * Get account statistics (admin only)
 */
router.get('/stats/overview', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await accountService.listAccounts();

    const stats = {
      total: accounts.length,
      byRole: {
        admin: accounts.filter((a) => a.role === 'admin').length,
        user: accounts.filter((a) => a.role === 'user').length,
      },
      recentLogins: accounts
        .filter((a) => a.lastLoginAt)
        .sort(
          (a, b) =>
            new Date(b.lastLoginAt!).getTime() - new Date(a.lastLoginAt!).getTime()
        )
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          email: a.email,
          name: a.name,
          lastLoginAt: a.lastLoginAt,
        })),
    };

    res.json(stats);
  } catch (error) {
    logger.error({ error }, 'Failed to get account stats');
    next(error);
  }
});

export { router as accountsRouter };
