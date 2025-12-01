export const CAPTURE_TIMINGS = {
  // Countdown duration in seconds
  COUNTDOWN_SECONDS: 5,

  // How long to show the transformed image after processing (in seconds)
  DISPLAY_TRANSFORMED_SECONDS: 15,

  // Processing check interval (in milliseconds)
  PROCESSING_CHECK_INTERVAL: 1000,

  // Maximum processing time before timeout (in seconds)
  MAX_PROCESSING_TIME: 30,

  // Maximum retry attempts for polling
  MAX_RETRY_ATTEMPTS: 15,

  // Maximum age of a photo in processing state (2 minutes in milliseconds)
  MAX_PROCESSING_AGE_MS: 2 * 60 * 1000,

  // Animation durations (in milliseconds)
  ROTATION_ANIMATION_DURATION: 600,
  FADE_ANIMATION_DURATION: 300,
};

export const UI_CONFIG = {
  // Countdown overlay background opacity (0-1)
  COUNTDOWN_BACKGROUND_OPACITY: 0.8,

  // Processing spinner size
  SPINNER_SIZE: 'w-16 h-16',
};