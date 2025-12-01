import type { PresetType } from './types.js';
export declare const PRESETS: Record<PresetType, {
    name: string;
    description: string;
    prompt: string;
}>;
export declare const FILE_LIMITS: {
    MAX_SIZE: number;
    ALLOWED_TYPES: string[];
    ALLOWED_EXTENSIONS: string[];
};
export declare const COUNTDOWN_SECONDS = 10;
export declare const DISPLAY_DURATION_MS = 10000;
export declare const API_ENDPOINTS: {
    CAPTURE: string;
    TRANSFORM: string;
    PHOTOS: string;
    HEALTH: string;
};
export declare const ERROR_CODES: {
    VALIDATION_ERROR: string;
    PROVIDER_ERROR: string;
    FILE_ERROR: string;
    DATABASE_ERROR: string;
    INTERNAL_ERROR: string;
    RATE_LIMIT_ERROR: string;
};
//# sourceMappingURL=constants.d.ts.map