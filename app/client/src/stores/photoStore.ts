import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { photoService } from '../services/PhotoService';

export interface Photo {
  id: string;
  preset: string;
  originalPath: string;
  transformedPath: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date | string;
  provider?: string | null;
  processingTime?: number | null;
  thumbnailPath?: string;
  metadata?: any;
}

interface PhotoState {
  photos: Photo[];
  loading: boolean;
  error: string | null;
  cursor: string | null;
  hasMore: boolean;
  selectedPhotoId: string | null;
  pageSize: number;

  // Actions
  fetchPhotos: (reset?: boolean) => Promise<void>;
  addPhoto: (photo: Photo) => void;
  updatePhoto: (id: string, updates: Partial<Photo>) => void;
  removePhoto: (id: string) => void;
  selectPhoto: (id: string | null) => void;
  setPageSize: (size: number) => void;
  clearError: () => void;
  reset: () => void;
}

export const usePhotoStore = create<PhotoState>()(
  persist(
    (set, get) => ({
      photos: [],
      loading: false,
      error: null,
      cursor: null,
      hasMore: true,
      selectedPhotoId: null,
      pageSize: 20,

      fetchPhotos: async (reset = false) => {
        const state = get();
        if (state.loading || (!state.hasMore && !reset)) return;

        set({ loading: true, error: null });

        try {
          const cursorToUse = reset ? undefined : (state.cursor && state.cursor !== 'NaN' ? state.cursor : undefined);
          const response = await photoService.listPhotos(
            cursorToUse,
            state.pageSize
          );

          set({
            photos: reset
              ? response.photos
              : [...state.photos, ...response.photos],
            cursor: response.cursor,
            hasMore: response.hasMore,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch photos',
            loading: false,
          });
        }
      },

      addPhoto: (photo) =>
        set((state) => ({
          photos: [photo, ...state.photos],
        })),

      updatePhoto: (id, updates) =>
        set((state) => ({
          photos: state.photos.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      removePhoto: (id) =>
        set((state) => ({
          photos: state.photos.filter((p) => p.id !== id),
          selectedPhotoId: state.selectedPhotoId === id ? null : state.selectedPhotoId,
        })),

      selectPhoto: (id) => set({ selectedPhotoId: id }),

      setPageSize: (size) => set({ pageSize: size }),

      clearError: () => set({ error: null }),

      reset: () =>
        set({
          photos: [],
          loading: false,
          error: null,
          cursor: null,
          hasMore: true,
          selectedPhotoId: null,
          pageSize: 20,
        }),
    }),
    {
      name: 'photo-store',
      partialize: (state) => ({
        selectedPhotoId: state.selectedPhotoId,
      }),
    }
  )
);