import { apiClient } from './ApiClient';

// Types for the client-side preset service
export interface PresetPrompt {
  id: string;
  presetId: string;
  name: string;
  description?: string;
  enabled: boolean;
  icon?: string;
  imagePath?: string;
  prompt: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePresetInput {
  presetId: string;
  name: string;
  description?: string;
  enabled?: boolean;
  icon?: string;
  prompt: string;
}

export interface UpdatePresetInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  icon?: string;
  prompt?: string;
}

export interface PresetListResponse {
  success: boolean;
  data: PresetPrompt[];
  count: number;
}

export interface PresetResponse {
  success: boolean;
  data: PresetPrompt;
  message?: string;
}

export interface PresetStatsResponse {
  success: boolean;
  data: {
    totalPresets: number;
    enabledPresets: number;
    disabledPresets: number;
  };
}

export interface BulkToggleResponse {
  success: boolean;
  data: {
    updatedCount: number;
    enabled: boolean;
  };
  message: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export class PresetService {
  private cache: PresetPrompt[] | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL: number = 60000; // 1 minute

  /**
   * Get all presets with optional filtering
   */
  async getPresets(forceRefresh = false, options?: { enabled?: boolean; limit?: number }): Promise<PresetPrompt[]> {
    const now = Date.now();

    // Use cache if available and not expired (unless force refresh or filtering)
    if (!forceRefresh && !options && this.cache && (now - this.cacheTimestamp) < this.cacheTTL) {
      return this.cache;
    }

    const params = new URLSearchParams();
    if (options?.enabled !== undefined) {
      params.append('enabled', options.enabled.toString());
    }
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }

    const endpoint = `/presets${params.toString() ? `?${params}` : ''}`;
    const response = await apiClient.get<PresetListResponse>(endpoint);

    // Only cache if no filtering
    if (!options) {
      this.cache = response.data;
      this.cacheTimestamp = now;
    }

    return response.data;
  }

  /**
   * Get only enabled presets
   */
  async getEnabledPresets(): Promise<PresetPrompt[]> {
    const response = await apiClient.get<PresetListResponse>('/presets/enabled');
    return response.data;
  }

  /**
   * Get preset by ID
   */
  async getPreset(id: string): Promise<PresetPrompt> {
    const response = await apiClient.get<PresetResponse>(`/presets/${id}`);
    return response.data;
  }

  /**
   * Get preset by preset ID
   */
  async getPresetByPresetId(presetId: string): Promise<PresetPrompt> {
    const response = await apiClient.get<PresetResponse>(`/presets/by-preset-id/${presetId}`);
    return response.data;
  }

  /**
   * Create a new preset
   */
  async createPreset(input: CreatePresetInput): Promise<PresetPrompt> {
    const response = await apiClient.post<PresetResponse>('/presets', input);

    // Invalidate cache
    this.invalidateCache();

    return response.data;
  }

  /**
   * Update an existing preset
   */
  async updatePreset(id: string, input: UpdatePresetInput): Promise<PresetPrompt> {
    const response = await apiClient.put<PresetResponse>(`/presets/${id}`, input);

    // Invalidate cache
    this.invalidateCache();

    return response.data;
  }

  /**
   * Toggle preset enabled status
   */
  async togglePreset(id: string): Promise<PresetPrompt> {
    const response = await apiClient.patch<PresetResponse>(`/presets/${id}/toggle`, {});

    // Invalidate cache
    this.invalidateCache();

    return response.data;
  }

  /**
   * Bulk toggle multiple presets
   */
  async bulkTogglePresets(ids: string[], enabled: boolean): Promise<BulkToggleResponse['data']> {
    const response = await apiClient.patch<BulkToggleResponse>('/presets/bulk/toggle', {
      ids,
      enabled,
    });

    // Invalidate cache
    this.invalidateCache();

    return response.data;
  }

  /**
   * Delete a preset
   */
  async deletePreset(id: string): Promise<void> {
    await apiClient.delete<ApiResponse>(`/presets/${id}`);

    // Invalidate cache
    this.invalidateCache();
  }

  /**
   * Get preset statistics
   */
  async getStats(): Promise<PresetStatsResponse['data']> {
    const response = await apiClient.get<PresetStatsResponse>('/presets/stats');
    return response.data;
  }

  /**
   * Check if a preset ID exists
   */
  async presetExists(presetId: string): Promise<boolean> {
    try {
      await this.getPresetByPresetId(presetId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Invalidate the preset cache
   */
  invalidateCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Get preset options for form components (simplified format)
   */
  async getPresetOptions(enabledOnly = true): Promise<Array<{ value: string; label: string; icon?: string; description?: string }>> {
    const presets = enabledOnly ? await this.getEnabledPresets() : await this.getPresets();

    return presets.map(preset => ({
      value: preset.presetId,
      label: preset.name,
      icon: preset.icon,
      description: preset.description,
    }));
  }

  /**
   * Upload image for a preset
   */
  async uploadPresetImage(id: string, file: File): Promise<PresetPrompt> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.postFormData<PresetResponse>(`/presets/${id}/image`, formData);

    // Invalidate cache
    this.invalidateCache();

    return response.data;
  }

  /**
   * Delete preset image
   */
  async deletePresetImage(id: string): Promise<void> {
    await apiClient.delete<ApiResponse>(`/presets/${id}/image`);

    // Invalidate cache
    this.invalidateCache();
  }

  /**
   * Reorder presets
   */
  async reorderPresets(orderedIds: string[]): Promise<void> {
    await apiClient.patch<ApiResponse>('/presets/reorder', { orderedIds });

    // Invalidate cache
    this.invalidateCache();
  }

  /**
   * Convert preset to legacy format for backward compatibility
   */
  toLegacyFormat(preset: PresetPrompt): {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    prompt: string;
    icon?: string;
    imagePath?: string;
  } {
    return {
      id: preset.presetId,
      name: preset.name,
      description: preset.description || '',
      enabled: preset.enabled,
      prompt: preset.prompt,
      icon: preset.icon,
      imagePath: preset.imagePath,
    };
  }
}

// Export singleton instance
export const presetService = new PresetService();