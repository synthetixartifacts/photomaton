import { z } from 'zod';
// Common schemas
export const PhotoIdSchema = z.string().uuid();
export const PresetSchema = z.enum(['toon-yellow', 'vampire', 'comic-ink']);
export const PhotoStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
// Request schemas
export const CaptureRequestSchema = z.object({
    preset: PresetSchema.optional()
});
export const TransformRequestSchema = z.object({
    photoId: PhotoIdSchema,
    preset: PresetSchema,
    options: z.object({
        strength: z.number().min(0).max(1).optional(),
        seed: z.number().optional()
    }).optional()
});
export const PhotoListQuerySchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
    status: PhotoStatusSchema.optional(),
    preset: PresetSchema.optional()
});
// Response schemas
export const CaptureResponseSchema = z.object({
    id: z.string().uuid(),
    status: z.enum(['captured', 'error']),
    originalPath: z.string().optional(),
    thumbnailPath: z.string().optional(),
    metadata: z.object({
        width: z.number(),
        height: z.number(),
        format: z.string(),
        size: z.number()
    }).optional()
});
export const TransformResponseSchema = z.object({
    photoId: z.string().uuid(),
    jobId: z.string().uuid(),
    status: z.enum(['processing', 'queued', 'error']),
    message: z.string().optional()
});
export const PhotoSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    preset: PresetSchema,
    originalPath: z.string(),
    transformedPath: z.string().nullable(),
    thumbnailPath: z.string().optional(),
    provider: z.string().nullable(),
    processingTime: z.number().nullable(),
    metadata: z.any().nullable(),
    status: PhotoStatusSchema
});
export const PhotoListResponseSchema = z.object({
    photos: z.array(PhotoSchema),
    cursor: z.string().nullable(),
    hasMore: z.boolean(),
    total: z.number()
});
export const ErrorResponseSchema = z.object({
    error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.any().optional()
    })
});
//# sourceMappingURL=api.js.map