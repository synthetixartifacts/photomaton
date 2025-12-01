export type PresetType = 'toon-yellow' | 'vampire' | 'comic-ink';
export interface Photo {
    id: string;
    createdAt: Date;
    preset: PresetType;
    originalPath: string;
    transformedPath?: string;
    provider?: string;
    processingTime?: number;
    metadata?: Record<string, any>;
    status: PhotoStatus;
}
export type PhotoStatus = 'pending' | 'processing' | 'completed' | 'failed';
export interface TransformInput {
    photoId?: string;
    originalPath?: string;
    outputPath?: string;
    preset: PresetType;
    buffer?: Buffer;
    options?: TransformOptions;
}
export interface TransformOptions {
    strength?: number;
    seed?: number;
}
export interface TransformResult {
    transformedPath?: string;
    buffer: Buffer;
    provider: string;
    duration: number;
    meta?: Record<string, any>;
}
export interface ProviderCapabilities {
    maxImageSize: number;
    supportedFormats: string[];
    supportedPresets: PresetType[];
    estimatedProcessingTime: {
        min: number;
        max: number;
    };
}
export interface ValidationResult {
    valid: boolean;
    errors?: string[];
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: ApiError;
}
export interface ApiError {
    code: string;
    message: string;
    details?: any;
    retry?: boolean;
}
//# sourceMappingURL=types.d.ts.map