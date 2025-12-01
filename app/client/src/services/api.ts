import {
  Photo,
  PresetType,
  CaptureResponse,
  TransformResponse,
  PhotoListResponse
} from '@photomaton/shared';

const API_BASE = '/api';

class ApiService {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { message: 'Request failed' }
      }));
      throw new Error(error.error?.message || 'Request failed');
    }

    // Handle empty responses (e.g., 204 No Content)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return response.json();
  }

  async checkHealth() {
    return this.request<{
      status: string;
      provider: string;
      version: string;
    }>('/healthz');
  }

  async capturePhoto(imageBlob: Blob, preset: PresetType = 'toon-yellow') {
    const formData = new FormData();
    formData.append('image', imageBlob, 'capture.jpg');
    formData.append('preset', preset);

    return this.request<CaptureResponse>('/capture', {
      method: 'POST',
      body: formData,
    });
  }

  async transformPhoto(photoId: string, preset: PresetType) {
    return this.request<TransformResponse>('/transform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoId, preset }),
    });
  }

  async listPhotos(cursor?: string, limit = 20) {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());

    return this.request<PhotoListResponse>(
      `/photos?${params.toString()}`
    );
  }

  async getPhoto(photoId: string) {
    return this.request<Photo>(`/photos/${photoId}`);
  }

  async deletePhoto(photoId: string) {
    return this.request(`/photos/${photoId}`, {
      method: 'DELETE',
    });
  }

  getPhotoUrl(photoId: string, type: 'original' | 'thumbnail' | string) {
    if (type === 'original' || type === 'thumbnail') {
      return `${API_BASE}/photos/${photoId}/${type}`;
    }
    // For transformed images with preset
    return `${API_BASE}/photos/${photoId}/transformed/${type}`;
  }

  downloadPhoto(photoId: string, preset?: string) {
    const link = document.createElement('a');
    if (preset) {
      link.href = `${API_BASE}/photos/${photoId}/transformed/${preset}`;
      link.download = `${preset}-${photoId}.jpg`;
    } else {
      link.href = `${API_BASE}/photos/${photoId}/original`;
      link.download = `original-${photoId}.jpg`;
    }
    link.click();
  }

  async getTransformJobStatus(jobId: string) {
    return this.request<{
      id: string;
      status: string;
      photoId: string;
      preset: string;
      error?: string;
    }>(`/transform/job/${jobId}`);
  }
}

export const apiService = new ApiService();
export const api = apiService; // Backward compatibility