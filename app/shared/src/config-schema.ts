import { z } from 'zod';

export const TimingsConfigSchema = z.object({
  countdownSeconds: z.number().min(1).max(10).default(5),
  displayTransformedSeconds: z.number().min(5).max(60).default(15),
  processingCheckIntervalMs: z.number().min(500).max(5000).default(1000),
  maxProcessingTimeSeconds: z.number().min(10).max(120).default(30),
  maxRetryAttempts: z.number().min(5).max(50).default(15),
  maxProcessingAgeMs: z.number().min(30000).max(600000).default(120000), // 30s to 10 min, default 2 min
  rotationAnimationMs: z.number().min(100).max(2000).default(600),
  fadeAnimationMs: z.number().min(100).max(1000).default(300),
});

export const UIConfigSchema = z.object({
  countdownBackgroundOpacity: z.number().min(0).max(1).default(0.1),
  spinnerSize: z.string().default('w-16 h-16'),
  enableCarouselAutoRefresh: z.boolean().default(true),
  carouselRefreshIntervalMs: z.number().min(1000).max(30000).default(5000),
  maxPhotosInCarousel: z.number().min(10).max(100).default(50),
  galleryPageSize: z.number().min(5).max(100).default(20),
  beforeAfterSliderPosition: z.number().min(0).max(100).default(95),
});

export const CameraConfigSchema = z.object({
  deviceId: z.string().optional(), // Camera device ID, undefined = default camera
  width: z.number().min(640).max(3840).default(1920),
  height: z.number().min(480).max(2160).default(1080),
  facingMode: z.enum(['user', 'environment']).default('user'),
});

export const ProviderConfigSchema = z.object({
  activeProvider: z.string().default('mock'),
  availableProviders: z.array(z.string()).default(['mock', 'gemini-imagen']),
  mockDelayMs: z.number().min(0).max(10000).default(2000),
});

// Enhanced preset schema with advanced prompt configuration
export const PresetPromptSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  prompt: z.string(), // Legacy simple prompt for backward compatibility
  icon: z.string().optional(),
  imagePath: z.string().optional(), // Path to preset preview image
  // Advanced prompt structure for Nano Banana
  advancedPrompt: z.object({
    basePrompt: z.string(),
    subjectPrompt: z.string().optional(),
    compositionPrompt: z.string().optional(),
    lightingPrompt: z.string().optional(),
    stylePrompt: z.string().optional(),
    negativePrompt: z.string().optional(),
    promptStrength: z.number().min(0).max(2).default(1.0),
    preserveIdentity: z.boolean().default(true),
    outputResolution: z.string().default('1024x1024'),
  }).optional(),
});

export const PresetsConfigSchema = z.object({
  // Removed hardcoded preset defaults - presets now come from database only
  availablePresets: z.array(PresetPromptSchema).default([]),
  defaultPreset: z.string().default('toon-yellow'), // Keep default for backward compatibility
});

export const SecurityConfigSchema = z.object({
  enableAdminAuth: z.boolean().default(false),
  adminUsername: z.string().optional(),
  adminPasswordHash: z.string().optional(),
  sessionSecret: z.string().default('change-this-in-production'),
  rateLimitWindowMs: z.number().default(60000),
  rateLimitMaxRequests: z.number().default(100),
});

export const WatermarkConfigSchema = z.object({
  enabled: z.boolean().default(false),
  watermarkPath: z.string().default('/data/watermark.png'),
  paddingX: z.number().min(0).max(500).default(60),
  paddingY: z.number().min(0).max(500).default(40),
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).default('bottom-right'),
});

export const UserLimitsConfigSchema = z.object({
  eraEmployeePhotoLimit: z.number().min(0).max(10000).default(100),
  defaultUserPhotoLimit: z.number().min(0).max(10000).default(20),
});

export const AppConfigSchema = z.object({
  timings: TimingsConfigSchema,
  ui: UIConfigSchema,
  camera: CameraConfigSchema,
  providers: ProviderConfigSchema,
  presets: PresetsConfigSchema,
  security: SecurityConfigSchema,
  watermark: WatermarkConfigSchema,
  userLimits: UserLimitsConfigSchema,
  features: z.object({
    enableWebSockets: z.boolean().default(false),
    enableDebugMode: z.boolean().default(false),
    enableMetrics: z.boolean().default(false),
    enablePhotoExport: z.boolean().default(true),
    enableBulkDelete: z.boolean().default(false),
    enableDeletePicture: z.boolean().default(true),
    showBeforeAfterInfo: z.boolean().default(true),
    showDownloadButtons: z.boolean().default(true),
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type TimingsConfig = z.infer<typeof TimingsConfigSchema>;
export type UIConfig = z.infer<typeof UIConfigSchema>;
export type CameraConfig = z.infer<typeof CameraConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type PresetsConfig = z.infer<typeof PresetsConfigSchema>;
export type PresetPrompt = z.infer<typeof PresetPromptSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type WatermarkConfig = z.infer<typeof WatermarkConfigSchema>;
export type UserLimitsConfig = z.infer<typeof UserLimitsConfigSchema>;

export const defaultConfig: AppConfig = {
  timings: TimingsConfigSchema.parse({}),
  ui: UIConfigSchema.parse({}),
  camera: CameraConfigSchema.parse({}),
  providers: ProviderConfigSchema.parse({}),
  presets: PresetsConfigSchema.parse({}),
  security: SecurityConfigSchema.parse({}),
  watermark: WatermarkConfigSchema.parse({}),
  userLimits: UserLimitsConfigSchema.parse({}),
  features: {
    enableWebSockets: false,
    enableDebugMode: false,
    enableMetrics: false,
    enablePhotoExport: true,
    enableBulkDelete: false,
    enableDeletePicture: true,
    showBeforeAfterInfo: true,
    showDownloadButtons: true,
  },
};