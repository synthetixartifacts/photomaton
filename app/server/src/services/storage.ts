import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({ name: 'storage-service' });

export interface StorageOptions {
  baseDir?: string;
  maxFileSize?: number;
  allowedFormats?: string[];
}

export interface SaveResult {
  id: string;
  originalPath: string;
  thumbnailPath?: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export class StorageService {
  private readonly baseDir: string;
  private readonly maxFileSize: number;
  private readonly allowedFormats: Set<string>;

  constructor(options: StorageOptions = {}) {
    this.baseDir = options.baseDir || '/data/photos';
    this.maxFileSize = options.maxFileSize || 10 * 1024 * 1024; // 10MB default
    this.allowedFormats = new Set(
      options.allowedFormats || ['jpeg', 'jpg', 'png', 'webp']
    );
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.mkdir(path.join(this.baseDir, '.trash'), { recursive: true });
      logger.info({ baseDir: this.baseDir }, 'Storage service initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize storage');
      throw error;
    }
  }

  async saveOriginal(
    buffer: Buffer,
    photoId?: string
  ): Promise<SaveResult> {
    const id = photoId || crypto.randomUUID();
    const photoDir = path.join(this.baseDir, id);

    try {
      // Validate file size
      if (buffer.length > this.maxFileSize) {
        throw new Error(`File size exceeds maximum of ${this.maxFileSize} bytes`);
      }

      // Process with Sharp
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Validate format
      if (!this.allowedFormats.has(metadata.format || '')) {
        throw new Error(`Invalid image format: ${metadata.format}`);
      }

      // Create directory for this photo
      await fs.mkdir(photoDir, { recursive: true });

      // Save original with compression
      const originalPath = path.join(photoDir, 'original.jpg');
      await image
        .jpeg({ quality: 90, progressive: true })
        .toFile(originalPath);

      // Create thumbnail
      const thumbnailPath = path.join(photoDir, 'thumbnail.jpg');
      await sharp(buffer)
        .resize(300, 300, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Get file stats
      const stats = await fs.stat(originalPath);

      return {
        id,
        originalPath,
        thumbnailPath,
        metadata: {
          width: metadata.width || 0,
          height: metadata.height || 0,
          format: metadata.format || 'unknown',
          size: stats.size
        }
      };
    } catch (error) {
      // Clean up on error
      await this.cleanup(photoDir);
      logger.error({ error, photoId: id }, 'Failed to save original image');
      throw error;
    }
  }

  async saveTransformed(
    buffer: Buffer,
    photoId: string,
    preset: string
  ): Promise<string> {
    const photoDir = path.join(this.baseDir, photoId);
    const transformedPath = path.join(photoDir, `styled-${preset}.jpg`);

    try {
      await sharp(buffer)
        .jpeg({ quality: 85, progressive: true })
        .toFile(transformedPath);

      logger.info({ photoId, preset, path: transformedPath }, 'Saved transformed image');
      return transformedPath;
    } catch (error) {
      logger.error({ error, photoId, preset }, 'Failed to save transformed image');
      throw error;
    }
  }

  async getPhotoPath(photoId: string, variant: 'original' | 'thumbnail' | string): Promise<string> {
    let filename: string;

    if (variant === 'original') {
      filename = 'original.jpg';
    } else if (variant === 'thumbnail') {
      filename = 'thumbnail.jpg';
    } else {
      filename = `styled-${variant}.jpg`;
    }

    const filePath = path.join(this.baseDir, photoId, filename);

    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      throw new Error(`File not found: ${variant} for photo ${photoId}`);
    }
  }

  async deletePhoto(photoId: string): Promise<void> {
    const photoDir = path.join(this.baseDir, photoId);
    const trashDir = path.join(this.baseDir, '.trash', `${photoId}-${Date.now()}`);

    try {
      // Try to move to trash first
      await fs.rename(photoDir, trashDir);
      logger.info({ photoId, trashDir }, 'Photo moved to trash');
    } catch (renameError: any) {
      // If rename fails due to permissions, try to remove directly
      if (renameError.code === 'EACCES' || renameError.code === 'EPERM') {
        logger.warn({ photoId, error: renameError }, 'Cannot move to trash, attempting direct deletion');
        try {
          // Use rm -rf equivalent for directories
          await fs.rm(photoDir, { recursive: true, force: true });
          logger.info({ photoId }, 'Photo deleted directly');
        } catch (rmError) {
          logger.error({ error: rmError, photoId }, 'Failed to delete photo directory');
          throw rmError;
        }
      } else {
        logger.error({ error: renameError, photoId }, 'Failed to delete photo');
        throw renameError;
      }
    }
  }

  private async cleanup(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      logger.warn({ error, dirPath }, 'Failed to cleanup directory');
    }
  }

  async getStorageStats(): Promise<{
    totalPhotos: number;
    totalSize: number;
    trashedPhotos: number;
  }> {
    try {
      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      const photoDirs = entries.filter(e => e.isDirectory() && e.name !== '.trash');

      let totalSize = 0;
      for (const dir of photoDirs) {
        const dirPath = path.join(this.baseDir, dir.name);
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          const stats = await fs.stat(path.join(dirPath, file));
          totalSize += stats.size;
        }
      }

      const trashDir = path.join(this.baseDir, '.trash');
      let trashedPhotos = 0;
      try {
        const trashEntries = await fs.readdir(trashDir, { withFileTypes: true });
        trashedPhotos = trashEntries.filter(e => e.isDirectory()).length;
      } catch {
        // Trash dir might not exist
      }

      return {
        totalPhotos: photoDirs.length,
        totalSize,
        trashedPhotos
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get storage stats');
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();