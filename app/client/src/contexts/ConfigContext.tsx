import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { TimingsConfig, UIConfig, CameraConfig, ProviderConfig, PresetsConfig } from '@photomaton/shared';
import { useAuth } from './AuthContext';

interface ClientConfig {
  timings: TimingsConfig;
  ui: UIConfig;
  camera: CameraConfig;
  providers: ProviderConfig;
  presets: PresetsConfig;
  features: {
    enableWebSockets: boolean;
    enableDebugMode: boolean;
    enableMetrics: boolean;
    enablePhotoExport: boolean;
    enableBulkDelete: boolean;
    enableDeletePicture: boolean;
    showBeforeAfterInfo: boolean;
    showDownloadButtons: boolean;
  };
}

interface ConfigContextType {
  config: ClientConfig | null;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  updateConfig: (updates: Partial<ClientConfig>) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType>({
  config: null,
  loading: true,
  error: null,
  refreshConfig: async () => {},
  updateConfig: async () => {},
});

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
};

// Helper to get user preferences from account metadata
const useUserPreferences = () => {
  try {
    const { account } = useAuth();
    return (account?.metadata as any)?.preferences || {};
  } catch {
    // AuthContext not available (e.g., during initial load)
    return {};
  }
};

export const useTimings = () => {
  const { config } = useConfig();
  const userPrefs = useUserPreferences();

  const defaults = {
    countdownSeconds: 5,
    displayTransformedSeconds: 15,
    processingCheckIntervalMs: 1000,
    maxProcessingTimeSeconds: 30,
    maxRetryAttempts: 15,
    maxProcessingAgeMs: 120000,
    rotationAnimationMs: 600,
    fadeAnimationMs: 300,
  };

  const globalConfig = config?.timings || defaults;

  // User preferences override global config for specific settings
  return {
    ...globalConfig,
    countdownSeconds: userPrefs.countdownSeconds ?? globalConfig.countdownSeconds,
    displayTransformedSeconds: userPrefs.displayTransformedSeconds ?? globalConfig.displayTransformedSeconds,
  };
};

export const useUI = () => {
  const { config } = useConfig();
  const userPrefs = useUserPreferences();

  const defaults = {
    countdownBackgroundOpacity: 0.1,
    spinnerSize: 'w-16 h-16',
    enableCarouselAutoRefresh: true,
    carouselRefreshIntervalMs: 5000,
    maxPhotosInCarousel: 50,
    galleryPageSize: 20,
    beforeAfterSliderPosition: 95,
  };

  const globalConfig = config?.ui || defaults;

  // User preferences override global config for specific settings
  return {
    ...globalConfig,
    countdownBackgroundOpacity: userPrefs.countdownBackgroundOpacity ?? globalConfig.countdownBackgroundOpacity,
  };
};

export const usePresets = () => {
  const { config } = useConfig();
  return config?.presets || {
    availablePresets: [],
    defaultPreset: 'toon-yellow',
  };
};

export const useProviders = () => {
  const { config } = useConfig();
  return config?.providers || {
    activeProvider: 'mock',
    availableProviders: ['mock', 'gemini-imagen'],
    mockDelayMs: 2000,
  };
};

export const useCameraConfig = () => {
  const { config } = useConfig();
  const userPrefs = useUserPreferences();

  const defaults = {
    deviceId: undefined as string | undefined,
    width: 1920,
    height: 1080,
    facingMode: 'user' as const,
  };

  const globalConfig = config?.camera || defaults;

  // User's camera device preference overrides global config
  return {
    ...globalConfig,
    deviceId: userPrefs.cameraDeviceId ?? globalConfig.deviceId,
  };
};

export const useFeatures = () => {
  const { config } = useConfig();
  return config?.features || {
    enableWebSockets: false,
    enableDebugMode: false,
    enableMetrics: false,
    enablePhotoExport: true,
    enableBulkDelete: false,
    enableDeletePicture: true,
    showBeforeAfterInfo: true,
    showDownloadButtons: true,
  };
};

interface ConfigProviderProps {
  children: React.ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<ClientConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/config', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }
      const data = await response.json();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      console.error('Config fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshConfig = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  const updateConfig = useCallback(async (updates: Partial<ClientConfig>) => {
    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update config: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setConfig(result.config);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
      throw err;
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchConfig();

    // Set up auto-refresh if WebSockets are not enabled
    const interval = setInterval(() => {
      fetchConfig();
    }, 60000); // Refresh every minute

    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []);

  return (
    <ConfigContext.Provider value={{ config, loading, error, refreshConfig, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};