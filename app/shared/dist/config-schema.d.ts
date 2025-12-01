import { z } from 'zod';
export declare const TimingsConfigSchema: z.ZodObject<{
    countdownSeconds: z.ZodDefault<z.ZodNumber>;
    displayTransformedSeconds: z.ZodDefault<z.ZodNumber>;
    processingCheckIntervalMs: z.ZodDefault<z.ZodNumber>;
    maxProcessingTimeSeconds: z.ZodDefault<z.ZodNumber>;
    rotationAnimationMs: z.ZodDefault<z.ZodNumber>;
    fadeAnimationMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    countdownSeconds: number;
    displayTransformedSeconds: number;
    processingCheckIntervalMs: number;
    maxProcessingTimeSeconds: number;
    rotationAnimationMs: number;
    fadeAnimationMs: number;
}, {
    countdownSeconds?: number | undefined;
    displayTransformedSeconds?: number | undefined;
    processingCheckIntervalMs?: number | undefined;
    maxProcessingTimeSeconds?: number | undefined;
    rotationAnimationMs?: number | undefined;
    fadeAnimationMs?: number | undefined;
}>;
export declare const UIConfigSchema: z.ZodObject<{
    countdownBackgroundOpacity: z.ZodDefault<z.ZodNumber>;
    spinnerSize: z.ZodDefault<z.ZodString>;
    enableCarouselAutoRefresh: z.ZodDefault<z.ZodBoolean>;
    carouselRefreshIntervalMs: z.ZodDefault<z.ZodNumber>;
    maxPhotosInCarousel: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    countdownBackgroundOpacity: number;
    spinnerSize: string;
    enableCarouselAutoRefresh: boolean;
    carouselRefreshIntervalMs: number;
    maxPhotosInCarousel: number;
}, {
    countdownBackgroundOpacity?: number | undefined;
    spinnerSize?: string | undefined;
    enableCarouselAutoRefresh?: boolean | undefined;
    carouselRefreshIntervalMs?: number | undefined;
    maxPhotosInCarousel?: number | undefined;
}>;
export declare const ProviderConfigSchema: z.ZodObject<{
    activeProvider: z.ZodDefault<z.ZodString>;
    availableProviders: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    mockDelayMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    activeProvider: string;
    availableProviders: string[];
    mockDelayMs: number;
}, {
    activeProvider?: string | undefined;
    availableProviders?: string[] | undefined;
    mockDelayMs?: number | undefined;
}>;
export declare const PresetsConfigSchema: z.ZodObject<{
    availablePresets: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        enabled: z.ZodBoolean;
        prompt: z.ZodString;
        icon: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        prompt: string;
        icon?: string | undefined;
    }, {
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        prompt: string;
        icon?: string | undefined;
    }>, "many">>;
    defaultPreset: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    availablePresets: {
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        prompt: string;
        icon?: string | undefined;
    }[];
    defaultPreset: string;
}, {
    availablePresets?: {
        id: string;
        name: string;
        description: string;
        enabled: boolean;
        prompt: string;
        icon?: string | undefined;
    }[] | undefined;
    defaultPreset?: string | undefined;
}>;
export declare const SecurityConfigSchema: z.ZodObject<{
    enableAdminAuth: z.ZodDefault<z.ZodBoolean>;
    adminUsername: z.ZodOptional<z.ZodString>;
    adminPasswordHash: z.ZodOptional<z.ZodString>;
    sessionSecret: z.ZodDefault<z.ZodString>;
    rateLimitWindowMs: z.ZodDefault<z.ZodNumber>;
    rateLimitMaxRequests: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    enableAdminAuth: boolean;
    sessionSecret: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    adminUsername?: string | undefined;
    adminPasswordHash?: string | undefined;
}, {
    enableAdminAuth?: boolean | undefined;
    adminUsername?: string | undefined;
    adminPasswordHash?: string | undefined;
    sessionSecret?: string | undefined;
    rateLimitWindowMs?: number | undefined;
    rateLimitMaxRequests?: number | undefined;
}>;
export declare const AppConfigSchema: z.ZodObject<{
    timings: z.ZodObject<{
        countdownSeconds: z.ZodDefault<z.ZodNumber>;
        displayTransformedSeconds: z.ZodDefault<z.ZodNumber>;
        processingCheckIntervalMs: z.ZodDefault<z.ZodNumber>;
        maxProcessingTimeSeconds: z.ZodDefault<z.ZodNumber>;
        rotationAnimationMs: z.ZodDefault<z.ZodNumber>;
        fadeAnimationMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        countdownSeconds: number;
        displayTransformedSeconds: number;
        processingCheckIntervalMs: number;
        maxProcessingTimeSeconds: number;
        rotationAnimationMs: number;
        fadeAnimationMs: number;
    }, {
        countdownSeconds?: number | undefined;
        displayTransformedSeconds?: number | undefined;
        processingCheckIntervalMs?: number | undefined;
        maxProcessingTimeSeconds?: number | undefined;
        rotationAnimationMs?: number | undefined;
        fadeAnimationMs?: number | undefined;
    }>;
    ui: z.ZodObject<{
        countdownBackgroundOpacity: z.ZodDefault<z.ZodNumber>;
        spinnerSize: z.ZodDefault<z.ZodString>;
        enableCarouselAutoRefresh: z.ZodDefault<z.ZodBoolean>;
        carouselRefreshIntervalMs: z.ZodDefault<z.ZodNumber>;
        maxPhotosInCarousel: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        countdownBackgroundOpacity: number;
        spinnerSize: string;
        enableCarouselAutoRefresh: boolean;
        carouselRefreshIntervalMs: number;
        maxPhotosInCarousel: number;
    }, {
        countdownBackgroundOpacity?: number | undefined;
        spinnerSize?: string | undefined;
        enableCarouselAutoRefresh?: boolean | undefined;
        carouselRefreshIntervalMs?: number | undefined;
        maxPhotosInCarousel?: number | undefined;
    }>;
    providers: z.ZodObject<{
        activeProvider: z.ZodDefault<z.ZodString>;
        availableProviders: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        mockDelayMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        activeProvider: string;
        availableProviders: string[];
        mockDelayMs: number;
    }, {
        activeProvider?: string | undefined;
        availableProviders?: string[] | undefined;
        mockDelayMs?: number | undefined;
    }>;
    presets: z.ZodObject<{
        availablePresets: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodString;
            enabled: z.ZodBoolean;
            prompt: z.ZodString;
            icon: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            description: string;
            enabled: boolean;
            prompt: string;
            icon?: string | undefined;
        }, {
            id: string;
            name: string;
            description: string;
            enabled: boolean;
            prompt: string;
            icon?: string | undefined;
        }>, "many">>;
        defaultPreset: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        availablePresets: {
            id: string;
            name: string;
            description: string;
            enabled: boolean;
            prompt: string;
            icon?: string | undefined;
        }[];
        defaultPreset: string;
    }, {
        availablePresets?: {
            id: string;
            name: string;
            description: string;
            enabled: boolean;
            prompt: string;
            icon?: string | undefined;
        }[] | undefined;
        defaultPreset?: string | undefined;
    }>;
    security: z.ZodObject<{
        enableAdminAuth: z.ZodDefault<z.ZodBoolean>;
        adminUsername: z.ZodOptional<z.ZodString>;
        adminPasswordHash: z.ZodOptional<z.ZodString>;
        sessionSecret: z.ZodDefault<z.ZodString>;
        rateLimitWindowMs: z.ZodDefault<z.ZodNumber>;
        rateLimitMaxRequests: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enableAdminAuth: boolean;
        sessionSecret: string;
        rateLimitWindowMs: number;
        rateLimitMaxRequests: number;
        adminUsername?: string | undefined;
        adminPasswordHash?: string | undefined;
    }, {
        enableAdminAuth?: boolean | undefined;
        adminUsername?: string | undefined;
        adminPasswordHash?: string | undefined;
        sessionSecret?: string | undefined;
        rateLimitWindowMs?: number | undefined;
        rateLimitMaxRequests?: number | undefined;
    }>;
    features: z.ZodObject<{
        enableWebSockets: z.ZodDefault<z.ZodBoolean>;
        enableDebugMode: z.ZodDefault<z.ZodBoolean>;
        enableMetrics: z.ZodDefault<z.ZodBoolean>;
        enablePhotoExport: z.ZodDefault<z.ZodBoolean>;
        enableBulkDelete: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enableWebSockets: boolean;
        enableDebugMode: boolean;
        enableMetrics: boolean;
        enablePhotoExport: boolean;
        enableBulkDelete: boolean;
    }, {
        enableWebSockets?: boolean | undefined;
        enableDebugMode?: boolean | undefined;
        enableMetrics?: boolean | undefined;
        enablePhotoExport?: boolean | undefined;
        enableBulkDelete?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    timings: {
        countdownSeconds: number;
        displayTransformedSeconds: number;
        processingCheckIntervalMs: number;
        maxProcessingTimeSeconds: number;
        rotationAnimationMs: number;
        fadeAnimationMs: number;
    };
    ui: {
        countdownBackgroundOpacity: number;
        spinnerSize: string;
        enableCarouselAutoRefresh: boolean;
        carouselRefreshIntervalMs: number;
        maxPhotosInCarousel: number;
    };
    providers: {
        activeProvider: string;
        availableProviders: string[];
        mockDelayMs: number;
    };
    presets: {
        availablePresets: {
            id: string;
            name: string;
            description: string;
            enabled: boolean;
            prompt: string;
            icon?: string | undefined;
        }[];
        defaultPreset: string;
    };
    security: {
        enableAdminAuth: boolean;
        sessionSecret: string;
        rateLimitWindowMs: number;
        rateLimitMaxRequests: number;
        adminUsername?: string | undefined;
        adminPasswordHash?: string | undefined;
    };
    features: {
        enableWebSockets: boolean;
        enableDebugMode: boolean;
        enableMetrics: boolean;
        enablePhotoExport: boolean;
        enableBulkDelete: boolean;
    };
}, {
    timings: {
        countdownSeconds?: number | undefined;
        displayTransformedSeconds?: number | undefined;
        processingCheckIntervalMs?: number | undefined;
        maxProcessingTimeSeconds?: number | undefined;
        rotationAnimationMs?: number | undefined;
        fadeAnimationMs?: number | undefined;
    };
    ui: {
        countdownBackgroundOpacity?: number | undefined;
        spinnerSize?: string | undefined;
        enableCarouselAutoRefresh?: boolean | undefined;
        carouselRefreshIntervalMs?: number | undefined;
        maxPhotosInCarousel?: number | undefined;
    };
    providers: {
        activeProvider?: string | undefined;
        availableProviders?: string[] | undefined;
        mockDelayMs?: number | undefined;
    };
    presets: {
        availablePresets?: {
            id: string;
            name: string;
            description: string;
            enabled: boolean;
            prompt: string;
            icon?: string | undefined;
        }[] | undefined;
        defaultPreset?: string | undefined;
    };
    security: {
        enableAdminAuth?: boolean | undefined;
        adminUsername?: string | undefined;
        adminPasswordHash?: string | undefined;
        sessionSecret?: string | undefined;
        rateLimitWindowMs?: number | undefined;
        rateLimitMaxRequests?: number | undefined;
    };
    features: {
        enableWebSockets?: boolean | undefined;
        enableDebugMode?: boolean | undefined;
        enableMetrics?: boolean | undefined;
        enablePhotoExport?: boolean | undefined;
        enableBulkDelete?: boolean | undefined;
    };
}>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
export type TimingsConfig = z.infer<typeof TimingsConfigSchema>;
export type UIConfig = z.infer<typeof UIConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type PresetsConfig = z.infer<typeof PresetsConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export declare const defaultConfig: AppConfig;
//# sourceMappingURL=config-schema.d.ts.map