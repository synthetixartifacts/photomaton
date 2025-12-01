import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { presetService } from '../services/preset.js';
import { presetStorageService } from '../services/presetStorage.js';
import { configManager } from '../config/index.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';
import crypto from 'crypto';
import pino from 'pino';

const router = Router();
const logger = pino({ name: 'presets-api' });

// Validation schemas
const CreatePresetSchema = z.object({
  presetId: z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/, 'Preset ID must contain only lowercase letters, numbers, hyphens, and underscores'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  enabled: z.boolean().default(true),
  icon: z.string().max(10).optional(),
  prompt: z.string().min(10).max(2000),
});

const UpdatePresetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  enabled: z.boolean().optional(),
  icon: z.string().max(10).optional(),
  prompt: z.string().min(10).max(2000).optional(),
});

// Note: TogglePresetSchema was for manual toggle, but we auto-toggle in PATCH endpoint

const BulkToggleSchema = z.object({
  ids: z.array(z.string()).min(1),
  enabled: z.boolean(),
});

const ReorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

// Basic auth middleware - same as config API
const basicAuth = (req: Request, res: Response, next: NextFunction) => {
  const config = configManager.getSecurity();

  // Skip auth if not enabled
  if (!config.enableAdminAuth) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const base64 = authHeader.split(' ')[1];
  const [username, password] = Buffer.from(base64, 'base64').toString().split(':');

  // In production, use proper bcrypt hashing
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  const expectedHash = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD || 'admin').digest('hex');

  if (username !== (config.adminUsername || 'admin') || passwordHash !== expectedHash) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  next();
};

// Request validation middleware
const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      } else {
        res.status(400).json({
          error: 'Invalid request body',
        });
      }
    }
  };
};

// GET /api/presets - List all presets
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enabled = req.query.enabled === 'true' ? true : req.query.enabled === 'false' ? false : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

    const presets = await presetService.list({ enabled, limit });

    res.json({
      success: true,
      data: presets,
      count: presets.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list presets');
    next(error);
  }
});

// GET /api/presets/stats - Get preset statistics
router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await presetService.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get preset stats');
    next(error);
  }
});

// GET /api/presets/enabled - Get only enabled presets
router.get('/enabled', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const presets = await presetService.getEnabledPresets();
    res.json({
      success: true,
      data: presets,
      count: presets.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get enabled presets');
    next(error);
  }
});

// GET /api/presets/:id - Get preset by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const preset = await presetService.getById(id);

    if (!preset) {
      res.status(404).json({
        error: 'Preset not found',
      });
      return;
    }

    res.json({
      success: true,
      data: preset,
    });
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Failed to get preset');
    next(error);
  }
});

// GET /api/presets/by-preset-id/:presetId - Get preset by preset ID
router.get('/by-preset-id/:presetId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { presetId } = req.params;
    const preset = await presetService.getByPresetId(presetId);

    if (!preset) {
      res.status(404).json({
        error: 'Preset not found',
      });
      return;
    }

    res.json({
      success: true,
      data: preset,
    });
  } catch (error) {
    logger.error({ error, presetId: req.params.presetId }, 'Failed to get preset by preset ID');
    next(error);
  }
});

// POST /api/presets - Create new preset (admin only)
router.post('/', basicAuth, validateBody(CreatePresetSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = await presetService.create(req.body);

    const preset = await presetService.getById(id);

    res.status(201).json({
      success: true,
      data: preset,
      message: 'Preset created successfully',
    });
  } catch (error) {
    logger.error({ error, body: req.body }, 'Failed to create preset');
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({
        error: 'Preset ID already exists',
        message: error.message,
      });
    } else {
      next(error);
    }
  }
});

// PUT /api/presets/:id - Update preset (admin only)
router.put('/:id', basicAuth, validateBody(UpdatePresetSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if preset exists
    const existingPreset = await presetService.getById(id);
    if (!existingPreset) {
      res.status(404).json({
        error: 'Preset not found',
      });
      return;
    }

    await presetService.update(id, req.body);
    const updatedPreset = await presetService.getById(id);

    res.json({
      success: true,
      data: updatedPreset,
      message: 'Preset updated successfully',
    });
  } catch (error) {
    logger.error({ error, id: req.params.id, body: req.body }, 'Failed to update preset');
    next(error);
  }
});

// PATCH /api/presets/:id/toggle - Toggle preset enabled status (admin only)
router.patch('/:id/toggle', basicAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const newEnabledState = await presetService.toggle(id);
    const preset = await presetService.getById(id);

    res.json({
      success: true,
      data: preset,
      message: `Preset ${newEnabledState ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Failed to toggle preset');
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Preset not found',
        message: error.message,
      });
    } else {
      next(error);
    }
  }
});

// PATCH /api/presets/bulk/toggle - Bulk toggle presets (admin only)
router.patch('/bulk/toggle', basicAuth, validateBody(BulkToggleSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids, enabled } = req.body;

    const updatedCount = await presetService.bulkUpdateEnabled(ids, enabled);

    res.json({
      success: true,
      data: {
        updatedCount,
        enabled,
      },
      message: `${updatedCount} presets ${enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    logger.error({ error, body: req.body }, 'Failed to bulk toggle presets');
    next(error);
  }
});

// DELETE /api/presets/:id - Delete preset (admin only)
router.delete('/:id', basicAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if preset exists
    const existingPreset = await presetService.getById(id);
    if (!existingPreset) {
      res.status(404).json({
        error: 'Preset not found',
      });
      return;
    }

    // Delete associated images if they exist
    if (existingPreset.imagePath) {
      await presetStorageService.deletePresetImage(existingPreset.imagePath);
    }

    await presetService.delete(id);

    res.json({
      success: true,
      message: 'Preset deleted successfully',
    });
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Failed to delete preset');
    next(error);
  }
});

// POST /api/presets/:id/image - Upload image for preset (admin only)
router.post('/:id/image', basicAuth, uploadSingle, handleUploadError, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if preset exists
    const preset = await presetService.getById(id);
    if (!preset) {
      res.status(404).json({
        error: 'Preset not found',
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No image file provided'
        }
      });
      return;
    }

    // Validate the image
    const validation = presetStorageService.validateImage(req.file);
    if (!validation.valid) {
      res.status(400).json({
        error: {
          code: 'INVALID_IMAGE',
          message: validation.error
        }
      });
      return;
    }

    // Delete old images if they exist
    if (preset.imagePath) {
      await presetStorageService.deleteOldPresetImages(preset.presetId);
    }

    // Save new image
    const { imagePath, thumbnailPath } = await presetStorageService.savePresetImage(
      preset.presetId,
      req.file.buffer
    );

    // Update preset with new image path
    await presetService.updateImage(id, imagePath);

    // Get updated preset
    const updatedPreset = await presetService.getById(id);

    res.json({
      success: true,
      data: {
        ...updatedPreset,
        thumbnailPath // Include thumbnail path in response
      },
      message: 'Preset image uploaded successfully'
    });
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Failed to upload preset image');
    next(error);
  }
});

// DELETE /api/presets/:id/image - Remove image from preset (admin only)
router.delete('/:id/image', basicAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if preset exists
    const preset = await presetService.getById(id);
    if (!preset) {
      res.status(404).json({
        error: 'Preset not found',
      });
      return;
    }

    if (!preset.imagePath) {
      res.status(400).json({
        error: 'Preset has no image to delete',
      });
      return;
    }

    // Delete image files
    await presetStorageService.deletePresetImage(preset.imagePath);

    // Update preset to remove image path
    await presetService.updateImage(id, null);

    res.json({
      success: true,
      message: 'Preset image deleted successfully'
    });
  } catch (error) {
    logger.error({ error, id: req.params.id }, 'Failed to delete preset image');
    next(error);
  }
});

// PATCH /api/presets/reorder - Reorder presets (admin only)
router.patch('/reorder', basicAuth, validateBody(ReorderSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderedIds } = req.body;

    await presetService.reorder(orderedIds);

    res.json({
      success: true,
      message: 'Presets reordered successfully',
    });
  } catch (error) {
    logger.error({ error, body: req.body }, 'Failed to reorder presets');
    next(error);
  }
});

export { router as presetsRouter };