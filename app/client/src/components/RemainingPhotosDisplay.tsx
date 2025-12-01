import React from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const RemainingPhotosDisplay: React.FC = () => {
  const { photoLimitInfo } = useAuth();

  // Don't show if no limit info or unlimited (admin)
  if (!photoLimitInfo || photoLimitInfo.limit === null) {
    return null;
  }

  const { remaining, limit } = photoLimitInfo;
  const isLow = remaining !== null && remaining <= 10;
  const isVeryLow = remaining !== null && remaining <= 3;

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-2 rounded-full
        bg-black/60 backdrop-blur-sm border
        ${isVeryLow ? 'border-red-500/50 text-red-400' : isLow ? 'border-amber-500/50 text-amber-400' : 'border-zinc-700/50 text-zinc-300'}
        transition-colors duration-200
      `}
    >
      <Camera className="w-4 h-4" />
      <span className="text-sm font-medium">
        {remaining} / {limit}
      </span>
    </div>
  );
};
