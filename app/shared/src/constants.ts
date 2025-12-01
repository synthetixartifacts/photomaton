// Removed hardcoded presets - using database only
// Legacy presets moved to database via migrations

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