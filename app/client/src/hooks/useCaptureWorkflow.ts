import { useEffect, useCallback } from 'react';
import { useCaptureStore } from '../stores/captureStore';
import { usePhotoStore } from '../stores/photoStore';
import { useTimings } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';

export const useCaptureWorkflow = () => {
  const timings = useTimings();
  const {
    state,
    selectedPreset,
    countdownValue,
    capturedImageUrl,
    transformedImageUrl,
    error,
    startCapture,
    updateCountdown,
    capturePhoto,
    setPreset,
    reset,
  } = useCaptureStore();

  const { fetchPhotos } = usePhotoStore();
  const { refreshPhotoLimitInfo } = useAuth();

  // Start capture workflow
  const handleStartCapture = useCallback(() => {
    if (state !== 'idle') return;
    startCapture();
  }, [state, startCapture]);

  // Handle countdown
  useEffect(() => {
    if (state === 'countdown') {
      // Initialize countdown value when starting
      if (countdownValue === 0) {
        console.log('Initializing countdown with:', timings.countdownSeconds);
        updateCountdown(timings.countdownSeconds);
      }

      // Start countdown interval
      const interval = setInterval(() => {
        const currentCount = useCaptureStore.getState().countdownValue;
        if (currentCount > 1) {
          updateCountdown(currentCount - 1);
        } else if (currentCount === 1) {
          updateCountdown(0);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [state]); // Only depend on state change

  // Handle image capture
  const handleImageCapture = useCallback(async (blob: Blob) => {
    await capturePhoto(blob, {
      maxRetryAttempts: timings.maxRetryAttempts,
      maxProcessingAgeMs: timings.maxProcessingAgeMs,
      processingCheckIntervalMs: timings.processingCheckIntervalMs,
    });
  }, [capturePhoto, timings]);

  // Handle completion
  const handleComplete = useCallback(() => {
    reset();
    fetchPhotos(true);
    // Refresh photo limit info to update remaining count in UI
    refreshPhotoLimitInfo();
  }, [reset, fetchPhotos, refreshPhotoLimitInfo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
      }
    };
  }, [capturedImageUrl]);

  return {
    // State
    captureState: state,
    selectedPreset,
    countdownValue,
    capturedImageUrl,
    transformedImageUrl,
    error,

    // Actions
    startCapture: handleStartCapture,
    captureImage: handleImageCapture,
    setPreset,
    complete: handleComplete,
    reset,

    // Computed
    isIdle: state === 'idle',
    isCountingDown: state === 'countdown',
    isCapturing: state === 'capturing',
    isProcessing: state === 'processing',
    isDisplaying: state === 'displaying',
    hasError: state === 'error',
  };
};