import archiver from 'archiver';
import { promises as fs } from 'fs';
import pino from 'pino';
import { photoService } from './photo.js';
import { storageService } from './storage.js';
import type { PhotoStatus } from '@photomaton/shared';
import { PassThrough } from 'stream';

const logger = pino({ name: 'export-service' });

export interface ExportOptions {
  includeOriginals?: boolean;
  preset?: string;
  status?: PhotoStatus;
  dateFrom?: Date;
  dateTo?: Date;
  accountId?: string;  // Filter by account ID for multi-tenancy
}

export interface ExportManifest {
  exportDate: string;
  photoCount: number;
  totalSize: number;
  options: ExportOptions;
  photos: Array<{
    id: string;
    preset: string;
    createdAt: string;
    filename: string;
  }>;
}

export class ExportService {
  constructor() {}

  /**
   * Create a ZIP archive of processed photos
   * Returns a readable stream that can be piped to the response
   */
  async createExportArchive(options: ExportOptions = {}): Promise<{
    stream: PassThrough;
    manifest: ExportManifest;
  }> {
    const startTime = Date.now();
    logger.info({ options }, 'Starting photo export');

    try {
      // Get all completed photos (filtered by account if provided)
      const photoList = await photoService.list({
        limit: 1000, // Get all photos
        status: options.status || 'completed',
        accountId: options.accountId  // CRITICAL: Filter by account
      });

      const photos = photoList.photos;

      if (photos.length === 0) {
        throw new Error('No photos available for export');
      }

      // Filter by date range if specified
      let filteredPhotos = photos;
      if (options.dateFrom || options.dateTo) {
        filteredPhotos = photos.filter(photo => {
          const photoDate = new Date(photo.createdAt);
          if (options.dateFrom && photoDate < options.dateFrom) return false;
          if (options.dateTo && photoDate > options.dateTo) return false;
          return true;
        });
      }

      // Filter by preset if specified
      if (options.preset) {
        filteredPhotos = filteredPhotos.filter(photo => photo.preset === options.preset);
      }

      if (filteredPhotos.length === 0) {
        throw new Error('No photos match the export criteria');
      }

      // Create archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Create a pass-through stream
      const passThrough = new PassThrough();
      archive.pipe(passThrough);

      // Handle archive errors
      archive.on('error', (err) => {
        logger.error({ error: err }, 'Archive error');
        throw err;
      });

      archive.on('warning', (err) => {
        logger.warn({ warning: err }, 'Archive warning');
      });

      // Prepare manifest
      const manifest: ExportManifest = {
        exportDate: new Date().toISOString(),
        photoCount: 0,
        totalSize: 0,
        options,
        photos: []
      };

      // Add photos to archive
      for (const photo of filteredPhotos) {
        try {
          // Determine which file to include
          let variant: string;
          let filePrefix: string;

          if (options.includeOriginals) {
            variant = 'original';
            filePrefix = 'originals';
          } else if (photo.transformedPath) {
            variant = photo.preset;
            filePrefix = 'transformed';
          } else {
            // Skip photos without transformed versions unless originals requested
            continue;
          }

          const photoPath = await storageService.getPhotoPath(photo.id, variant);

          // Check if file exists
          const stats = await fs.stat(photoPath);

          // Create a safe filename
          const timestamp = new Date(photo.createdAt).getTime();
          const filename = `${filePrefix}/${photo.id}_${photo.preset}_${timestamp}.jpg`;

          // Add file to archive
          archive.file(photoPath, { name: filename });

          // Update manifest
          manifest.photos.push({
            id: photo.id,
            preset: photo.preset,
            createdAt: photo.createdAt.toString(),
            filename
          });

          manifest.totalSize += stats.size;
          manifest.photoCount++;

        } catch (error) {
          logger.warn({ error, photoId: photo.id }, 'Failed to add photo to archive');
          // Continue with other photos
        }
      }

      if (manifest.photoCount === 0) {
        throw new Error('No photos could be added to the archive');
      }

      // Add manifest to archive
      const manifestJson = JSON.stringify(manifest, null, 2);
      archive.append(manifestJson, { name: 'manifest.json' });

      // Finalize the archive - this doesn't return a promise, it's synchronous
      archive.finalize();

      const duration = Date.now() - startTime;
      logger.info({
        photoCount: manifest.photoCount,
        totalSize: manifest.totalSize,
        duration
      }, 'Export archive created successfully');

      return {
        stream: passThrough,
        manifest
      };

    } catch (error) {
      logger.error({ error }, 'Failed to create export archive');
      throw error;
    }
  }

  /**
   * Estimate the size of an export before creating it
   */
  async estimateExportSize(options: ExportOptions = {}): Promise<{
    photoCount: number;
    estimatedSize: number;
  }> {
    try {
      // Get all completed photos (filtered by account if provided)
      const photoList = await photoService.list({
        limit: 1000,
        status: options.status || 'completed',
        accountId: options.accountId  // CRITICAL: Filter by account
      });

      let photos = photoList.photos;

      // Apply filters
      if (options.dateFrom || options.dateTo) {
        photos = photos.filter(photo => {
          const photoDate = new Date(photo.createdAt);
          if (options.dateFrom && photoDate < options.dateFrom) return false;
          if (options.dateTo && photoDate > options.dateTo) return false;
          return true;
        });
      }

      if (options.preset) {
        photos = photos.filter(photo => photo.preset === options.preset);
      }

      let totalSize = 0;
      let photoCount = 0;

      for (const photo of photos) {
        try {
          const variant = options.includeOriginals ? 'original' : photo.preset;

          // Skip if no transformed version and not including originals
          if (!options.includeOriginals && !photo.transformedPath) {
            continue;
          }

          const photoPath = await storageService.getPhotoPath(photo.id, variant);
          const stats = await fs.stat(photoPath);

          totalSize += stats.size;
          photoCount++;
        } catch (error) {
          // Skip photos that can't be accessed
          continue;
        }
      }

      // Add overhead for ZIP compression (estimate 10% compression)
      const estimatedSize = Math.floor(totalSize * 0.9);

      return {
        photoCount,
        estimatedSize
      };

    } catch (error) {
      logger.error({ error }, 'Failed to estimate export size');
      throw error;
    }
  }
}

// Export singleton instance
export const exportService = new ExportService();