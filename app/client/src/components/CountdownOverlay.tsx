import { useEffect, useState } from 'react';
import { useUI } from '../contexts/ConfigContext';

interface CountdownOverlayProps {
  seconds: number;
  onComplete: () => void;
  active: boolean;
  isMobile?: boolean;
}

export function CountdownOverlay({ seconds, onComplete, active, isMobile = false }: CountdownOverlayProps) {
  const ui = useUI();
  const [count, setCount] = useState(seconds);

  // Responsive sizes
  const countdownTextSize = isMobile ? 'text-7xl' : 'text-9xl';
  const circleSize = isMobile ? 'w-36 h-36' : 'w-48 h-48';
  const backgroundSize = isMobile ? 'w-48 h-48' : 'w-64 h-64';
  const instructionTextSize = isMobile ? 'text-base' : 'text-xl';
  const instructionBottom = isMobile ? 'bottom-12' : 'bottom-20';
  const [showFlash, setShowFlash] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset count when active changes to true
  useEffect(() => {
    if (active && seconds > 0) {
      console.log('Countdown starting with seconds:', seconds);
      setCount(seconds);
      setProgress(0);
    }
  }, [active, seconds]);

  // Smooth progress animation during each second
  useEffect(() => {
    if (!active || count === 0) return;

    const startTime = Date.now();
    const duration = 1000; // 1 second
    const baseProgress = (seconds - count) / seconds;
    const targetProgress = (seconds - count + 1) / seconds;

    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progressInSecond = Math.min(elapsed / duration, 1);
      const currentProgress = baseProgress + (targetProgress - baseProgress) * progressInSecond;
      setProgress(currentProgress);

      if (progressInSecond < 1) {
        requestAnimationFrame(animateProgress);
      }
    };

    requestAnimationFrame(animateProgress);
  }, [count, active, seconds]);

  useEffect(() => {
    if (!active) {
      setShowFlash(false);
      return;
    }

    if (count === 0) {
      // Trigger flash effect
      setShowFlash(true);
      setTimeout(() => {
        setShowFlash(false);
        onComplete();
      }, 300);
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, active, onComplete]);

  if (!active || count === 0) {
    return (
      <>
        {showFlash && (
          <div className="absolute inset-0 bg-white pointer-events-none z-50 animate-flash" />
        )}
      </>
    );
  }

  return (
    <>
      {/* Semi-transparent background overlay */}
      <div
        className="absolute inset-0 z-40 pointer-events-none"
        style={{ backgroundColor: `rgba(0, 0, 0, ${ui.countdownBackgroundOpacity})` }}
      />

      <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
        <div className="relative">

        {/* Darker background behind countdown area */}
        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${backgroundSize} rounded-full bg-black/70 backdrop-blur-sm`}></div>

        {/* Countdown number */}
        <div className={`relative ${count === 1 ? 'text-red-500' : count <= 3 ? 'text-orange-500' : 'text-white'}`}>
          <div
            className={`${countdownTextSize} font-bold animate-countdown-pulse`}
            style={{
              textShadow: count === 1
                ? '0 0 40px rgba(239,68,68,0.7)'
                : count <= 3
                ? '0 0 40px rgba(249,115,22,0.7)'
                : '0 0 40px rgba(255,255,255,0.5)',
            }}
          >
            {count}
          </div>
        </div>

        {/* Circular progress indicator */}
        <svg
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${circleSize}`}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={count === 1 ? '#ef4444' : count <= 3 ? '#f97316' : 'white'}
            strokeWidth="2"
            strokeDasharray={`${283 * progress} 283`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{
              transition: 'none',
            }}
          />
        </svg>
      </div>

      {/* Instructions text */}
      <div className={`absolute ${instructionBottom} text-white/90 ${instructionTextSize} font-medium tracking-wide`}>
        Get ready for your photo!
      </div>
    </div>
    </>
  );
}