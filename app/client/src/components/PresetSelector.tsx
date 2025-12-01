import { useState, useEffect } from 'react';
import { PresetType } from '@photomaton/shared';
import { presetService, type PresetPrompt } from '../services/PresetService';

interface PresetOption {
  value: string; // Changed from PresetType to string for dynamic presets
  label: string;
  emoji: string;
  description: string;
  gradient: string;
}

// Removed hardcoded fallback presets - using API only

// Color gradients for presets
const PRESET_GRADIENTS = [
  'from-yellow-400 to-orange-500',
  'from-purple-600 to-red-700',
  'from-blue-500 to-cyan-500',
  'from-green-500 to-teal-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-purple-500',
  'from-orange-500 to-red-500',
  'from-cyan-500 to-blue-500',
  'from-emerald-500 to-green-500',
  'from-violet-500 to-purple-500',
];

interface PresetSelectorProps {
  value: PresetType; // Keep as PresetType for backward compatibility
  onChange: (preset: PresetType) => void; // Keep as PresetType
  disabled?: boolean;
}

// Convert database preset to UI preset option
const convertToPresetOption = (preset: PresetPrompt, index: number): PresetOption => ({
  value: preset.presetId,
  label: preset.name,
  emoji: preset.icon || '🎨',
  description: preset.description || '',
  gradient: PRESET_GRADIENTS[index % PRESET_GRADIENTS.length],
});

export function PresetSelector({ value, onChange, disabled = false }: PresetSelectorProps) {
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

      // Get enabled presets from the database
      const enabledPresets = await presetService.getEnabledPresets();

      if (enabledPresets.length === 0) {
        // If no presets found, show empty state
        setPresets([]);
        setError('No presets available. Please contact administrator.');
      } else {
        // Convert database presets to UI preset options
        const presetOptions = enabledPresets.map(convertToPresetOption);
        setPresets(presetOptions);
      }
    } catch (err) {
      console.error('Failed to load presets:', err);
      setError('Failed to load presets. Please try again.');
      setPresets([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white mb-4">Choose Your Style</h3>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white mb-4">Choose Your Style</h3>
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
          <p className="text-sm text-red-300 mb-2">{error}</p>
          <button
            onClick={loadPresets}
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white mb-4">Choose Your Style</h3>

      {presets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-zinc-400 mb-2">No presets available</p>
          <button
            onClick={loadPresets}
            className="text-sm text-zinc-300 hover:text-blue-300 underline"
          >
            Refresh
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onChange(preset.value as PresetType)}
              disabled={disabled}
              className={`
                relative p-4 rounded-xl
                transition-all duration-200
                ${value === preset.value
                  ? 'border-2 border-white'
                  : 'hover:scale-102'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                overflow-hidden
              `}
            >
              {/* Background gradient */}
              <div
                className={`
                  absolute inset-0 bg-gradient-to-br ${preset.gradient}
                  ${value === preset.value ? 'opacity-100' : 'opacity-80 hover:opacity-100'}
                  transition-opacity duration-200
                `}
              />

              {/* Content */}
              <div className="relative z-10 text-white">
                <div className="text-3xl mb-2">{preset.emoji}</div>
                <div className="font-bold text-lg">{preset.label}</div>
                <div className="text-xs opacity-90 mt-1">{preset.description}</div>
              </div>

              {/* Selection indicator */}
              {value === preset.value && (
                <div className="absolute top-2 right-2 z-10">
                  <div className="bg-white rounded-full p-1">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Info */}
      {presets.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-zinc-500">
            {`${presets.length} presets available`}
          </p>
        </div>
      )}
    </div>
  );
}