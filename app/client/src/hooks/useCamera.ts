import { useRef, useState, useEffect, useCallback } from 'react';

interface UseCameraOptions {
  width?: number;
  height?: number;
  facingMode?: 'user' | 'environment';
  deviceId?: string;
}

export function useCamera(options: UseCameraOptions = {}) {
  const {
    width = 1920,
    height = 1080,
    facingMode = 'user',
    deviceId
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [pendingStream, setPendingStream] = useState<MediaStream | null>(null);

  // Handle video element when it becomes available
  useEffect(() => {
    if (videoRef.current && pendingStream && !stream) {
      console.log('Video element now available, setting up pending stream');

      const setupVideo = async () => {
        try {
          videoRef.current!.srcObject = pendingStream;

          await new Promise<void>((resolve) => {
            const video = videoRef.current!;
            if (video.readyState >= 2) {
              resolve();
            } else {
              video.onloadedmetadata = () => resolve();
            }
          });

          await videoRef.current!.play();
          console.log('✅ Video playback started successfully');

          setStream(pendingStream);
          setHasPermission(true);
          setPendingStream(null);
        } catch (err) {
          console.error('Failed to setup video:', err);
        }
      };

      setupVideo();
    }
  }, [videoRef.current, pendingStream, stream]);

  useEffect(() => {
    let mounted = true;
    let mediaStream: MediaStream | null = null;

    const initCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('Camera initialization starting...', {
          isSecureContext: window.isSecureContext,
          location: window.location.origin,
          hasMediaDevices: !!navigator.mediaDevices,
          hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia
        });

        // Check if we're in a secure context (required for getUserMedia)
        if (!window.isSecureContext) {
          throw new Error('Camera requires HTTPS or localhost. Current context is not secure.');
        }

        // Check if mediaDevices is available
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera API not available in this browser');
        }

        // Try with ideal constraints first
        let constraints: MediaStreamConstraints = {
          video: deviceId ? {
            deviceId: { exact: deviceId },
            width: { ideal: width },
            height: { ideal: height }
          } : {
            width: { ideal: width },
            height: { ideal: height },
            facingMode
          },
          audio: false
        };

        try {
          console.log('Requesting camera with constraints:', constraints);
          mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('Camera access granted!', {
            tracks: mediaStream.getTracks().map(t => ({
              kind: t.kind,
              label: t.label,
              enabled: t.enabled,
              readyState: t.readyState
            }))
          });
        } catch (initialError) {
          console.warn('Failed with ideal constraints:', initialError);
          console.warn('Error details:', {
            name: (initialError as any)?.name,
            message: (initialError as any)?.message,
            constraint: (initialError as any)?.constraint
          });

          // Fallback to basic video constraint
          constraints = { video: true, audio: false };
          console.log('Retrying with basic constraints:', constraints);

          try {
            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Camera access granted with basic constraints');
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            throw fallbackError;
          }
        }

        if (mounted && mediaStream) {
          if (videoRef.current) {
            // Video element is already available, set up immediately
            console.log('Setting up video element immediately...');

            videoRef.current.srcObject = mediaStream;

            await new Promise<void>((resolve) => {
              const video = videoRef.current!;
              if (video.readyState >= 2) {
                resolve();
              } else {
                video.onloadedmetadata = () => resolve();
              }
            });

            await videoRef.current.play();
            console.log('✅ Video playback started successfully');

            setStream(mediaStream);
            setHasPermission(true);
          } else {
            // Video element not ready yet, save stream for later
            console.log('Video element not ready, saving stream for later setup');
            setPendingStream(mediaStream);
          }
        }
      } catch (err) {
        console.error('Camera access error:', err);
        console.error('Error details:', {
          name: (err as any)?.name,
          message: (err as any)?.message,
          constraint: (err as any)?.constraint,
          stack: (err as any)?.stack
        });

        if (mounted) {
          let errorMessage = 'Failed to access camera';

          if (err instanceof Error) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              errorMessage = 'Camera permission denied. Please allow camera access and refresh.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
              errorMessage = 'No camera found. Please connect a camera and refresh.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
              errorMessage = 'Camera is in use by another application.';
            } else if (err.name === 'OverconstrainedError') {
              errorMessage = 'Camera does not support the requested settings.';
            } else if (err.name === 'TypeError') {
              errorMessage = 'Camera API not supported in this browser.';
            } else {
              errorMessage = err.message;
            }
          }

          setError(errorMessage);
          setHasPermission(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (pendingStream) {
        pendingStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [width, height, facingMode, deviceId]);

  const capture = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current) {
        reject(new Error('Video element not ready'));
        return;
      }

      const video = videoRef.current;

      // Check if video has loaded metadata and has dimensions
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        reject(new Error('Video not ready for capture'));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      try {
        // Apply horizontal flip to match the mirrored video preview
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to capture image'));
            }
          },
          'image/jpeg',
          0.9
        );
      } catch (error) {
        reject(new Error(`Canvas capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const switchCamera = useCallback(async () => {
    stopCamera();
    // Re-trigger useEffect by changing state (would need additional state for facingMode toggle)
  }, [stopCamera]);

  return {
    videoRef,
    stream,
    isLoading,
    error,
    hasPermission,
    capture,
    stopCamera,
    switchCamera
  };
}