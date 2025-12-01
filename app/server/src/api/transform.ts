import { Router, Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { validateBody } from '../middleware/validation.js';
import { photoService } from '../services/photo.js';
import { transformService } from '../services/transform.js';
import { presetService } from '../services/preset.js';
import { configManager } from '../config/index.js';
import { TransformRequestSchema } from '@photomaton/shared';
import { logTransformStep, logEnvironmentInfo } from '../utils/transformLogger.js';

const logger = pino({ name: 'api-transform' });
const router = Router();

// POST /api/transform - Transform an existing photo
router.post(
  '/',
  validateBody(TransformRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { photoId, preset, options } = req.body;

      logger.info({ photoId, preset, options }, 'Transform requested');

      // Log the request details to transform process log
      logTransformStep(
        'API_REQUEST_START',
        {
          photoId,
          preset,
          requestedProvider: options?.provider,
          hasOptions: !!options
        },
        `Transform API request received - Photo: ${photoId}, Preset: ${preset}, Provider: ${options?.provider || 'default'}`
      );

      // Log environment info on first request
      await logEnvironmentInfo();

      // Validate preset exists in database or config
      const presetExists = await presetService.exists(preset);
      let presetData = null;
      
      if (presetExists) {
        presetData = await presetService.getByPresetId(preset);
      } else {
        // Check config as fallback
        const config = configManager.getConfig();
        const configPreset = config.presets.availablePresets?.find(p => p.id === preset);
        if (!configPreset) {
          logTransformStep(
            'API_ERROR',
            { preset, errorCode: 'PRESET_NOT_FOUND' },
            `Preset not found in database or config: ${preset}`,
            'error'
          );
          return res.status(400).json({
            error: {
              code: 'PRESET_NOT_FOUND',
              message: `Preset '${preset}' not found. Please use a valid preset ID.`
            }
          });
        }
        // Convert config preset to database format for consistency
        presetData = {
          enabled: configPreset.enabled,
          name: configPreset.name
        };
      }

      // Check if preset is enabled
      if (presetData && !presetData.enabled) {
        logTransformStep(
          'API_ERROR',
          { preset, errorCode: 'PRESET_DISABLED' },
          `Preset is disabled: ${preset}`,
          'error'
        );
        return res.status(400).json({
          error: {
            code: 'PRESET_DISABLED',
            message: `Preset '${preset}' is currently disabled.`
          }
        });
      }

      // Check if photo exists
      const photo = await photoService.get(photoId);
      if (!photo) {
        logTransformStep(
          'API_ERROR',
          { photoId, errorCode: 'PHOTO_NOT_FOUND' },
          `Photo not found in database: ${photoId}`,
          'error'
        );
        return res.status(404).json({
          error: {
            code: 'PHOTO_NOT_FOUND',
            message: `Photo with ID ${photoId} not found`
          }
        });
      }

      logTransformStep(
        'API_PHOTO_FOUND',
        {
          photoId,
          photoStatus: photo.status,
          hasOriginalPath: !!photo.originalPath,
          hasTransformedPath: !!photo.transformedPath
        },
        `Photo found - Status: ${photo.status}`
      );

      // Check if photo is already being processed
      if (photo.status === 'processing') {
        logger.warn({ photoId, currentStatus: photo.status }, 'Photo already processing, checking if stuck');

        // Check if it's stuck in processing (older than 30 seconds)
        const thirtySecondsAgo = new Date(Date.now() - 30000);
        const photoCreatedAt = new Date(photo.createdAt);

        if (photoCreatedAt < thirtySecondsAgo) {
          logger.info({ photoId }, 'Photo stuck in processing, resetting status and retrying');
          // Reset the status to allow retry
          await photoService.update(photoId, { status: 'pending' });
        } else {
          return res.status(409).json({
            error: {
              code: 'ALREADY_PROCESSING',
              message: 'Photo is already being processed'
            }
          });
        }
      }

      // Also check if photo is already completed
      if (photo.status === 'completed' && photo.transformedPath) {
        logger.info({ photoId }, 'Photo already transformed, returning existing result');
        return res.status(200).json({
          photoId,
          status: 'completed',
          transformedPath: photo.transformedPath,
          message: 'Photo already transformed'
        });
      }

      // Queue transform job
      logTransformStep(
        'API_QUEUE_JOB',
        {
          photoId,
          preset,
          requestedProvider: options?.provider
        },
        `Queuing transform job with requested provider: ${options?.provider || 'default'}`
      );

      const jobId = await transformService.processPhoto(photoId, preset, options?.provider);

      logTransformStep(
        'API_JOB_QUEUED',
        {
          photoId,
          jobId,
          preset,
          requestedProvider: options?.provider
        },
        `Transform job queued successfully - JobID: ${jobId}`
      );

      // Return job info
      return res.status(202).json({
        photoId,
        jobId,
        status: 'processing',
        message: 'Transform job queued successfully'
      });

    } catch (error) {
      logger.error({ error }, 'Transform request failed');

      logTransformStep(
        'API_ERROR',
        {
          photoId: req.body?.photoId,
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        },
        `Transform API request failed: ${error instanceof Error ? error.message : String(error)}`,
        'error'
      );

      return next(error);
    }
  }
);

// GET /api/transform/job/:jobId - Check transform job status
router.get(
  '/job/:jobId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;

      const job = transformService.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          error: {
            code: 'JOB_NOT_FOUND',
            message: `Job with ID ${jobId} not found`
          }
        });
      }

      return res.json({
        id: job.id,
        photoId: job.photoId,
        preset: job.preset,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error
      });

    } catch (error) {
      logger.error({ error, jobId: req.params.jobId }, 'Job status check failed');
      return next(error);
    }
  }
);

export { router as transformRouter };