import { useEffect, useState, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useCameraConfig } from '../contexts/ConfigContext';

interface CameraFeedProps {
  onCapture?: (blob: Blob) => void;
  frozen?: boolean;
  className?: string;
}

export function CameraFeed({ onCapture, frozen = false, className = '' }: CameraFeedProps) {
  // useCameraConfig now includes user preferences automatically
  const cameraConfig = useCameraConfig();

  const { videoRef, isLoading, error, hasPermission, capture, stream } = useCamera({
    deviceId: cameraConfig.deviceId,
    width: cameraConfig.width,
    height: cameraConfig.height,
    facingMode: cameraConfig.facingMode
  });
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('CameraFeed state:', {
      isLoading,
      hasPermission,
      hasStream: !!stream,
      hasVideoRef: !!videoRef.current,
      videoReadyState: videoRef.current?.readyState,
      error
    });
  }, [isLoading, hasPermission, stream, error]);

  useEffect(() => {
    if (!frozen) {
      setCapturedImage(null);
    }
  }, [frozen]);

  const handleCapture = useCallback(async () => {
    try {
      console.log('Starting capture...');
      const blob = await capture();
      console.log('Capture successful, blob size:', blob.size);

      // Create a URL for the captured image to display
      const imageUrl = URL.createObjectURL(blob);
      setCapturedImage(imageUrl);

      if (onCapture) {
        onCapture(blob);
      }
    } catch (err) {
      console.error('Capture failed:', err);
      // Don't prevent the UI from recovering - just log the error
    }
  }, [capture, onCapture]);

  // Auto-capture when frozen state changes to true
  useEffect(() => {
    if (frozen && !capturedImage && hasPermission) {
      console.log('Auto-capturing due to frozen state');
      handleCapture();
    }
  }, [frozen, capturedImage, hasPermission, handleCapture]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-zinc-400">Initializing camera...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800 rounded-lg ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 font-semibold mb-2">Camera Error</p>
          <p className="text-zinc-400 text-sm">{error}</p>
          {!hasPermission && (
            <p className="text-zinc-500 text-xs mt-4">
              Please allow camera access in your browser settings
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black rounded-lg ${className}`}>
      {frozen && capturedImage ? (
        <img
          src={capturedImage}
          alt="Captured"
          className="w-full h-full object-contain"
        />
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain transform scale-x-[-1]"
          onLoadedMetadata={(e) => {
            console.log('Video metadata loaded', {
              width: e.currentTarget.videoWidth,
              height: e.currentTarget.videoHeight
            });
          }}
          onPlay={() => console.log('Video started playing')}
          onError={(e) => console.error('Video element error:', e)}
        />
      )}

      {!hasPermission && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
          <p className="text-zinc-400">Waiting for camera permission...</p>
        </div>
      )}
    </div>
  );
}