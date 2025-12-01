import { useState, useEffect } from 'react';
import { presetService, type PresetPrompt } from '../services/PresetService';

// Hook to get all presets and provide lookup methods
export function usePresets() {
  const [presets, setPresets] = useState<PresetPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPresets = async () => {
      try {
        setLoading(true);
        const data = await presetService.getEnabledPresets();
        setPresets(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load presets:', err);
        setError('Failed to load presets');
      } finally {
        setLoading(false);
      }
    };

    loadPresets();
  }, []);

  // Get preset name by preset ID
  const getPresetName = (presetId: string): string => {
    const preset = presets.find(p => p.presetId === presetId);
    return preset?.name || formatPresetId(presetId);
  };

  // Get preset by preset ID
  const getPreset = (presetId: string): PresetPrompt | undefined => {
    return presets.find(p => p.presetId === presetId);
  };

  return {
    presets,
    loading,
    error,
    getPresetName,
    getPreset,
  };
}

// Fallback function to format preset ID into readable name
export function formatPresetId(presetId: string): string {
  if (!presetId) return 'Unknown Effect';

  // Convert snake_case or kebab-case to Title Case
  return presetId
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Singleton instance for synchronous preset name lookups
class PresetNameCache {
  private cache: Map<string, string> = new Map();
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      const presets = await presetService.getEnabledPresets();
      presets.forEach(preset => {
        this.cache.set(preset.presetId, preset.name);
      });
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize preset name cache:', error);
    }
  }

  getName(presetId: string): string {
    return this.cache.get(presetId) || formatPresetId(presetId);
  }

  clear() {
    this.cache.clear();
    this.initialized = false;
  }
}

export const presetNameCache = new PresetNameCache();

// Initialize the cache on module load
presetNameCache.initialize();