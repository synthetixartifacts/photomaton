import { z } from 'zod';
export declare const PhotoIdSchema: z.ZodString;
export declare const PresetSchema: z.ZodEnum<["toon-yellow", "vampire", "comic-ink"]>;
export declare const PhotoStatusSchema: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
export declare const CaptureRequestSchema: z.ZodObject<{
    preset: z.ZodOptional<z.ZodEnum<["toon-yellow", "vampire", "comic-ink"]>>;
}, "strip", z.ZodTypeAny, {
    preset?: "toon-yellow" | "vampire" | "comic-ink" | undefined;
}, {
    preset?: "toon-yellow" | "vampire" | "comic-ink" | undefined;
}>;
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
    preset: "toon-yellow" | "vampire" | "comic-ink";
    photoId: string;
    options?: {
        strength?: number | undefined;
        seed?: number | undefined;
    } | undefined;
}, {
    preset: "toon-yellow" | "vampire" | "comic-ink";
    photoId: string;
    options?: {
        strength?: number | undefined;
        seed?: number | undefined;
    } | undefined;
}>;
export declare const PhotoListQuerySchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["pending", "processing", "completed", "failed"]>>;
    preset: z.ZodOptional<z.ZodEnum<["toon-yellow", "vampire", "comic-ink"]>>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    status?: "pending" | "processing" | "completed" | "failed" | undefined;
    preset?: "toon-yellow" | "vampire" | "comic-ink" | undefined;
    cursor?: string | undefined;
}, {
    status?: "pending" | "processing" | "completed" | "failed" | undefined;
    preset?: "toon-yellow" | "vampire" | "comic-ink" | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
}>;
export declare const CaptureResponseSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodEnum<["captured", "error"]>;
    originalPath: z.ZodOptional<z.ZodString>;
    thumbnailPath: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
        format: z.ZodString;
        size: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        format: string;
        size: number;
    }, {
        width: number;
        height: number;
        format: string;
        size: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    status: "captured" | "error";
    id: string;
    originalPath?: string | undefined;
    thumbnailPath?: string | undefined;
    metadata?: {
        width: number;
        height: number;
        format: string;
        size: number;
    } | undefined;
}, {
    status: "captured" | "error";
    id: string;
    originalPath?: string | undefined;
    thumbnailPath?: string | undefined;
    metadata?: {
        width: number;
        height: number;
        format: string;
        size: number;
    } | undefined;
}>;
export declare const TransformResponseSchema: z.ZodObject<{
    photoId: z.ZodString;
    jobId: z.ZodString;
    status: z.ZodEnum<["processing", "queued", "error"]>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "processing" | "error" | "queued";
    photoId: string;
    jobId: string;
    message?: string | undefined;
}, {
    status: "processing" | "error" | "queued";
    photoId: string;
    jobId: string;
    message?: string | undefined;
}>;
export declare const PhotoSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodDate;
    preset: z.ZodEnum<["toon-yellow", "vampire", "comic-ink"]>;
    originalPath: z.ZodString;
    transformedPath: z.ZodNullable<z.ZodString>;
    thumbnailPath: z.ZodOptional<z.ZodString>;
    provider: z.ZodNullable<z.ZodString>;
    processingTime: z.ZodNullable<z.ZodNumber>;
    metadata: z.ZodNullable<z.ZodAny>;
    status: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "processing" | "completed" | "failed";
    id: string;
    preset: "toon-yellow" | "vampire" | "comic-ink";
    originalPath: string;
    createdAt: Date;
    transformedPath: string | null;
    provider: string | null;
    processingTime: number | null;
    thumbnailPath?: string | undefined;
    metadata?: any;
}, {
    status: "pending" | "processing" | "completed" | "failed";
    id: string;
    preset: "toon-yellow" | "vampire" | "comic-ink";
    originalPath: string;
    createdAt: Date;
    transformedPath: string | null;
    provider: string | null;
    processingTime: number | null;
    thumbnailPath?: string | undefined;
    metadata?: any;
}>;
export declare const PhotoListResponseSchema: z.ZodObject<{
    photos: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        createdAt: z.ZodDate;
        preset: z.ZodEnum<["toon-yellow", "vampire", "comic-ink"]>;
        originalPath: z.ZodString;
        transformedPath: z.ZodNullable<z.ZodString>;
        thumbnailPath: z.ZodOptional<z.ZodString>;
        provider: z.ZodNullable<z.ZodString>;
        processingTime: z.ZodNullable<z.ZodNumber>;
        metadata: z.ZodNullable<z.ZodAny>;
        status: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
    }, "strip", z.ZodTypeAny, {
        status: "pending" | "processing" | "completed" | "failed";
        id: string;
        preset: "toon-yellow" | "vampire" | "comic-ink";
        originalPath: string;
        createdAt: Date;
        transformedPath: string | null;
        provider: string | null;
        processingTime: number | null;
        thumbnailPath?: string | undefined;
        metadata?: any;
    }, {
        status: "pending" | "processing" | "completed" | "failed";
        id: string;
        preset: "toon-yellow" | "vampire" | "comic-ink";
        originalPath: string;
        createdAt: Date;
        transformedPath: string | null;
        provider: string | null;
        processingTime: number | null;
        thumbnailPath?: string | undefined;
        metadata?: any;
    }>, "many">;
    cursor: z.ZodNullable<z.ZodString>;
    hasMore: z.ZodBoolean;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    cursor: string | null;
    photos: {
        status: "pending" | "processing" | "completed" | "failed";
        id: string;
        preset: "toon-yellow" | "vampire" | "comic-ink";
        originalPath: string;
        createdAt: Date;
        transformedPath: string | null;
        provider: string | null;
        processingTime: number | null;
        thumbnailPath?: string | undefined;
        metadata?: any;
    }[];
    hasMore: boolean;
    total: number;
}, {
    cursor: string | null;
    photos: {
        status: "pending" | "processing" | "completed" | "failed";
        id: string;
        preset: "toon-yellow" | "vampire" | "comic-ink";
        originalPath: string;
        createdAt: Date;
        transformedPath: string | null;
        provider: string | null;
        processingTime: number | null;
        thumbnailPath?: string | undefined;
        metadata?: any;
    }[];
    hasMore: boolean;
    total: number;
}>;
export declare const ErrorResponseSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: any;
    }, {
        code: string;
        message: string;
        details?: any;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        details?: any;
    };
}, {
    error: {
        code: string;
        message: string;
        details?: any;
    };
}>;
export type CaptureRequest = z.infer<typeof CaptureRequestSchema>;
export type CaptureResponse = z.infer<typeof CaptureResponseSchema>;
export type TransformRequest = z.infer<typeof TransformRequestSchema>;
export type TransformResponse = z.infer<typeof TransformResponseSchema>;
export type PhotoListQuery = z.infer<typeof PhotoListQuerySchema>;
export type PhotoListResponse = z.infer<typeof PhotoListResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
//# sourceMappingURL=api.d.ts.map