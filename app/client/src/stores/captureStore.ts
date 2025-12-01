import { create } from 'zustand';
import { PresetType } from '@photomaton/shared';
import { photoService } from '../services/PhotoService';

type CaptureState = 'idle' | 'countdown' | 'capturing' | 'processing' | 'displaying' | 'error';

interface ProcessingConfig {
  maxRetryAttempts: number;
  maxProcessingAgeMs: number;
  processingCheckIntervalMs: number;
}

interface CaptureStore {
  // State
  state: CaptureState;
  selectedPreset: PresetType;
  countdownValue: number;
  processingProgress: number;
  capturedImageUrl: string | null;
  transformedImageUrl: string | null;
  currentPhotoId: string | null;
  error: string | null;
  processingInterval: ReturnType<typeof setInterval> | null;
  processingStartTime: number | null;
  retryCount: number;

  // Actions
  setPreset: (preset: PresetType) => void;
  startCapture: () => void;
  startCountdown: (seconds: number) => void;
  capturePhoto: (blob: Blob, config?: ProcessingConfig) => Promise<void>;
  updateCountdown: (value: number) => void;
  checkTransformProgress: () => Promise<void>;
  displayResult: (transformedUrl: string) => void;
  reset: () => void;
  setError: (error: string) => void;
}

const initialState = {
  state: 'idle' as CaptureState,
  selectedPreset: 'toon-yellow' as PresetType,
  countdownValue: 0,
  processingProgress: 0,
  capturedImageUrl: null,
  transformedImageUrl: null,
  currentPhotoId: null,
  error: null,
  processingInterval: null,
  processingStartTime: null,
  retryCount: 0,
};

export const useCaptureStore = create<CaptureStore>((set, get) => ({
  ...initialState,

  setPreset: (preset) => set({ selectedPreset: preset }),

  startCapture: () => {
    const state = get();
    if (state.state !== 'idle') return;
    set({ state: 'countdown', error: null });
  },

  startCountdown: (seconds) => {
    set({ countdownValue: seconds, state: 'countdown' });
  },

  updateCountdown: (value) => {
    if (value <= 0) {
      set({ countdownValue: 0, state: 'capturing' });
    } else {
      set({ countdownValue: value });
    }
  },

  capturePhoto: async (blob, config) => {
    const { selectedPreset } = get();

    // Default config values
    const processingConfig = config || {
      maxRetryAttempts: 15,
      maxProcessingAgeMs: 120000, // 2 minutes
      processingCheckIntervalMs: 1000,
    };

    try {
      // Create local URL for preview
      const imageUrl = URL.createObjectURL(blob);
      const startTime = Date.now();

      set({
        state: 'processing',
        capturedImageUrl: imageUrl,
        processingProgress: 0,
        processingStartTime: startTime,
        retryCount: 0,
      });

      // Upload to server
      const response = await photoService.capturePhoto(blob, selectedPreset);
      set({ currentPhotoId: response.id });

      // Start polling for transformation with cutoff mechanism
      const interval = setInterval(async () => {
        const state = get();
        const currentRetryCount = state.retryCount + 1;
        const elapsedTime = Date.now() - (state.processingStartTime || startTime);

        // Calculate progress (cap at 90% until complete)
        const progress = Math.min((currentRetryCount / processingConfig.maxRetryAttempts) * 100, 90);
        set({ processingProgress: progress, retryCount: currentRetryCount });

        // Check cutoff conditions: max retries OR max time
        const hasExceededRetries = currentRetryCount >= processingConfig.maxRetryAttempts;
        const hasExceededTime = elapsedTime >= processingConfig.maxProcessingAgeMs;

        if (hasExceededRetries || hasExceededTime) {
          clearInterval(interval);
          console.error('Transform timeout - returning to default view:', {
            retries: currentRetryCount,
            elapsedMs: elapsedTime,
            maxRetries: processingConfig.maxRetryAttempts,
            maxTimeMs: processingConfig.maxProcessingAgeMs,
          });

          set({
            state: 'idle',
            error: null,
            processingInterval: null,
            processingProgress: 0,
            capturedImageUrl: null,
            transformedImageUrl: null,
            currentPhotoId: null,
            retryCount: 0,
            processingStartTime: null,
          });

          // Cleanup blob URL
          URL.revokeObjectURL(imageUrl);
          return;
        }

        try {
          const photos = await photoService.listPhotos();
          const currentPhoto = photos.photos.find((p: any) => p.id === response.id);

          if (currentPhoto?.transformedPath) {
            clearInterval(interval);
            set({
              transformedImageUrl: `/api/photos/${response.id}/transformed/${selectedPreset}`,
              state: 'displaying',
              processingProgress: 100,
              processingInterval: null,
            });
          } else if (currentPhoto?.status === 'failed') {
            // Photo failed on server, return to idle
            clearInterval(interval);
            console.error('Transform failed on server - returning to default view for photo:', response.id);

            set({
              state: 'idle',
              error: null,
              processingInterval: null,
              processingProgress: 0,
              capturedImageUrl: null,
              transformedImageUrl: null,
              currentPhotoId: null,
              retryCount: 0,
              processingStartTime: null,
            });

            // Cleanup blob URL
            URL.revokeObjectURL(imageUrl);
          }
        } catch (error) {
          console.error('Error checking transform status:', error);
          // Don't increment retry count for network errors, just log
        }
      }, processingConfig.processingCheckIntervalMs);

      set({ processingInterval: interval });
    } catch (error) {
      set({
        state: 'error',
        error: error instanceof Error ? error.message : 'Failed to capture photo',
      });
    }
  },

  checkTransformProgress: async () => {
    const { currentPhotoId } = get();
    if (!currentPhotoId) return;

    try {
      const photos = await photoService.listPhotos();
      const photo = photos.photos.find((p: any) => p.id === currentPhotoId);

      if (photo?.transformedPath) {
        set({
          transformedImageUrl: `/api/photos/${currentPhotoId}/transformed/${photo.preset}`,
          state: 'displaying',
          processingProgress: 100,
        });
      }
    } catch (error) {
      console.error('Error checking progress:', error);
    }
  },

  displayResult: (transformedUrl) => {
    set({
      transformedImageUrl: transformedUrl,
      state: 'displaying',
    });
  },

  reset: () => {
    const { capturedImageUrl, processingInterval, selectedPreset } = get();

    // Cleanup
    if (capturedImageUrl) {
      URL.revokeObjectURL(capturedImageUrl);
    }
    if (processingInterval) {
      clearInterval(processingInterval);
    }

    // Reset to initial state but preserve the selected preset
    set({ ...initialState, selectedPreset });
  },

  setError: (error) => {
    set({ state: 'error', error });
  },
}));