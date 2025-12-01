import React, { useState, useEffect, useCallback } from 'react';

interface PhotoEffect {
  src: string;
  label: string;
  color: string;
}

const EFFECTS: PhotoEffect[] = [
  { src: '/images/original.jpeg', label: 'Original', color: 'text-zinc-400' },
  { src: '/images/hero.png', label: 'Superhero', color: 'text-amber-400' },
  { src: '/images/noir.png', label: 'Film Noir', color: 'text-zinc-300' },
  { src: '/images/barbi.png', label: 'Glamour', color: 'text-pink-400' },
  { src: '/images/japan.png', label: 'Ukiyo-e', color: 'text-red-400' },
];

const CYCLE_DURATION = 3500; // ms per effect

export const PhotoShowcase: React.FC = React.memo(() => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayText, setDisplayText] = useState(EFFECTS[0].label);
  const [isScrambling, setIsScrambling] = useState(false);

  // Text scramble effect
  const scrambleText = useCallback((targetText: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%&*';
    const duration = 400;
    const steps = 8;
    const stepDuration = duration / steps;
    let step = 0;

    setIsScrambling(true);

    const interval = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayText(targetText);
        setIsScrambling(false);
        clearInterval(interval);
      } else {
        // Gradually reveal the target text
        const revealed = Math.floor((step / steps) * targetText.length);
        const scrambled = targetText
          .split('')
          .map((char, i) => {
            if (i < revealed) return char;
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
        setDisplayText(scrambled);
      }
    }, stepDuration);
  }, []);

  // Auto-cycle through effects
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % EFFECTS.length;
        scrambleText(EFFECTS[next].label);
        return next;
      });
    }, CYCLE_DURATION);

    return () => clearInterval(timer);
  }, [scrambleText]);

  const currentEffect = EFFECTS[currentIndex];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient glow based on current effect */}
      <div
        className="absolute inset-0 opacity-20 transition-all duration-1000 blur-3xl"
        style={{
          background: currentIndex === 3
            ? 'radial-gradient(circle at center, rgba(236, 72, 153, 0.3) 0%, transparent 70%)'
            : currentIndex === 1
            ? 'radial-gradient(circle at center, rgba(251, 191, 36, 0.2) 0%, transparent 70%)'
            : currentIndex === 4
            ? 'radial-gradient(circle at center, rgba(239, 68, 68, 0.2) 0%, transparent 70%)'
            : 'radial-gradient(circle at center, rgba(255, 255, 255, 0.1) 0%, transparent 70%)'
        }}
      />

      {/* Photo container with morphing effect */}
      <div className="relative w-full max-w-md aspect-[3/4] mx-auto">
        {/* All images stacked, opacity controlled */}
        {EFFECTS.map((effect, index) => (
          <img
            key={effect.src}
            src={effect.src}
            alt={effect.label}
            className="absolute inset-0 w-full h-full object-cover rounded-2xl shadow-2xl transition-opacity duration-700"
            style={{
              opacity: index === currentIndex ? 1 : 0,
              zIndex: index === currentIndex ? 10 : 0,
            }}
          />
        ))}

        {/* Subtle frame overlay */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-white/10 pointer-events-none z-20" />

        {/* Corner accents */}
        <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-white/30 rounded-tl-lg z-20" />
        <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-white/30 rounded-tr-lg z-20" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-white/30 rounded-bl-lg z-20" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-white/30 rounded-br-lg z-20" />
      </div>

      {/* Effect label with scramble animation */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-3">
          <span className="text-zinc-500 text-sm font-medium uppercase tracking-widest">
            Effect
          </span>
          <span className="w-8 h-px bg-zinc-700" />
          <span
            className={`text-2xl font-bold tracking-tight transition-colors duration-500 ${currentEffect.color} ${isScrambling ? 'font-mono' : ''}`}
            style={{ minWidth: '140px', display: 'inline-block' }}
          >
            {displayText}
          </span>
        </div>
      </div>

      {/* Progress indicators */}
      <div className="flex gap-2 mt-6">
        {EFFECTS.map((effect, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentIndex(index);
              scrambleText(effect.label);
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'bg-white w-6'
                : 'bg-zinc-600 hover:bg-zinc-500'
            }`}
            aria-label={`Show ${effect.label} effect`}
          />
        ))}
      </div>

      {/* Tagline */}
      <p className="mt-8 text-zinc-500 text-sm text-center max-w-xs">
        Transform your photos with AI-powered effects in seconds
      </p>
    </div>
  );
});

PhotoShowcase.displayName = 'PhotoShowcase';
