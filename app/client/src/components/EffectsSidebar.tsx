import React, { useState, useEffect } from 'react';
import { PresetType } from '@photomaton/shared';
import { presetService, type PresetPrompt } from '../services/PresetService';
import { Sparkles, Check } from 'lucide-react';

interface PresetOption {
  value: string;
  label: string;
  imagePath?: string;
  description: string;
}

interface EffectsSidebarProps {
  selectedPreset: PresetType;
  onPresetChange: (preset: PresetType) => void;
  disabled?: boolean;
}

// Convert database preset to UI preset option - NO gradients, NO emojis
const convertToPresetOption = (preset: PresetPrompt): PresetOption => ({
  value: preset.presetId,
  label: preset.name,
  imagePath: preset.imagePath,
  description: preset.description || '',
});

export const EffectsSidebar: React.FC<EffectsSidebarProps> = ({
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

  return (
    <div className="flex flex-col h-full">
      {/* Header - vertically aligned with burger menu (top-2 + p-2 + h-6 icon) */}
      <div className="h-14 flex items-center pl-20 pr-4 border-b border-zinc-800">
        <h2 className="text-base font-medium text-zinc-100">Effects</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm text-zinc-400">{error}</p>
            <button
              onClick={loadPresets}
              className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Effects grid */}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => {
              const isSelected = selectedPreset === preset.value;

              return (
                <button
                  key={preset.value}
                  onClick={() => onPresetChange(preset.value as PresetType)}
                  disabled={disabled}
                  className={`
                    relative aspect-square rounded-lg overflow-hidden
                    transition-all duration-150
                    border-2
                    ${isSelected
                      ? 'border-white'
                      : 'border-transparent hover:border-zinc-700'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {/* Image background or fallback */}
                  {preset.imagePath ? (
                    <img
                      src={preset.imagePath}
                      alt={preset.label}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-zinc-600" />
                    </div>
                  )}

                  {/* Dark overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <div className="font-medium text-white text-xs truncate">{preset.label}</div>
                  </div>

                  {/* Selection indicator - simple check, not over-decorated */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 bg-white rounded p-0.5">
                      <Check className="w-3 h-3 text-zinc-900" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
