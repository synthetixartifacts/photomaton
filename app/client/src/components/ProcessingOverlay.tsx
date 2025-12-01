import { useState, useEffect } from 'react';
import { useTimings } from '../contexts/ConfigContext';
import { usePresets } from '../hooks/usePresets';
import { CheckCircle, Clock, X } from 'lucide-react';

interface ProcessingOverlayProps {
  capturedImageUrl: string | null;
  transformedImageUrl: string | null;
  isProcessing: boolean;
  selectedPreset: string;
  onComplete: () => void;
  onCountdownUpdate?: (remainingTime: number | null) => void;
  isMobile?: boolean;
}

export function ProcessingOverlay({
  capturedImageUrl,
  transformedImageUrl,
  isProcessing,
  selectedPreset,
  onComplete,
  onCountdownUpdate,
  isMobile = false
}: ProcessingOverlayProps) {
  const timings = useTimings();
  const { getPresetName } = usePresets();
  const [showTransformed, setShowTransformed] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timings.displayTransformedSeconds);

  // Handle transition to transformed image
  useEffect(() => {
    if (transformedImageUrl && !isProcessing) {
      setTimeout(() => {
        setShowTransformed(true);
      }, 100);
      setRemainingTime(timings.displayTransformedSeconds);
    }
  }, [transformedImageUrl, isProcessing, timings.displayTransformedSeconds]);

  // Countdown timer for transformed image display
  useEffect(() => {
    if (showTransformed && remainingTime > 0) {
      const timer = setTimeout(() => {
        setRemainingTime(remainingTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showTransformed && remainingTime === 0) {
      onComplete();
      setShowTransformed(false);
    }
    return undefined;
  }, [showTransformed, remainingTime, onComplete]);

  // Update countdown callback when showing transformed image
  useEffect(() => {
    if (onCountdownUpdate) {
      if (showTransformed) {
        onCountdownUpdate(remainingTime);
      } else {
        onCountdownUpdate(null);
      }
    }
  }, [showTransformed, remainingTime, onCountdownUpdate]);

  // Handle ESC key press to close the overlay
  useEffect(() => {
    if (!showTransformed) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setShowTransformed(false);
        onComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTransformed, onComplete]);

  if (!capturedImageUrl && !transformedImageUrl) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-30">
      <div className="relative w-full h-full overflow-hidden">
        {/* Container for flip animation */}
        <div
          className="relative w-full h-full preserve-3d transition-transform"
          style={{
            transformStyle: 'preserve-3d',
            transform: showTransformed ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: `transform ${timings.rotationAnimationMs}ms cubic-bezier(0.4, 0.0, 0.2, 1)`
          }}
        >
          {/* Front side - captured image */}
          <div
            className="absolute inset-0 backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {capturedImageUrl && (
              <img
                src={capturedImageUrl}
                alt="Captured"
                className="w-full h-full object-contain"
              />
            )}

            {/* Processing overlay - simplified */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} border-2 border-zinc-400 border-t-white rounded-full animate-spin mx-auto mb-3`} />
                  <p className={`${isMobile ? 'text-base' : 'text-lg'} font-medium`}>Processing...</p>
                  <p className="text-sm text-zinc-400 mt-1">{getPresetName(selectedPreset)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Back side - transformed image */}
          <div
            className="absolute inset-0 backface-hidden"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {transformedImageUrl && (
              <>
                <img
                  src={transformedImageUrl}
                  alt="Transformed"
                  className="w-full h-full object-contain"
                />

                {/* Simplified success indicator - zinc-based, not green */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
                  <div className={`bg-zinc-900/90 text-white ${isMobile ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-lg flex items-center gap-3 border border-zinc-700`}>
                    <div className="flex items-center gap-1.5 text-green-400">
                      <CheckCircle className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
                      <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Done</span>
                    </div>
                    <div className="w-px h-4 bg-zinc-700" />
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Clock className={isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                      <span className={`tabular-nums ${isMobile ? 'text-xs' : 'text-sm'}`}>{remainingTime}s</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowTransformed(false);
                      onComplete();
                    }}
                    className={`bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white ${isMobile ? 'p-1.5' : 'p-2'} rounded-lg transition-colors border border-zinc-700`}
                    title="Close (Esc)"
                  >
                    <X className={isMobile ? 'w-4 h-4' : 'w-5 h-5'} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
