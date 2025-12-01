import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import pino from 'pino';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';
import { validateBody } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { storageService } from '../services/storage.js';
import { photoService } from '../services/photo.js';
import { transformService } from '../services/transform.js';
import { presetService } from '../services/preset.js';
import { userLimitService } from '../services/userLimitService.js';
import { accountService } from '../services/accountService.js';
import { CaptureRequestSchema } from '@photomaton/shared';

const logger = pino({ name: 'api-capture' });
const router = Router();

// CRITICAL: Protect capture endpoint with authentication
router.use(requireAuth);

// POST /api/capture - Handle photo capture/upload
router.post(
  '/',
  uploadSingle,
  handleUploadError,
  validateBody(CaptureRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: {
            code: 'NO_FILE',
            message: 'No image file provided'
          }
        });
      }

      // Check if user has reached their photo limit
      const canCapture = await userLimitService.canTakePhoto(req.account!);
      if (!canCapture) {
        logger.warn({ accountId: req.account!.id }, 'Photo capture blocked - limit reached');
        return res.status(403).json({
          error: {
            code: 'PHOTO_LIMIT_REACHED',
            message: 'You have reached your photo limit. Please delete some photos or contact an administrator.',
            retry: false,
          }
        });
      }

      const { preset = 'toon-yellow' } = req.body;

      // Validate preset exists and is enabled (check database first, then config)
      let presetData = await presetService.getByPresetId(preset);
      
      if (!presetData) {
        // Check config as fallback
        const { configManager } = await import('../config/index.js');
        const config = configManager.getConfig();
        const configPreset = config.presets.availablePresets?.find(p => p.id === preset);
        
        if (!configPreset) {
          return res.status(400).json({
            error: {
              code: 'PRESET_NOT_FOUND',
              message: `Preset '${preset}' not found. Please use a valid preset ID.`
            }
          });
        }
        
        // For config presets, we'll check enabled status directly
        if (!configPreset.enabled) {
          return res.status(400).json({
            error: {
              code: 'PRESET_DISABLED',
              message: `Preset '${preset}' is currently disabled.`
            }
          });
        }
      } else if (!presetData.enabled) {
        return res.status(400).json({
          error: {
            code: 'PRESET_DISABLED',
            message: `Preset '${preset}' is currently disabled.`
          }
        });
      }

      logger.info({
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        preset
      }, 'Processing photo capture');

      // Generate a single ID to use everywhere
      const photoId = crypto.randomUUID();

      // Save original image with the generated ID
      const saveResult = await storageService.saveOriginal(req.file.buffer, photoId);

      // CRITICAL: Associate photo with authenticated user account
      const accountId = req.account!.id;

      // Create photo record in database with the same ID
      await photoService.create({
        id: photoId,
        preset,
        originalPath: saveResult.originalPath,
        thumbnailPath: saveResult.thumbnailPath,
        metadata: saveResult.metadata,
        accountId  // CRITICAL: Associate with account for data isolation
      });

      // CRITICAL: Increment the user's photosTaken counter
      // This counter never decreases (even if photos are deleted) to prevent limit bypass
      await accountService.incrementPhotosTaken(accountId);

      logger.info({ photoId, accountId, preset }, 'Photo captured and associated with account');

      // Update status to processing
      await photoService.update(photoId, {
        status: 'processing'
      });

      // Start transform process immediately (non-blocking)
      transformService.processImmediate(
        photoId,
        preset,
        req.file.buffer
      ).catch(error => {
        logger.error({ error, photoId }, 'Background transform failed');
      });

      // Return success response
      return res.status(201).json({
        id: photoId,
        status: 'captured',
        originalPath: `/api/photos/${photoId}/original`,
        thumbnailPath: `/api/photos/${photoId}/thumbnail`,
        metadata: saveResult.metadata
      });

    } catch (error) {
      logger.error({ error }, 'Capture failed');
      return next(error);
    }
  }
);

export { router as captureRouter };