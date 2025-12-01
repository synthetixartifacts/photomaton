import { configManager } from '../config/index.js';
import { accountService } from './accountService.js';
import type { Account, UserPhotoLimitInfo } from '@photomaton/shared';

/**
 * User Limit Service
 * Handles photo limit calculations and enforcement per user
 *
 * IMPORTANT: Limits are based on cumulative photos taken (photosTaken counter),
 * NOT on current photo count. This prevents users from bypassing limits
 * by deleting photos.
 */
export class UserLimitService {
  /**
   * Determine user's photo limit based on role and email domain
   * @returns number limit or null for unlimited (admin)
   */
  getUserPhotoLimit(account: Account): number | null {
    // Admins have no limit
    if (account.role === 'admin') {
      return null;
    }

    const config = configManager.getConfig();
    const emailDomain = account.email.split('@')[1]?.toLowerCase();

    // Era employees get higher limit
    if (emailDomain === 'group-era.com') {
      return config.userLimits.eraEmployeePhotoLimit;
    }

    // Default limit for external users
    return config.userLimits.defaultUserPhotoLimit;
  }

  /**
   * Get user's current usage and limit info
   * Uses the cumulative photosTaken counter, not current photo count
   */
  async getUserLimitInfo(account: Account): Promise<UserPhotoLimitInfo> {
    // Get the latest photosTaken count from the database
    const photosTaken = await accountService.getPhotosTaken(account.id);
    const limit = this.getUserPhotoLimit(account);

    return {
      used: photosTaken,
      limit,
      remaining: limit === null ? null : Math.max(0, limit - photosTaken),
      isLimitReached: limit !== null && photosTaken >= limit,
    };
  }

  /**
   * Check if user can take more photos
   */
  async canTakePhoto(account: Account): Promise<boolean> {
    const limitInfo = await this.getUserLimitInfo(account);
    return !limitInfo.isLimitReached;
  }
}

// Export singleton instance
export const userLimitService = new UserLimitService();
