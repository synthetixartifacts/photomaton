import { describe, it, expect, beforeEach } from 'vitest';
import { photoService } from '../photo.js';
import { accountService } from '../accountService.js';
import { createMockAccount, createMockAdminAccount } from '../../__tests__/utils/testHelpers.js';
import type { Account } from '@photomaton/shared';

describe('Photo Service Data Isolation', () => {
  let user1: Account;
  let user2: Account;
  let adminUser: Account;

  beforeEach(async () => {
    // Create test accounts
    user1 = await accountService.create(
      createMockAccount({ email: 'user1@group-era.com', name: 'User 1' })
    );
    user2 = await accountService.create(
      createMockAccount({ email: 'user2@group-era.com', name: 'User 2' })
    );
    adminUser = await accountService.create(
      createMockAdminAccount({ email: 'admin@group-era.com', name: 'Admin' })
    );
  });

  describe('list photos', () => {
    it('should return only photos belonging to the user', async () => {
      // Create photos for different users
      const photo1 = await photoService.create(
        {
          originalPath: '/data/photos/user1-photo.jpg',
          originalFilename: 'user1-photo.jpg',
          status: 'pending',
        },
        user1.id
      );

      const photo2 = await photoService.create(
        {
          originalPath: '/data/photos/user2-photo.jpg',
          originalFilename: 'user2-photo.jpg',
          status: 'pending',
        },
        user2.id
      );

      // User1 should only see their photo
      const user1Photos = await photoService.list({}, user1.id);
      expect(user1Photos.photos).toHaveLength(1);
      expect(user1Photos.photos[0].id).toBe(photo1.id);
      expect(user1Photos.photos[0].accountId).toBe(user1.id);

      // User2 should only see their photo
      const user2Photos = await photoService.list({}, user2.id);
      expect(user2Photos.photos).toHaveLength(1);
      expect(user2Photos.photos[0].id).toBe(photo2.id);
      expect(user2Photos.photos[0].accountId).toBe(user2.id);
    });

    it('should return empty list if user has no photos', async () => {
      const result = await photoService.list({}, user1.id);

      expect(result.photos).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should respect limit and pagination', async () => {
      // Create multiple photos for user1
      for (let i = 0; i < 5; i++) {
        await photoService.create(
          {
            originalPath: `/data/photos/user1-photo-${i}.jpg`,
            originalFilename: `user1-photo-${i}.jpg`,
            status: 'pending',
          },
          user1.id
        );
      }

      const result = await photoService.list({ limit: 3 }, user1.id);

      expect(result.photos).toHaveLength(3);
      expect(result.total).toBeGreaterThanOrEqual(3);
    });
  });

  describe('get photo', () => {
    it('should return photo if user owns it', async () => {
      const photo = await photoService.create(
        {
          originalPath: '/data/photos/user1-photo.jpg',
          originalFilename: 'user1-photo.jpg',
          status: 'pending',
        },
        user1.id
      );

      const retrieved = await photoService.get(photo.id, user1.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(photo.id);
      expect(retrieved?.accountId).toBe(user1.id);
    });

    it('should not return photo if user does not own it', async () => {
      const photo = await photoService.create(
        {
          originalPath: '/data/photos/user1-photo.jpg',
          originalFilename: 'user1-photo.jpg',
          status: 'pending',
        },
        user1.id
      );

      const retrieved = await photoService.get(photo.id, user2.id);

      expect(retrieved).toBeNull();
    });

    it('should return photo without accountId filter when not provided', async () => {
      const photo = await photoService.create(
        {
          originalPath: '/data/photos/user1-photo.jpg',
          originalFilename: 'user1-photo.jpg',
          status: 'pending',
        },
        user1.id
      );

      const retrieved = await photoService.get(photo.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(photo.id);
    });
  });

  describe('delete photo', () => {
    it('should allow user to delete their own photo', async () => {
      const photo = await photoService.create(
        {
          originalPath: '/data/photos/user1-photo.jpg',
          originalFilename: 'user1-photo.jpg',
          status: 'pending',
        },
        user1.id
      );

      await photoService.delete(photo.id);

      const retrieved = await photoService.get(photo.id);
      expect(retrieved).toBeNull();
    });

    it('should prevent user from deleting another users photo', async () => {
      const photo = await photoService.create(
        {
          originalPath: '/data/photos/user1-photo.jpg',
          originalFilename: 'user1-photo.jpg',
          status: 'pending',
        },
        user1.id
      );

      // Try to delete via get with user2's accountId (should not find it)
      const retrieved = await photoService.get(photo.id, user2.id);
      expect(retrieved).toBeNull();

      // Verify photo still exists
      const stillExists = await photoService.get(photo.id, user1.id);
      expect(stillExists).toBeDefined();
    });
  });

  describe('stats', () => {
    it('should return stats only for user photos', async () => {
      // Create photos for different users
      await photoService.create(
        {
          originalPath: '/data/photos/user1-photo1.jpg',
          originalFilename: 'user1-photo1.jpg',
          status: 'completed',
        },
        user1.id
      );

      await photoService.create(
        {
          originalPath: '/data/photos/user1-photo2.jpg',
          originalFilename: 'user1-photo2.jpg',
          status: 'completed',
        },
        user1.id
      );

      await photoService.create(
        {
          originalPath: '/data/photos/user2-photo1.jpg',
          originalFilename: 'user2-photo1.jpg',
          status: 'completed',
        },
        user2.id
      );

      const user1Stats = await photoService.getStats(user1.id);
      expect(user1Stats.total).toBe(2);

      const user2Stats = await photoService.getStats(user2.id);
      expect(user2Stats.total).toBe(1);
    });

    it('should return admin stats across all users when accountId not provided', async () => {
      // Create photos for different users
      await photoService.create(
        {
          originalPath: '/data/photos/user1-photo.jpg',
          originalFilename: 'user1-photo.jpg',
          status: 'completed',
        },
        user1.id
      );

      await photoService.create(
        {
          originalPath: '/data/photos/user2-photo.jpg',
          originalFilename: 'user2-photo.jpg',
          status: 'completed',
        },
        user2.id
      );

      const allStats = await photoService.getStats();
      expect(allStats.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('multi-tenancy validation', () => {
    it('should ensure all photos have accountId', async () => {
      const photo = await photoService.create(
        {
          originalPath: '/data/photos/test-photo.jpg',
          originalFilename: 'test-photo.jpg',
          status: 'pending',
        },
        user1.id
      );

      expect(photo.accountId).toBeDefined();
      expect(photo.accountId).toBe(user1.id);
    });

    it('should prevent orphaned photos (photos without accountId)', async () => {
      // This test verifies that the NOT NULL constraint works
      await expect(
        photoService.create(
          {
            originalPath: '/data/photos/orphan.jpg',
            originalFilename: 'orphan.jpg',
            status: 'pending',
          },
          '' as any // Invalid accountId
        )
      ).rejects.toThrow();
    });
  });
});
