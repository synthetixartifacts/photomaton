import { z } from 'zod';
export declare const PresetSchema: z.ZodEnum<["toon-yellow", "vampire", "comic-ink"]>;
export declare const PhotoStatusSchema: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
export declare const TransformRequestSchema: z.ZodObject<{
    photoId: z.ZodString;
    preset: z.ZodEnum<["toon-yellow", "vampire", "comic-ink"]>;
    options: z.ZodOptional<z.ZodObject<{
        strength: z.ZodOptional<z.ZodNumber>;
        seed: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        strength?: number | undefined;
        seed?: number | undefined;
    }, {
        strength?: number | undefined;
        seed?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    photoId: string;
    preset: "toon-yellow" | "vampire" | "comic-ink";
    options?: {
        strength?: number | undefined;
        seed?: number | undefined;
    } | undefined;
}, {
    photoId: string;
    preset: "toon-yellow" | "vampire" | "comic-ink";
    options?: {
        strength?: number | undefined;
        seed?: number | undefined;
    } | undefined;
}>;
export declare const CaptureResponseSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<["captured", "error"]>;
    originalPath: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "captured" | "error";
    id: string;
    originalPath?: string | undefined;
}, {
    status: "captured" | "error";
    id: string;
    originalPath?: string | undefined;
}>;
export declare const TransformResponseSchema: z.ZodObject<{
    jobId: z.ZodString;
    status: z.ZodEnum<["processing", "completed", "failed"]>;
    transformedPath: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "processing" | "completed" | "failed";
    jobId: string;
    error?: string | undefined;
    transformedPath?: string | undefined;
}, {
    status: "processing" | "completed" | "failed";
    jobId: string;
    error?: string | undefined;
    transformedPath?: string | undefined;
}>;
export declare const PhotoSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDate;
    preset: z.ZodEnum<["toon-yellow", "vampire", "comic-ink"]>;
    originalPath: z.ZodString;
    transformedPath: z.ZodOptional<z.ZodString>;
    provider: z.ZodOptional<z.ZodString>;
    processingTime: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    status: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
}, "strip", z.ZodTypeAny, {
    preset: "toon-yellow" | "vampire" | "comic-ink";
    status: "pending" | "processing" | "completed" | "failed";
    id: string;
    originalPath: string;
    createdAt: Date;
    transformedPath?: string | undefined;
    provider?: string | undefined;
    processingTime?: number | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    preset: "toon-yellow" | "vampire" | "comic-ink";
    status: "pending" | "processing" | "completed" | "failed";
    id: string;
    originalPath: string;
    createdAt: Date;
    transformedPath?: string | undefined;
    provider?: string | undefined;
    processingTime?: number | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const PhotoListQuerySchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["pending", "processing", "completed", "failed"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    status?: "pending" | "processing" | "completed" | "failed" | undefined;
    cursor?: string | undefined;
}, {
    status?: "pending" | "processing" | "completed" | "failed" | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
}>;
export declare const ErrorResponseSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
        retry: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: any;
        retry?: boolean | undefined;
    }, {
        code: string;
        message: string;
        details?: any;
        retry?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        details?: any;
        retry?: boolean | undefined;
    };
}, {
    error: {
        code: string;
        message: string;
        details?: any;
        retry?: boolean | undefined;
    };
}>;
export type TransformRequest = z.infer<typeof TransformRequestSchema>;
export type CaptureResponse = z.infer<typeof CaptureResponseSchema>;
export type TransformResponse = z.infer<typeof TransformResponseSchema>;
export type PhotoListQuery = z.infer<typeof PhotoListQuerySchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
//# sourceMappingURL=schemas.d.ts.map