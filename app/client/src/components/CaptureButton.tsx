import { Camera } from 'lucide-react';

interface CaptureButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isCapturing?: boolean;
  displayCountdown?: number | null;
  isMobile?: boolean;
}

export function CaptureButton({
  onClick,
  disabled = false,
  isCapturing = false,
  displayCountdown,
  isMobile = false
}: CaptureButtonProps) {
  // Use CSS vars for sizing - cleaner than magic numbers
  const size = isMobile ? 'w-[72px] h-[72px]' : 'w-24 h-24';
  const iconSize = isMobile ? 'w-6 h-6' : 'w-7 h-7';

  const isDisabled = disabled || isCapturing;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative ${size} rounded-full
        ${isDisabled
          ? 'bg-zinc-800 cursor-not-allowed'
          : 'bg-red-600 hover:bg-red-500 active:scale-95'
        }
        border-4 border-white/90
        transition-all duration-150
        flex items-center justify-center
      `}
      aria-label="Take photo"
    >
      {displayCountdown !== null && displayCountdown !== undefined ? (
        // Countdown display
        <span className="text-white text-lg font-semibold tabular-nums">{displayCountdown}s</span>
      ) : isCapturing ? (
        // Processing spinner
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        // Camera icon
        <Camera className={`${iconSize} text-white`} strokeWidth={2} />
      )}
    </button>
  );
}
