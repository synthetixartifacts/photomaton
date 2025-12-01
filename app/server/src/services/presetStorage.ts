import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';
import pino from 'pino';

const logger = pino({ name: 'preset-storage' });

export class PresetStorageService {
  private presetsDir: string;

  constructor() {
    // Use absolute path to match Docker volume mount
    this.presetsDir = '/data/presets';
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.presetsDir, { recursive: true });
      logger.info({ presetsDir: this.presetsDir }, 'Preset storage directory initialized');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize preset storage directory');
      throw error;
    }
  }

  /**
   * Save preset image and generate thumbnail
   */
  async savePresetImage(
    presetId: string,
    imageBuffer: Buffer
  ): Promise<{ imagePath: string; thumbnailPath: string }> {
    try {
      const timestamp = Date.now();
      const hash = crypto.createHash('md5').update(imageBuffer).digest('hex').substring(0, 8);
      const baseName = `${presetId}-${timestamp}-${hash}`;
      const fullPath = path.join(this.presetsDir, `${baseName}-full.webp`);
      const thumbPath = path.join(this.presetsDir, `${baseName}-thumb.webp`);

      // Convert and save full-size image (800x800 max)
      await sharp(imageBuffer)
        .resize(800, 800, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toFile(fullPath);

      // Generate and save thumbnail (200x200)
      await sharp(imageBuffer)
        .resize(200, 200, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 80 })
        .toFile(thumbPath);

      // Return relative paths for URL generation
      return {
        imagePath: `/preset-images/${path.basename(fullPath)}`,
        thumbnailPath: `/preset-images/${path.basename(thumbPath)}`
      };
    } catch (error) {
      logger.error({ error, presetId }, 'Failed to save preset image');
      throw new Error('Failed to process and save preset image');
    }
  }

  /**
   * Delete preset images (full and thumbnail)
   */
  async deletePresetImage(imagePath: string | null | undefined): Promise<void> {
    if (!imagePath) return;

    try {
      // Extract filename from path
      const filename = path.basename(imagePath);
      const fullPath = path.join(this.presetsDir, filename);

      // Derive thumbnail path (replace -full with -thumb)
      const thumbFilename = filename.replace('-full.webp', '-thumb.webp');
      const thumbPath = path.join(this.presetsDir, thumbFilename);

      // Delete both files if they exist
      await this.deleteFileIfExists(fullPath);
      await this.deleteFileIfExists(thumbPath);

      logger.info({ imagePath }, 'Preset images deleted');
    } catch (error) {
      logger.error({ error, imagePath }, 'Failed to delete preset images');
      // Don't throw - deletion failure shouldn't block preset deletion
    }
  }

  /**
   * Delete old images for a preset (when updating with new image)
   */
  async deleteOldPresetImages(presetId: string): Promise<void> {
    try {
      const files = await fs.readdir(this.presetsDir);
      const presetFiles = files.filter(f => f.startsWith(`${presetId}-`));

      for (const file of presetFiles) {
        const filePath = path.join(this.presetsDir, file);
        await this.deleteFileIfExists(filePath);
      }

      if (presetFiles.length > 0) {
        logger.info({ presetId, filesDeleted: presetFiles.length }, 'Old preset images deleted');
      }
    } catch (error) {
      logger.error({ error, presetId }, 'Failed to delete old preset images');
      // Don't throw - cleanup failure shouldn't block operation
    }
  }

  /**
   * Check if preset has existing images
   */
  async hasImages(imagePath: string | null | undefined): Promise<boolean> {
    if (!imagePath) return false;

    try {
      const filename = path.basename(imagePath);
      const fullPath = path.join(this.presetsDir, filename);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get full file path for serving
   */
  getFullPath(filename: string): string {
    return path.join(this.presetsDir, filename);
  }

  /**
   * Helper to delete file if it exists
   */
  private async deleteFileIfExists(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Validate image file
   */
  validateImage(file: Express.Multer.File): { valid: boolean; error?: string } {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedMimes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 5MB limit.'
      };
    }

    return { valid: true };
  }
}

export const presetStorageService = new PresetStorageService();