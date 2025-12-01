import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { photoService } from '../services/photo.js';
import type { Account } from '@photomaton/shared';

// Note: Account filtering is handled at the service level
// This file contains ownership verification helpers

/**
 * Verify resource ownership
 * Ensures user can only access their own resources
 *
 * @param resourceAccountId - The account ID that owns the resource
 * @param req - Express request with account information
 * @param allowAdminBypass - If true, admins can access all resources
 * @returns true if access is allowed
 */
export async function verifyOwnership(
  resourceAccountId: string,
  req: Request,
  allowAdminBypass: boolean = true
): Promise<boolean> {
  if (!req.account) {
    logger.warn({ resourceAccountId }, 'Ownership check failed: no account in request');
    return false;
  }

  // Admin bypass (optional)
  if (allowAdminBypass && req.account.role === 'admin') {
    logger.debug(
      { accountId: req.account.id, resourceAccountId },
      'Admin bypass: access granted'
    );
    return true;
  }

  // Check if resource belongs to user
  const isOwner = resourceAccountId === req.account.id;

  if (!isOwner) {
    logger.warn(
      { accountId: req.account.id, resourceAccountId },
      'Ownership verification failed'
    );
  }

  return isOwner;
}

/**
 * Middleware to verify photo ownership
 * Loads photo and verifies the user has access to it
 */
export async function requirePhotoOwnership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const photoId = req.params.id;
    if (!photoId) {
      res.status(400).json({
        error: {
          code: 'MISSING_PHOTO_ID',
          message: 'Photo ID required',
        },
      });
      return;
    }

    if (!req.account) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    // Get photo from database
    const photo = await photoService.get(photoId);

    if (!photo) {
      res.status(404).json({
        error: {
          code: 'PHOTO_NOT_FOUND',
          message: 'Photo not found',
        },
      });
      return;
    }

    // Verify ownership (allow admin bypass)
    if (!(await verifyOwnership(photo.accountId!, req, true))) {
      logger.warn(
        {
          accountId: req.account.id,
          photoId,
          photoAccountId: photo.accountId,
          role: req.account.role,
        },
        'Photo ownership verification failed'
      );
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this photo',
        },
      });
      return;
    }

    // Store photo in request for later use
    (req as any).photo = photo;
    next();
  } catch (error) {
    logger.error({ error, photoId: req.params.id }, 'Photo ownership check failed');
    next(error);
  }
}

/**
 * Get account ID for queries based on role
 * Regular users get their own account ID
 * Admins can optionally see all data (returns undefined)
 *
 * @param account - The account making the request
 * @param allowAdminViewAll - If true, admins can see all data
 * @returns Account ID or undefined for admin view-all
 */
export function getAccountIdForQuery(
  account: Account,
  allowAdminViewAll: boolean = false
): string | undefined {
  if (allowAdminViewAll && account.role === 'admin') {
    return undefined; // Admin sees all
  }
  return account.id; // Regular user sees only their data
}
