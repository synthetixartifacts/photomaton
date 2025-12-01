import { z } from 'zod';

// PresetSchema now accepts any string, validation happens at the API level against database
export const PresetSchema = z.string().min(1).max(50).regex(/^[a-z0-9-_]+$/, 'Preset ID must contain only lowercase letters, numbers, hyphens, and underscores');

export const PhotoStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

export const TransformRequestSchema = z.object({
  photoId: z.string().uuid(),
  preset: PresetSchema,
  options: z.object({
    strength: z.number().min(0).max(1).optional(),
    seed: z.number().optional()
  }).optional()
});

export const CaptureResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['captured', 'error']),
  originalPath: z.string().optional()
});

export const TransformResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(['processing', 'completed', 'failed']),
  transformedPath: z.string().optional(),
  error: z.string().optional()
});

export const PhotoSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  preset: PresetSchema,
  originalPath: z.string(),
  transformedPath: z.string().optional(),
  provider: z.string().optional(),
  processingTime: z.number().optional(),
  metadata: z.record(z.any()).optional(),
  status: PhotoStatusSchema
});

export const PhotoListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  status: PhotoStatusSchema.optional()
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    retry: z.boolean().optional()
  })
});

export type TransformRequest = z.infer<typeof TransformRequestSchema>;
export type CaptureResponse = z.infer<typeof CaptureResponseSchema>;
export type TransformResponse = z.infer<typeof TransformResponseSchema>;
export type PhotoListQuery = z.infer<typeof PhotoListQuerySchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;