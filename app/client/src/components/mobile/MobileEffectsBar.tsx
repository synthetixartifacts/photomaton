import React, { useState, useEffect } from 'react';
import { PresetType } from '@photomaton/shared';
import { presetService, type PresetPrompt } from '../../services/PresetService';
import { Sparkles, Check } from 'lucide-react';

interface PresetOption {
  value: string;
  label: string;
  imagePath?: string;
  description: string;
}

interface MobileEffectsBarProps {
  selectedPreset: PresetType;
  onPresetChange: (preset: PresetType) => void;
  disabled?: boolean;
}

// NO gradients, NO emojis
const convertToPresetOption = (preset: PresetPrompt): PresetOption => ({
  value: preset.presetId,
  label: preset.name,
  imagePath: preset.imagePath,
  description: preset.description || '',
});

export const MobileEffectsBar: React.FC<MobileEffectsBarProps> = ({
  selectedPreset,
  onPresetChange,
  disabled = false,
}) => {
  const [presets, setPresets] = useState<PresetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoading(true);
      setError(null);
      const enabledPresets = await presetService.getEnabledPresets();
      if (enabledPresets.length === 0) {
        setPresets([]);
        setError('No presets available');
      } else {
        const presetOptions = enabledPresets.map(convertToPresetOption);
        setPresets(presetOptions);
      }
    } catch (err) {
      console.error('Failed to load presets:', err);
      setError('Failed to load effects');
      setPresets([]);
    } finally {
      setLoading(false);
    }
  };

  // Split presets into two rows for horizontal scroll
  const row1 = presets.filter((_, i) => i % 2 === 0);
  const row2 = presets.filter((_, i) => i % 2 === 1);

  if (loading) {
    return (
      <div className="h-32 bg-zinc-950 border-t border-zinc-800 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-32 bg-zinc-950 border-t border-zinc-800 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-xs text-zinc-400">{error}</p>
          <button
            onClick={loadPresets}
            className="mt-2 text-xs text-zinc-500 hover:text-white underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 border-t border-zinc-800 py-2 overflow-hidden">
      {/* Horizontal scrollable container */}
      <div className="overflow-x-auto overflow-y-hidden effects-scroll">
        <div className="flex flex-col gap-1.5 px-2 min-w-max">
          {/* Row 1 */}
          <div className="flex gap-1.5">
            {row1.map((preset) => (
              <PresetCard
                key={preset.value}
                preset={preset}
                isSelected={selectedPreset === preset.value}
                disabled={disabled}
                onClick={() => onPresetChange(preset.value as PresetType)}
              />
            ))}
          </div>
          {/* Row 2 */}
          <div className="flex gap-1.5">
            {row2.map((preset) => (
              <PresetCard
                key={preset.value}
                preset={preset}
                isSelected={selectedPreset === preset.value}
                disabled={disabled}
                onClick={() => onPresetChange(preset.value as PresetType)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface PresetCardProps {
  preset: PresetOption;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}

const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  isSelected,
  disabled,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0
        transition-all duration-150
        border-2
        ${isSelected
          ? 'border-white'
          : 'border-transparent'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
      `}
    >
      {/* Background */}
      {preset.imagePath ? (
        <img
          src={preset.imagePath}
          alt={preset.label}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-zinc-600" />
        </div>
      )}

      {/* Dark overlay for text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Label */}
      <div className="absolute bottom-0 left-0 right-0 p-1">
        <div className="font-medium text-white text-[9px] leading-tight truncate">
          {preset.label}
        </div>
      </div>

      {/* Selection indicator - white, not blue */}
      {isSelected && (
        <div className="absolute top-0.5 right-0.5 bg-white rounded p-0.5">
          <Check className="w-2 h-2 text-zinc-900" strokeWidth={3} />
        </div>
      )}
    </button>
  );
};
