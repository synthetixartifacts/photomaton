import { db } from '../db/index.js';
import { photos } from '../db/schema.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import pino from 'pino';
import type { PhotoStatus, PresetType } from '@photomaton/shared';

const logger = pino({ name: 'photo-service' });

export interface CreatePhotoInput {
  id?: string;  // Optional ID, will generate if not provided
  preset: PresetType;
  originalPath: string;
  thumbnailPath?: string;
  metadata?: any;
  accountId: string;  // Required for multi-tenancy
}

export interface UpdatePhotoInput {
  transformedPath?: string;
  provider?: string;
  processingTime?: number;
  status?: PhotoStatus;
}

export interface ListPhotosOptions {
  cursor?: string;
  limit?: number;
  status?: PhotoStatus;
  preset?: PresetType;
  accountId?: string;  // Filter by account ID for multi-tenancy
}

export class PhotoService {
  async create(input: CreatePhotoInput): Promise<string> {
    const photoId = input.id || crypto.randomUUID();

    try {
      await db.insert(photos).values({
        id: photoId,
        preset: input.preset,
        originalPath: input.originalPath,
        accountId: input.accountId,  // Store account ID for data isolation
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        status: 'pending'
      });

      logger.info({ photoId, preset: input.preset, accountId: input.accountId }, 'Photo created');
      return photoId;
    } catch (error) {
      logger.error({ error, input }, 'Failed to create photo');
      throw error;
    }
  }

  async get(photoId: string) {
    try {
      const result = await db
        .select()
        .from(photos)
        .where(eq(photos.id, photoId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const photo = result[0];
      return {
        ...photo,
        metadata: photo.metadata ? JSON.parse(photo.metadata as string) : null
      };
    } catch (error) {
      logger.error({ error, photoId }, 'Failed to get photo');
      throw error;
    }
  }

  async update(photoId: string, input: UpdatePhotoInput): Promise<boolean> {
    try {
      await db
        .update(photos)
        .set({
          ...input,
          ...(input.status && { status: input.status })
        })
        .where(eq(photos.id, photoId));

      logger.info({ photoId, input }, 'Photo updated');
      return true;
    } catch (error) {
      logger.error({ error, photoId, input }, 'Failed to update photo');
      throw error;
    }
  }

  async list(options: ListPhotosOptions = {}) {
    const { cursor, limit = 20, status, preset, accountId } = options;

    try {
      // Build where conditions
      const conditions = [];

      // CRITICAL: Account isolation - only show photos for specific account
      if (accountId) {
        conditions.push(eq(photos.accountId, accountId));
      }

      if (status) {
        conditions.push(eq(photos.status, status));
      }
      if (preset) {
        conditions.push(eq(photos.preset, preset));
      }
      if (cursor && cursor !== 'NaN') {
        // Cursor is the createdAt timestamp of the last item
        const cursorTimestamp = parseInt(cursor);
        if (!isNaN(cursorTimestamp)) {
          // Convert timestamp to SQLite datetime string format
          const cursorDate = new Date(cursorTimestamp);
          const dateStr = cursorDate.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
          conditions.push(sql`${photos.createdAt} < ${dateStr}`);
        }
      }

      const whereClause = conditions.length > 0
        ? and(...conditions)
        : undefined;

      // Get photos
      const result = await db
        .select()
        .from(photos)
        .where(whereClause)
        .orderBy(desc(photos.createdAt))
        .limit(limit + 1); // Get one extra to check if there are more

      const hasMore = result.length > limit;
      const photosList = result.slice(0, limit);

      // Parse metadata for each photo
      const parsedPhotos = photosList.map(photo => ({
        ...photo,
        metadata: photo.metadata ? JSON.parse(photo.metadata as string) : null
      }));

      // Get next cursor from the last item
      const nextCursor = parsedPhotos.length > 0 && hasMore
        ? new Date(parsedPhotos[parsedPhotos.length - 1].createdAt).getTime().toString()
        : null;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(photos)
        .where(whereClause);

      const total = countResult[0]?.count || 0;

      return {
        photos: parsedPhotos,
        cursor: hasMore ? nextCursor : null,
        hasMore,
        total
      };
    } catch (error) {
      logger.error({ error, options }, 'Failed to list photos');
      throw error;
    }
  }

  async delete(photoId: string): Promise<boolean> {
    try {
      await db
        .delete(photos)
        .where(eq(photos.id, photoId));

      logger.info({ photoId }, 'Photo deleted from database');
      return true;
    } catch (error) {
      logger.error({ error, photoId }, 'Failed to delete photo');
      throw error;
    }
  }

  /**
   * Delete all photos for a specific account (or all if no accountId provided)
   */
  async deleteAll(accountId?: string): Promise<number> {
    try {
      const whereClause = accountId ? eq(photos.accountId, accountId) : undefined;

      const result = await db
        .delete(photos)
        .where(whereClause)
        .returning({ id: photos.id });

      const count = result.length;
      logger.info({ accountId, count }, 'Photos deleted from database');
      return count;
    } catch (error) {
      logger.error({ error, accountId }, 'Failed to delete all photos');
      throw error;
    }
  }

  async getStats(accountId?: string) {
    try {
      const whereClause = accountId ? eq(photos.accountId, accountId) : undefined;

      const stats = await db
        .select({
          status: photos.status,
          count: sql<number>`COUNT(*)`
        })
        .from(photos)
        .where(whereClause)
        .groupBy(photos.status);

      const presetStats = await db
        .select({
          preset: photos.preset,
          count: sql<number>`COUNT(*)`
        })
        .from(photos)
        .where(whereClause)
        .groupBy(photos.preset);

      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(photos)
        .where(whereClause);

      return {
        total: totalCount[0]?.count || 0,
        byStatus: stats.reduce((acc, stat) => ({
          ...acc,
          [stat.status]: stat.count
        }), {}),
        byPreset: presetStats.reduce((acc, stat) => ({
          ...acc,
          [stat.preset]: stat.count
        }), {})
      };
    } catch (error) {
      logger.error({ error, accountId }, 'Failed to get stats');
      throw error;
    }
  }
}

// Export singleton instance
export const photoService = new PhotoService();