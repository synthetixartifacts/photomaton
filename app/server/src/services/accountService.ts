import { db } from '../db/index.js';
import { accounts } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import type { Account, UserRole, AccountMetadata } from '@photomaton/shared';

/**
 * Account Service
 * Manages user account CRUD operations
 */
export class AccountService {
  /**
   * Get account by ID
   */
  async getById(id: string): Promise<Account | null> {
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
      return account ? (account as Account) : null;
    } catch (error) {
      logger.error({ error, id }, 'Failed to get account by ID');
      throw error;
    }
  }

  /**
   * Get account by Microsoft ID
   */
  async getByMicrosoftId(microsoftId: string): Promise<Account | null> {
    try {
      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.microsoftId, microsoftId));
      return account ? (account as Account) : null;
    } catch (error) {
      logger.error({ error, microsoftId }, 'Failed to get account by Microsoft ID');
      throw error;
    }
  }

  /**
   * Get account by Google ID
   */
  async getByGoogleId(googleId: string): Promise<Account | null> {
    try {
      const [account] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.googleId, googleId));
      return account ? (account as Account) : null;
    } catch (error) {
      logger.error({ error, googleId }, 'Failed to get account by Google ID');
      throw error;
    }
  }

  /**
   * Get account by email
   */
  async getByEmail(email: string): Promise<Account | null> {
    try {
      const [account] = await db.select().from(accounts).where(eq(accounts.email, email));
      return account ? (account as Account) : null;
    } catch (error) {
      logger.error({ error, email }, 'Failed to get account by email');
      throw error;
    }
  }

  /**
   * Create new account (with Microsoft OAuth)
   */
  async create(data: {
    microsoftId: string;
    email: string;
    name?: string;
    role?: UserRole;
    metadata?: AccountMetadata;
  }): Promise<Account> {
    try {
      const [account] = await db
        .insert(accounts)
        .values({
          microsoftId: data.microsoftId,
          email: data.email,
          name: data.name || undefined,
          role: data.role || 'user',
          metadata: data.metadata as any,
        })
        .returning();

      logger.info({ accountId: account.id, email: account.email }, 'Account created with Microsoft');
      return account as Account;
    } catch (error) {
      logger.error({ error, email: data.email }, 'Failed to create account');
      throw error;
    }
  }

  /**
   * Create new account with Google OAuth
   */
  async createWithGoogle(data: {
    googleId: string;
    email: string;
    name?: string;
    role?: UserRole;
    metadata?: AccountMetadata;
  }): Promise<Account> {
    try {
      const [account] = await db
        .insert(accounts)
        .values({
          googleId: data.googleId,
          email: data.email,
          name: data.name || undefined,
          role: data.role || 'user',
          metadata: data.metadata as any,
        })
        .returning();

      logger.info({ accountId: account.id, email: account.email }, 'Account created with Google');
      return account as Account;
    } catch (error) {
      logger.error({ error, email: data.email }, 'Failed to create Google account');
      throw error;
    }
  }

  /**
   * Link Google account to existing account
   */
  async linkGoogleAccount(
    id: string,
    googleId: string,
    additionalData?: { googleProfile?: { picture?: string; locale?: string } }
  ): Promise<Account> {
    try {
      const existing = await this.getById(id);
      if (!existing) {
        throw new Error('Account not found');
      }

      const [account] = await db
        .update(accounts)
        .set({
          googleId,
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            ...existing.metadata,
            googleProfile: additionalData?.googleProfile,
            lastAuthProvider: 'google',
          } as any,
        })
        .where(eq(accounts.id, id))
        .returning();

      logger.info({ accountId: id, googleId }, 'Google account linked to existing account');
      return account as Account;
    } catch (error) {
      logger.error({ error, id, googleId }, 'Failed to link Google account');
      throw error;
    }
  }

  /**
   * Update account last login and optional profile data
   */
  async updateLastLogin(
    id: string,
    profileData?: { name?: string; metadata?: AccountMetadata }
  ): Promise<Account> {
    try {
      const [account] = await db
        .update(accounts)
        .set({
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(profileData?.name && { name: profileData.name }),
          ...(profileData?.metadata && { metadata: profileData.metadata as any }),
        })
        .where(eq(accounts.id, id))
        .returning();

      return account as Account;
    } catch (error) {
      logger.error({ error, id }, 'Failed to update last login');
      throw error;
    }
  }

  /**
   * Update account role (admin operation)
   */
  async updateRole(id: string, role: UserRole): Promise<Account> {
    try {
      const [account] = await db
        .update(accounts)
        .set({
          role,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(accounts.id, id))
        .returning();

      logger.info({ accountId: id, role }, 'Account role updated');
      return account as Account;
    } catch (error) {
      logger.error({ error, id, role }, 'Failed to update account role');
      throw error;
    }
  }

  /**
   * Update account metadata
   */
  async updateMetadata(id: string, metadata: AccountMetadata): Promise<Account> {
    try {
      const [account] = await db
        .update(accounts)
        .set({
          metadata: metadata as any,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(accounts.id, id))
        .returning();

      return account as Account;
    } catch (error) {
      logger.error({ error, id }, 'Failed to update account metadata');
      throw error;
    }
  }

  /**
   * List all accounts (admin operation)
   */
  async listAccounts(): Promise<Account[]> {
    try {
      const results = await db.select().from(accounts);
      return results as Account[];
    } catch (error) {
      logger.error({ error }, 'Failed to list accounts');
      throw error;
    }
  }

  /**
   * Delete account (admin operation)
   * WARNING: This will cascade delete all related data (photos, etc.)
   */
  async delete(id: string): Promise<void> {
    try {
      await db.delete(accounts).where(eq(accounts.id, id));
      logger.info({ accountId: id }, 'Account deleted');
    } catch (error) {
      logger.error({ error, id }, 'Failed to delete account');
      throw error;
    }
  }

  /**
   * Increment the photos_taken counter for an account
   * This is called when a new photo is captured (not when transformed or viewed)
   * The counter never decreases, even if photos are deleted
   */
  async incrementPhotosTaken(id: string): Promise<number> {
    try {
      const [result] = await db
        .update(accounts)
        .set({
          photosTaken: sql`${accounts.photosTaken} + 1`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(accounts.id, id))
        .returning({ photosTaken: accounts.photosTaken });

      logger.debug({ accountId: id, photosTaken: result.photosTaken }, 'Photos taken counter incremented');
      return result.photosTaken;
    } catch (error) {
      logger.error({ error, id }, 'Failed to increment photos taken counter');
      throw error;
    }
  }

  /**
   * Get the current photos_taken count for an account
   */
  async getPhotosTaken(id: string): Promise<number> {
    try {
      const [result] = await db
        .select({ photosTaken: accounts.photosTaken })
        .from(accounts)
        .where(eq(accounts.id, id));
      return result?.photosTaken ?? 0;
    } catch (error) {
      logger.error({ error, id }, 'Failed to get photos taken count');
      throw error;
    }
  }
}

export const accountService = new AccountService();
