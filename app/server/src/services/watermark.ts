import { promises as fs } from 'fs';
import sharp from 'sharp';
import pino from 'pino';
import type { WatermarkConfig } from '@photomaton/shared';

const logger = pino({ name: 'watermark-service' });

export interface WatermarkOptions {
  paddingX?: number;
  paddingY?: number;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export interface WatermarkResult {
  success: boolean;
  imagePath: string;
  watermarkApplied: boolean;
  error?: string;
}

export class WatermarkService {
  private config: WatermarkConfig;
  private watermarkBuffer: Buffer | null = null;
  private watermarkMetadata: sharp.Metadata | null = null;

  constructor(config: WatermarkConfig) {
    this.config = config;
  }

  /**
   * Update the service configuration
   */
  updateConfig(config: WatermarkConfig): void {
    this.config = config;
    // Clear cached watermark if path changed
    this.watermarkBuffer = null;
    this.watermarkMetadata = null;
  }

  /**
   * Load and cache the watermark image
   */
  private async loadWatermark(): Promise<Buffer | null> {
    if (this.watermarkBuffer) {
      return this.watermarkBuffer;
    }

    try {
      const exists = await this.validateWatermarkFile();
      if (!exists) {
        return null;
      }

      this.watermarkBuffer = await fs.readFile(this.config.watermarkPath);
      this.watermarkMetadata = await sharp(this.watermarkBuffer).metadata();

      logger.info({
        path: this.config.watermarkPath,
        width: this.watermarkMetadata.width,
        height: this.watermarkMetadata.height,
        format: this.watermarkMetadata.format
      }, 'Watermark loaded successfully');

      return this.watermarkBuffer;
    } catch (error) {
      logger.error({ error, path: this.config.watermarkPath }, 'Failed to load watermark');
      return null;
    }
  }

  /**
   * Check if watermark file exists and is valid
   */
  async validateWatermarkFile(): Promise<boolean> {
    try {
      await fs.access(this.config.watermarkPath);
      const metadata = await sharp(this.config.watermarkPath).metadata();
      return !!(metadata.width && metadata.height);
    } catch {
      logger.warn({ path: this.config.watermarkPath }, 'Watermark file not found or invalid');
      return false;
    }
  }

  /**
   * Get watermark metadata for diagnostics
   */
  async getWatermarkMetadata(): Promise<sharp.Metadata | null> {
    if (this.watermarkMetadata) {
      return this.watermarkMetadata;
    }

    try {
      await this.loadWatermark();
      return this.watermarkMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Calculate position for watermark based on image dimensions and config
   */
  private calculatePosition(
    imageWidth: number,
    imageHeight: number,
    watermarkWidth: number,
    watermarkHeight: number,
    options: WatermarkOptions = {}
  ): { left: number; top: number } {
    const paddingX = options.paddingX ?? this.config.paddingX;
    const paddingY = options.paddingY ?? this.config.paddingY;
    const position = options.position ?? this.config.position;

    let left: number;
    let top: number;

    switch (position) {
      case 'top-left':
        left = paddingX;
        top = paddingY;
        break;
      case 'top-right':
        left = imageWidth - watermarkWidth - paddingX;
        top = paddingY;
        break;
      case 'bottom-left':
        left = paddingX;
        top = imageHeight - watermarkHeight - paddingY;
        break;
      case 'bottom-right':
      default:
        left = imageWidth - watermarkWidth - paddingX;
        top = imageHeight - watermarkHeight - paddingY;
        break;
    }

    // Ensure position is not negative
    left = Math.max(0, left);
    top = Math.max(0, top);

    return { left, top };
  }

  /**
   * Apply watermark to an image file
   * Modifies the file in-place using atomic write
   */
  async applyWatermark(
    imagePath: string,
    options: WatermarkOptions = {}
  ): Promise<WatermarkResult> {
    // Check if watermarking is enabled
    if (!this.config.enabled) {
      logger.debug({ imagePath }, 'Watermarking disabled, skipping');
      return {
        success: true,
        imagePath,
        watermarkApplied: false
      };
    }

    try {
      // Load watermark
      const watermarkBuffer = await this.loadWatermark();
      if (!watermarkBuffer || !this.watermarkMetadata) {
        logger.warn({ imagePath }, 'Watermark not available, skipping');
        return {
          success: true,
          imagePath,
          watermarkApplied: false,
          error: 'Watermark file not available'
        };
      }

      // Get image metadata
      const imageMetadata = await sharp(imagePath).metadata();
      if (!imageMetadata.width || !imageMetadata.height) {
        throw new Error('Could not read image dimensions');
      }

      // Check if watermark fits in image
      const watermarkWidth = this.watermarkMetadata.width!;
      const watermarkHeight = this.watermarkMetadata.height!;
      const paddingX = options.paddingX ?? this.config.paddingX;
      const paddingY = options.paddingY ?? this.config.paddingY;

      if (watermarkWidth + paddingX * 2 > imageMetadata.width ||
          watermarkHeight + paddingY * 2 > imageMetadata.height) {
        logger.warn({
          imagePath,
          imageWidth: imageMetadata.width,
          imageHeight: imageMetadata.height,
          watermarkWidth,
          watermarkHeight,
          paddingX,
          paddingY
        }, 'Image too small for watermark with padding, skipping');
        return {
          success: true,
          imagePath,
          watermarkApplied: false,
          error: 'Image too small for watermark'
        };
      }

      // Calculate position
      const { left, top } = this.calculatePosition(
        imageMetadata.width,
        imageMetadata.height,
        watermarkWidth,
        watermarkHeight,
        options
      );

      // Apply watermark and save to temp file
      const tempPath = `${imagePath}.tmp`;

      await sharp(imagePath)
        .composite([{
          input: watermarkBuffer,
          left,
          top,
          blend: 'over'
        }])
        .jpeg({ quality: 85, progressive: true })
        .toFile(tempPath);

      // Atomic replace: rename temp file to original
      await fs.rename(tempPath, imagePath);

      logger.info({
        imagePath,
        position: { left, top },
        watermarkSize: { width: watermarkWidth, height: watermarkHeight }
      }, 'Watermark applied successfully');

      return {
        success: true,
        imagePath,
        watermarkApplied: true
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, imagePath }, 'Failed to apply watermark');

      // Clean up temp file if it exists
      try {
        await fs.unlink(`${imagePath}.tmp`);
      } catch {
        // Ignore cleanup errors
      }

      return {
        success: false,
        imagePath,
        watermarkApplied: false,
        error: errorMessage
      };
    }
  }

  /**
   * Apply watermark to a buffer and return the result
   * Useful for streaming scenarios
   */
  async applyWatermarkToBuffer(
    imageBuffer: Buffer,
    options: WatermarkOptions = {}
  ): Promise<{ buffer: Buffer; watermarkApplied: boolean }> {
    // Check if watermarking is enabled
    if (!this.config.enabled) {
      return { buffer: imageBuffer, watermarkApplied: false };
    }

    try {
      // Load watermark
      const watermarkBuffer = await this.loadWatermark();
      if (!watermarkBuffer || !this.watermarkMetadata) {
        return { buffer: imageBuffer, watermarkApplied: false };
      }

      // Get image metadata
      const imageMetadata = await sharp(imageBuffer).metadata();
      if (!imageMetadata.width || !imageMetadata.height) {
        return { buffer: imageBuffer, watermarkApplied: false };
      }

      // Check if watermark fits
      const watermarkWidth = this.watermarkMetadata.width!;
      const watermarkHeight = this.watermarkMetadata.height!;
      const paddingX = options.paddingX ?? this.config.paddingX;
      const paddingY = options.paddingY ?? this.config.paddingY;

      if (watermarkWidth + paddingX * 2 > imageMetadata.width ||
          watermarkHeight + paddingY * 2 > imageMetadata.height) {
        return { buffer: imageBuffer, watermarkApplied: false };
      }

      // Calculate position
      const { left, top } = this.calculatePosition(
        imageMetadata.width,
        imageMetadata.height,
        watermarkWidth,
        watermarkHeight,
        options
      );

      // Apply watermark
      const resultBuffer = await sharp(imageBuffer)
        .composite([{
          input: watermarkBuffer,
          left,
          top,
          blend: 'over'
        }])
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();

      return { buffer: resultBuffer, watermarkApplied: true };

    } catch (error) {
      logger.error({ error }, 'Failed to apply watermark to buffer');
      return { buffer: imageBuffer, watermarkApplied: false };
    }
  }
}

// Default instance - will be initialized with config from ConfigManager
let watermarkServiceInstance: WatermarkService | null = null;

export function initializeWatermarkService(config: WatermarkConfig): WatermarkService {
  watermarkServiceInstance = new WatermarkService(config);
  return watermarkServiceInstance;
}

export function getWatermarkService(): WatermarkService | null {
  return watermarkServiceInstance;
}

// For direct import when config is available
export { watermarkServiceInstance as watermarkService };
