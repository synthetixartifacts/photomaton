import { Router, Request, Response, NextFunction } from 'express';
import { promises as fs } from 'fs';
import pino from 'pino';
import { validateQuery, validateParams } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePhotoOwnership, getAccountIdForQuery } from '../middleware/dataIsolation.js';
import { photoService } from '../services/photo.js';
import { storageService } from '../services/storage.js';
import { exportService } from '../services/export.js';
import { PhotoListQuerySchema, PhotoIdSchema, PresetSchema } from '@photomaton/shared';
import { z } from 'zod';

const logger = pino({ name: 'api-photos' });
const router = Router();

// CRITICAL: Protect all photo routes with authentication
router.use(requireAuth);

// Schema for export query parameters
const ExportQuerySchema = z.object({
  includeOriginals: z.coerce.boolean().optional(),
  preset: PresetSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

// GET /api/photos - List all photos with pagination (filtered by account)
router.get(
  '/',
  validateQuery(PhotoListQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cursor, limit = 20, status, preset } = req.query as any;

      // Get account ID for filtering (admin can optionally see all)
      const accountId = getAccountIdForQuery(req.account!, false); // No admin bypass for listing

      logger.info({ cursor, limit, status, preset, accountId }, 'Listing photos');

      const result = await photoService.list({
        cursor,
        limit,
        status,
        preset,
        accountId  // CRITICAL: Filter by account
      });

      return res.json(result);

    } catch (error) {
      logger.error({ error }, 'Failed to list photos');
      return next(error);
    }
  }
);

// GET /api/photos/stats - Get photo statistics (filtered by account)
router.get(
  '/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get account ID for filtering (admin can see all stats)
      const accountId = getAccountIdForQuery(req.account!, true); // Allow admin bypass

      const dbStats = await photoService.getStats(accountId);

      return res.json(dbStats);
    } catch (error) {
      logger.error({ error }, 'Failed to get stats');
      return next(error);
    }
  }
);

// GET /api/photos/stats/overview - Get detailed statistics (admin can see all)
router.get(
  '/stats/overview',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get account ID for filtering (admin can see all stats)
      const accountId = getAccountIdForQuery(req.account!, true); // Allow admin bypass

      const dbStats = await photoService.getStats(accountId);
      const storageStats = await storageService.getStorageStats();

      return res.json({
        database: dbStats,
        storage: storageStats
      });

    } catch (error) {
      logger.error({ error }, 'Failed to get stats');
      return next(error);
    }
  }
);

// GET /api/photos/export - Export photos as ZIP (filtered by account)
router.get(
  '/export',
  validateQuery(ExportQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = req.query as z.infer<typeof ExportQuerySchema>;

      // Get account ID for filtering (no admin bypass - each user exports their own)
      const accountId = getAccountIdForQuery(req.account!, false);

      logger.info({ options, accountId }, 'Starting photo export');

      // Create the export archive with account filtering
      const { stream, manifest } = await exportService.createExportArchive({
        ...options,
        accountId  // CRITICAL: Filter by account
      });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `photomaton_export_${timestamp}.zip`;

      // Set response headers
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Photo-Count', manifest.photoCount.toString());

      // Pipe the archive stream to response
      stream.pipe(res);

      stream.on('end', () => {
        logger.info({
          filename,
          photoCount: manifest.photoCount,
          totalSize: manifest.totalSize
        }, 'Export completed successfully');
      });

      stream.on('error', (error) => {
        logger.error({ error }, 'Export stream error');
        if (!res.headersSent) {
          res.status(500).json({
            error: {
              code: 'EXPORT_FAILED',
              message: 'Failed to export photos'
            }
          });
        }
      });

    } catch (error) {
      logger.error({ error }, 'Failed to export photos');
      if (error instanceof Error && error.message.includes('No photos')) {
        return res.status(404).json({
          error: {
            code: 'NO_PHOTOS',
            message: error.message
          }
        });
      }
      return next(error);
    }
  }
);

// GET /api/photos/export/estimate - Estimate export size (filtered by account)
router.get(
  '/export/estimate',
  validateQuery(ExportQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = req.query as z.infer<typeof ExportQuerySchema>;

      // Get account ID for filtering
      const accountId = getAccountIdForQuery(req.account!, false);

      const estimate = await exportService.estimateExportSize({
        ...options,
        accountId  // CRITICAL: Filter by account
      });

      return res.json({
        photoCount: estimate.photoCount,
        estimatedSize: estimate.estimatedSize,
        estimatedSizeMB: Math.round(estimate.estimatedSize / (1024 * 1024) * 10) / 10
      });

    } catch (error) {
      logger.error({ error }, 'Failed to estimate export size');
      return next(error);
    }
  }
);

// DELETE /api/photos/all - Delete all photos (filtered by account, must be before /:id)
router.delete(
  '/all',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get account ID for filtering (no admin bypass - safety first)
      const accountId = getAccountIdForQuery(req.account!, false);

      logger.info({ accountId }, 'Deleting all photos for account');

      // Get all photos for this account
      const allPhotos = await photoService.list({ limit: 1000, accountId });

      // Delete each photo
      for (const photo of allPhotos.photos) {
        try {
          await storageService.deletePhoto(photo.id);
          await photoService.delete(photo.id);
        } catch (error) {
          logger.error({ error, photoId: photo.id }, 'Failed to delete photo');
        }
      }

      return res.json({
        success: true,
        message: `Deleted ${allPhotos.photos.length} photos`,
        count: allPhotos.photos.length
      });

    } catch (error) {
      logger.error({ error }, 'Failed to delete all photos');
      return next(error);
    }
  }
);

// GET /api/photos/:id - Get single photo details (with ownership verification)
router.get(
  '/:id',
  validateParams(z.object({ id: PhotoIdSchema })),
  requirePhotoOwnership,  // CRITICAL: Verify ownership
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Photo already loaded and verified by requirePhotoOwnership middleware
      const photo = (req as any).photo;

      return res.json(photo);

    } catch (error) {
      logger.error({ error, photoId: req.params.id }, 'Failed to get photo');
      return next(error);
    }
  }
);

// GET /api/photos/:id/original - Get original image (with ownership verification)
router.get(
  '/:id/original',
  validateParams(z.object({ id: PhotoIdSchema })),
  requirePhotoOwnership,  // CRITICAL: Verify ownership
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const imagePath = await storageService.getPhotoPath(id, 'original');

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      const imageBuffer = await fs.readFile(imagePath);
      return res.send(imageBuffer);

    } catch (error) {
      logger.error({ error, photoId: req.params.id }, 'Failed to get original image');
      if ((error as any).message?.includes('not found')) {
        return res.status(404).json({
          error: {
            code: 'IMAGE_NOT_FOUND',
            message: 'Original image not found'
          }
        });
      }
      return next(error);
    }
  }
);

// GET /api/photos/:id/thumbnail - Get thumbnail image (with ownership verification)
router.get(
  '/:id/thumbnail',
  validateParams(z.object({ id: PhotoIdSchema })),
  requirePhotoOwnership,  // CRITICAL: Verify ownership
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const imagePath = await storageService.getPhotoPath(id, 'thumbnail');

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      const imageBuffer = await fs.readFile(imagePath);
      return res.send(imageBuffer);

    } catch (error) {
      logger.error({ error, photoId: req.params.id }, 'Failed to get thumbnail');
      if ((error as any).message?.includes('not found')) {
        return res.status(404).json({
          error: {
            code: 'IMAGE_NOT_FOUND',
            message: 'Thumbnail not found'
          }
        });
      }
      return next(error);
    }
  }
);

// GET /api/photos/:id/transformed/:preset - Get transformed image (with ownership verification)
router.get(
  '/:id/transformed/:preset',
  validateParams(z.object({
    id: PhotoIdSchema,
    preset: PresetSchema
  })),
  requirePhotoOwnership,  // CRITICAL: Verify ownership
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, preset } = req.params;
      const photo = (req as any).photo;

      if (!photo.transformedPath) {
        return res.status(404).json({
          error: {
            code: 'TRANSFORM_NOT_READY',
            message: 'Transformed image not yet available'
          }
        });
      }

      const imagePath = await storageService.getPhotoPath(id, preset);

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

      const imageBuffer = await fs.readFile(imagePath);
      return res.send(imageBuffer);

    } catch (error) {
      logger.error({ error, photoId: req.params.id, preset: req.params.preset }, 'Failed to get transformed image');
      if ((error as any).message?.includes('not found')) {
        return res.status(404).json({
          error: {
            code: 'IMAGE_NOT_FOUND',
            message: 'Transformed image not found'
          }
        });
      }
      return next(error);
    }
  }
);


// DELETE /api/photos/:id - Delete a photo (with ownership verification)
router.delete(
  '/:id',
  validateParams(z.object({ id: PhotoIdSchema })),
  requirePhotoOwnership,  // CRITICAL: Verify ownership
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Delete from storage (moves to trash)
      await storageService.deletePhoto(id);

      // Delete from database
      await photoService.delete(id);

      return res.status(204).send();

    } catch (error) {
      logger.error({ error, photoId: req.params.id }, 'Failed to delete photo');
      return next(error);
    }
  }
);

export { router as photosRouter };