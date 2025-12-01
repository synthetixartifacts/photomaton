import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import { configManager } from '../config/index.js';
import { providerManager } from '../providers/manager.js';
import { AppConfigSchema, PresetPromptSchema } from '@photomaton/shared';

const router = Router();

const UpdateConfigSchema = z.object({
  timings: z.object({
    countdownSeconds: z.number().min(1).max(10).optional(),
    displayTransformedSeconds: z.number().min(5).max(60).optional(),
    processingCheckIntervalMs: z.number().min(500).max(5000).optional(),
    maxProcessingTimeSeconds: z.number().min(10).max(120).optional(),
    rotationAnimationMs: z.number().min(100).max(2000).optional(),
    fadeAnimationMs: z.number().min(100).max(1000).optional(),
  }).optional(),
  ui: z.object({
    countdownBackgroundOpacity: z.number().min(0).max(1).optional(),
    spinnerSize: z.string().optional(),
    enableCarouselAutoRefresh: z.boolean().optional(),
    carouselRefreshIntervalMs: z.number().min(1000).max(30000).optional(),
    maxPhotosInCarousel: z.number().min(10).max(100).optional(),
    galleryPageSize: z.number().min(5).max(100).optional(),
  }).optional(),
  camera: z.object({
    deviceId: z.string().optional(),
    width: z.number().min(640).max(3840).optional(),
    height: z.number().min(480).max(2160).optional(),
    facingMode: z.enum(['user', 'environment']).optional(),
  }).optional(),
  providers: z.object({
    activeProvider: z.string().optional(),
    mockDelayMs: z.number().min(0).max(10000).optional(),
  }).optional(),
  presets: z.object({
    availablePresets: z.array(PresetPromptSchema).optional(),
    defaultPreset: z.string().optional(),
  }).optional(),
  features: z.object({
    enableWebSockets: z.boolean().optional(),
    enableDebugMode: z.boolean().optional(),
    enableMetrics: z.boolean().optional(),
    enablePhotoExport: z.boolean().optional(),
    enableBulkDelete: z.boolean().optional(),
    enableDeletePicture: z.boolean().optional(),
    showBeforeAfterInfo: z.boolean().optional(),
    showDownloadButtons: z.boolean().optional(),
  }).optional(),
  watermark: z.object({
    enabled: z.boolean().optional(),
    watermarkPath: z.string().optional(),
    paddingX: z.number().min(0).max(500).optional(),
    paddingY: z.number().min(0).max(500).optional(),
    position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).optional(),
  }).optional(),
  userLimits: z.object({
    eraEmployeePhotoLimit: z.number().min(0).max(10000).optional(),
    defaultUserPhotoLimit: z.number().min(0).max(10000).optional(),
  }).optional(),
});

// Removed basicAuth - now using requireRole('admin') middleware from auth.ts

router.get('/config', (_req, res) => {
  const config = configManager.getConfig();

  // Get actual available providers from the provider manager
  const availableProviders = providerManager.getAvailableProviders();

  // Remove sensitive fields before sending to client
  const clientConfig = {
    timings: config.timings,
    ui: config.ui,
    camera: config.camera,
    providers: {
      activeProvider: config.providers.activeProvider,
      availableProviders: availableProviders,
      mockDelayMs: config.providers.mockDelayMs,
    },
    presets: config.presets,
    features: config.features,
    watermark: config.watermark,
    userLimits: config.userLimits,
  };

  res.json(clientConfig);
});

router.get('/config/stats', (_req, res) => {
  const config = configManager.getConfig();

  res.json({
    activeProvider: config.providers.activeProvider,
    presetsEnabled: config.presets.availablePresets?.filter(p => p.enabled).length || 0,
    presetsTotal: config.presets.availablePresets?.length || 0,
    webSocketsEnabled: config.features.enableWebSockets,
    debugMode: config.features.enableDebugMode,
  });
});

// CRITICAL: Only admins can update configuration
router.put('/admin/config', requireRole('admin'), async (req, res) => {
  try {
    const updates = UpdateConfigSchema.parse(req.body);
    const updated = configManager.updateConfig(updates);

    // Remove sensitive fields
    const response = {
      timings: updated.timings,
      ui: updated.ui,
      camera: updated.camera,
      providers: {
        activeProvider: updated.providers.activeProvider,
        availableProviders: updated.providers.availableProviders,
      },
      presets: updated.presets,
      features: updated.features,
      watermark: updated.watermark,
      userLimits: updated.userLimits,
    };

    res.json({
      success: true,
      config: response,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid configuration',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        error: 'Failed to update configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

// CRITICAL: Only admins can reset configuration
router.post('/admin/config/reset', requireRole('admin'), async (_req, res) => {
  try {
    const defaultConfig = AppConfigSchema.parse({});
    const updated = configManager.updateConfig(defaultConfig);

    res.json({
      success: true,
      config: updated,
      message: 'Configuration reset to defaults',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset configuration',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;