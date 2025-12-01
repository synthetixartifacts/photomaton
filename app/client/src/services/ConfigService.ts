import { apiClient } from './ApiClient';
import type { AppConfig } from '@photomaton/shared';

export interface ClientConfig {
  timings: AppConfig['timings'];
  ui: AppConfig['ui'];
  camera: AppConfig['camera'];
  providers: Partial<AppConfig['providers']>;
  presets: AppConfig['presets'];
  features: AppConfig['features'];
  userLimits: AppConfig['userLimits'];
}

export interface ConfigStats {
  activeProvider: string;
  presetsEnabled: number;
  presetsTotal: number;
  webSocketsEnabled: boolean;
  debugMode: boolean;
}

export class ConfigService {
  private cache: ClientConfig | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL: number = 60000; // 1 minute

  async getConfig(forceRefresh = false): Promise<ClientConfig> {
    const now = Date.now();

    if (!forceRefresh && this.cache && (now - this.cacheTimestamp) < this.cacheTTL) {
      return this.cache;
    }

    const config = await apiClient.get<ClientConfig>('/config');
    this.cache = config;
    this.cacheTimestamp = now;
    return config;
  }

  async updateConfig(updates: Partial<ClientConfig>): Promise<ClientConfig> {
    const config = await apiClient.put<{ success: boolean; config: ClientConfig }>(
      '/admin/config',
      updates
    );

    if (config.success) {
      this.cache = config.config;
      this.cacheTimestamp = Date.now();
      return config.config;
    }

    throw new Error('Failed to update configuration');
  }

  async resetConfig(): Promise<ClientConfig> {
    const response = await apiClient.post<{ success: boolean; config: ClientConfig }>(
      '/admin/config/reset'
    );

    if (response.success) {
      this.cache = response.config;
      this.cacheTimestamp = Date.now();
      return response.config;
    }

    throw new Error('Failed to reset configuration');
  }

  async getStats(): Promise<ConfigStats> {
    return apiClient.get<ConfigStats>('/config/stats');
  }

  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  // Convenience methods
  async updateTimings(timings: Partial<ClientConfig['timings']>): Promise<ClientConfig> {
    const current = await this.getConfig();
    return this.updateConfig({ timings: { ...current.timings, ...timings } });
  }

  async updateUI(ui: Partial<ClientConfig['ui']>): Promise<ClientConfig> {
    const current = await this.getConfig();
    return this.updateConfig({ ui: { ...current.ui, ...ui } });
  }

  async updatePresets(presets: Partial<ClientConfig['presets']>): Promise<ClientConfig> {
    const current = await this.getConfig();
    return this.updateConfig({ presets: { ...current.presets, ...presets } });
  }

  async setActiveProvider(provider: string): Promise<ClientConfig> {
    return this.updateConfig({
      providers: { activeProvider: provider }
    });
  }

  async toggleFeature(feature: keyof ClientConfig['features'], enabled: boolean): Promise<ClientConfig> {
    const config = await this.getConfig();
    return this.updateConfig({
      features: {
        ...config.features,
        [feature]: enabled
      }
    });
  }
}

export const configService = new ConfigService();