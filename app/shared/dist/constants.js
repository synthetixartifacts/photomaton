export const PRESETS = {
    'toon-yellow': {
        name: 'Toon Yellow',
        description: 'Cartoon style with bright, flat colors',
        prompt: 'cartoon style, flat colors, simple shapes, yellow tones, animated character'
    },
    'vampire': {
        name: 'Vampire',
        description: 'Gothic portrait with pale skin tones',
        prompt: 'vampire portrait, gothic, pale skin, dark atmosphere, no gore, elegant'
    },
    'comic-ink': {
        name: 'Comic Ink',
        description: 'Comic book art with ink lines',
        prompt: 'comic book art, ink lines, halftone pattern, bold outlines, graphic novel style'
    }
};
export const FILE_LIMITS = {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp']
};
export const COUNTDOWN_SECONDS = 10;
export const DISPLAY_DURATION_MS = 10000; // 10 seconds
export const API_ENDPOINTS = {
    CAPTURE: '/api/capture',
    TRANSFORM: '/api/transform',
    PHOTOS: '/api/photos',
    HEALTH: '/api/healthz'
};
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    PROVIDER_ERROR: 'PROVIDER_ERROR',
    FILE_ERROR: 'FILE_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR'
};
//# sourceMappingURL=constants.js.map