import { apiClient } from './ApiClient';
import { PresetType } from '@photomaton/shared';

export interface Photo {
  id: string;
  preset: PresetType;
  originalPath: string;
  transformedPath: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  provider?: string | null;
  processingTime?: number | null;
  thumbnailPath?: string;
  metadata?: any;
}

export interface PhotoListResponse {
  photos: Photo[];
  cursor: string | null;
  hasMore: boolean;
  total: number;
}

export interface CaptureResponse {
  id: string;
  message: string;
}

export class PhotoService {
  async listPhotos(cursor?: string, limit = 20): Promise<PhotoListResponse> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());

    const endpoint = `/photos?${params.toString()}`;
    return apiClient.get<PhotoListResponse>(endpoint);
  }

  async getPhoto(id: string): Promise<Photo> {
    return apiClient.get<Photo>(`/photos/${id}`);
  }

  async capturePhoto(image: Blob, preset: PresetType): Promise<CaptureResponse> {
    return apiClient.upload<CaptureResponse>(
      '/capture',
      image,
      { preset },
      { retries: 0 } // Don't retry uploads
    );
  }

  async deletePhoto(id: string): Promise<void> {
    return apiClient.delete(`/photos/${id}`);
  }

  async deleteAllPhotos(): Promise<{ success: boolean; message: string; count: number }> {
    return apiClient.delete('/photos/all');
  }

  async bulkDelete(ids: string[]): Promise<void> {
    return apiClient.post('/photos/bulk-delete', { ids });
  }

  getPhotoUrl(id: string, type: 'original' | 'transformed' = 'original'): string {
    return `/api/photos/${id}/${type}`;
  }

  async getStats(): Promise<any> {
    return apiClient.get('/photos/stats');
  }

  async exportPhotos(options?: {
    includeOriginals?: boolean;
    preset?: PresetType;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<void> {
    const params = new URLSearchParams();

    if (options?.includeOriginals !== undefined) {
      params.append('includeOriginals', options.includeOriginals.toString());
    }
    if (options?.preset) {
      params.append('preset', options.preset);
    }
    if (options?.dateFrom) {
      params.append('dateFrom', options.dateFrom.toISOString());
    }
    if (options?.dateTo) {
      params.append('dateTo', options.dateTo.toISOString());
    }

    const response = await fetch(`/api/photos/export?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Export failed');
    }

    // Get the filename from the Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'photomaton_export.zip';
    if (contentDisposition) {
      const matches = /filename="(.+)"/.exec(contentDisposition);
      if (matches?.[1]) {
        filename = matches[1];
      }
    }

    // Download the blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async estimateExportSize(options?: {
    includeOriginals?: boolean;
    preset?: PresetType;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ photoCount: number; estimatedSize: number; estimatedSizeMB: number }> {
    const params = new URLSearchParams();

    if (options?.includeOriginals !== undefined) {
      params.append('includeOriginals', options.includeOriginals.toString());
    }
    if (options?.preset) {
      params.append('preset', options.preset);
    }
    if (options?.dateFrom) {
      params.append('dateFrom', options.dateFrom.toISOString());
    }
    if (options?.dateTo) {
      params.append('dateTo', options.dateTo.toISOString());
    }

    return apiClient.get(`/photos/export/estimate?${params.toString()}`);
  }
}

export const photoService = new PhotoService();