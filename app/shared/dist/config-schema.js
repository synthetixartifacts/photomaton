import { z } from 'zod';
export const TimingsConfigSchema = z.object({
    countdownSeconds: z.number().min(1).max(10).default(5),
    displayTransformedSeconds: z.number().min(5).max(60).default(15),
    processingCheckIntervalMs: z.number().min(500).max(5000).default(1000),
    maxProcessingTimeSeconds: z.number().min(10).max(120).default(30),
    rotationAnimationMs: z.number().min(100).max(2000).default(600),
    fadeAnimationMs: z.number().min(100).max(1000).default(300),
});
export const UIConfigSchema = z.object({
    countdownBackgroundOpacity: z.number().min(0).max(1).default(0.8),
    spinnerSize: z.string().default('w-16 h-16'),
    enableCarouselAutoRefresh: z.boolean().default(true),
    carouselRefreshIntervalMs: z.number().min(1000).max(30000).default(5000),
    maxPhotosInCarousel: z.number().min(10).max(100).default(50),
});
export const ProviderConfigSchema = z.object({
    activeProvider: z.string().default('mock'),
    availableProviders: z.array(z.string()).default(['mock', 'gemini-imagen']),
    mockDelayMs: z.number().min(0).max(10000).default(2000),
});
export const PresetsConfigSchema = z.object({
    availablePresets: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        enabled: z.boolean(),
        prompt: z.string(),
        icon: z.string().optional(),
    })).default([
        {
            id: 'toon-yellow',
            name: 'Yellow Toon',
            description: 'Cartoon style with yellow theme',
            enabled: true,
            prompt: 'Transform to cartoon style, vibrant yellow color scheme, flat colors, simple shapes, cheerful mood',
            icon: '🎨'
        },
        {
            id: 'vampire',
            name: 'Vampire',
            description: 'Gothic vampire portrait',
            enabled: true,
            prompt: 'Transform to vampire portrait, gothic aesthetic, pale skin, dark atmosphere, mysterious, no gore or blood',
            icon: '🧛'
        },
        {
            id: 'comic-ink',
            name: 'Comic Ink',
            description: 'Comic book art style',
            enabled: true,
            prompt: 'Transform to comic book art style, bold ink lines, halftone pattern, dramatic shadows, pop art colors',
            icon: '💥'
        }
    ]),
    defaultPreset: z.string().default('toon-yellow'),
});
export const SecurityConfigSchema = z.object({
    enableAdminAuth: z.boolean().default(false),
    adminUsername: z.string().optional(),
    adminPasswordHash: z.string().optional(),
    sessionSecret: z.string().default('change-this-in-production'),
    rateLimitWindowMs: z.number().default(60000),
    rateLimitMaxRequests: z.number().default(100),
});
export const AppConfigSchema = z.object({
    timings: TimingsConfigSchema,
    ui: UIConfigSchema,
    providers: ProviderConfigSchema,
    presets: PresetsConfigSchema,
    security: SecurityConfigSchema,
    features: z.object({
        enableWebSockets: z.boolean().default(false),
        enableDebugMode: z.boolean().default(false),
        enableMetrics: z.boolean().default(false),
        enablePhotoExport: z.boolean().default(true),
        enableBulkDelete: z.boolean().default(false),
    }),
});
export const defaultConfig = {
    timings: TimingsConfigSchema.parse({}),
    ui: UIConfigSchema.parse({}),
    providers: ProviderConfigSchema.parse({}),
    presets: PresetsConfigSchema.parse({}),
    security: SecurityConfigSchema.parse({}),
    features: {
        enableWebSockets: false,
        enableDebugMode: false,
        enableMetrics: false,
        enablePhotoExport: true,
        enableBulkDelete: false,
    },
};
//# sourceMappingURL=config-schema.js.map