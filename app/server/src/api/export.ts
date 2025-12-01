import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { exportService } from '../services/export.js';
import { logger } from '../utils/logger.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /api/photos/export/all
 * Export all user photos as ZIP
 */
router.get('/all', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const accountId = req.account!.id;

    logger.info({ accountId }, 'Starting user photo export');

    // Create export archive (filtered by account)
    const { stream, manifest } = await exportService.createExportArchive({
      accountId,
      includeOriginals: false, // Only transformed photos
    });

    // Set headers for ZIP download
    const filename = `photomaton-export-${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe the archive stream to response
    stream.on('error', (error) => {
      logger.error({ error, accountId }, 'Stream error during photo export');
      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'EXPORT_ERROR',
            message: 'Failed to export photos',
          },
        });
      }
    });

    stream.pipe(res);

    logger.info(
      { accountId, photoCount: manifest.photoCount, totalSize: manifest.totalSize },
      'Photo export completed successfully'
    );
  } catch (error: any) {
    logger.error({ error, accountId: req.account?.id }, 'Photo export failed');

    // Handle specific error cases
    if (error.message?.includes('No photos')) {
      res.status(404).json({
        error: {
          code: 'NO_PHOTOS',
          message: 'No photos available for export',
        },
      });
      return;
    }

    next(error);
  }
});

/**
 * GET /api/photos/export/originals
 * Export all original (untransformed) user photos as ZIP
 */
router.get('/originals', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const accountId = req.account!.id;

    logger.info({ accountId }, 'Starting original photos export');

    // Create export archive with originals only (filtered by account)
    const { stream, manifest } = await exportService.createExportArchive({
      accountId,
      includeOriginals: true, // Only original photos
    });

    // Set headers for ZIP download
    const filename = `photomaton-originals-${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe the archive stream to response
    stream.on('error', (error) => {
      logger.error({ error, accountId }, 'Stream error during original photos export');
      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'EXPORT_ERROR',
            message: 'Failed to export original photos',
          },
        });
      }
    });

    stream.pipe(res);

    logger.info(
      { accountId, photoCount: manifest.photoCount, totalSize: manifest.totalSize },
      'Original photos export completed successfully'
    );
  } catch (error: any) {
    logger.error({ error, accountId: req.account?.id }, 'Original photos export failed');

    // Handle specific error cases
    if (error.message?.includes('No photos')) {
      res.status(404).json({
        error: {
          code: 'NO_PHOTOS',
          message: 'No original photos available for export',
        },
      });
      return;
    }

    next(error);
  }
});

/**
 * GET /api/photos/export/estimate
 * Estimate export size before downloading
 */
router.get('/estimate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = req.account!.id;

    const estimate = await exportService.estimateExportSize({
      accountId,
      includeOriginals: false,
    });

    res.json({
      success: true,
      data: estimate,
    });
  } catch (error) {
    logger.error({ error, accountId: req.account?.id }, 'Export estimate failed');
    next(error);
  }
});

export { router as exportRouter };
