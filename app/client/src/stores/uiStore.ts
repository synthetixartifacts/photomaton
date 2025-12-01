import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Modal states
  showBeforeAfterViewer: boolean;
  showSettings: boolean;
  showAdminPanel: boolean;
  showMobileGallery: boolean;

  // UI preferences
  theme: 'light' | 'dark' | 'auto';
  galleryLayout: 'grid' | 'carousel';
  gallerySize: 'small' | 'medium' | 'large';

  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    timestamp: number;
  }>;

  // Actions
  toggleBeforeAfterViewer: (show?: boolean) => void;
  toggleSettings: (show?: boolean) => void;
  toggleAdminPanel: (show?: boolean) => void;
  toggleMobileGallery: (show?: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setGalleryLayout: (layout: 'grid' | 'carousel') => void;
  setGallerySize: (size: 'small' | 'medium' | 'large') => void;
  addNotification: (type: UIState['notifications'][0]['type'], message: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Modal states
      showBeforeAfterViewer: false,
      showSettings: false,
      showAdminPanel: false,
      showMobileGallery: false,

      // UI preferences
      theme: 'auto',
      galleryLayout: 'carousel',
      gallerySize: 'medium',

      // Notifications
      notifications: [],

      // Actions
      toggleBeforeAfterViewer: (show) =>
        set((state) => ({
          showBeforeAfterViewer: show ?? !state.showBeforeAfterViewer,
        })),

      toggleSettings: (show) =>
        set((state) => ({
          showSettings: show ?? !state.showSettings,
        })),

      toggleAdminPanel: (show) =>
        set((state) => ({
          showAdminPanel: show ?? !state.showAdminPanel,
        })),

      toggleMobileGallery: (show) =>
        set((state) => ({
          showMobileGallery: show ?? !state.showMobileGallery,
        })),

      setTheme: (theme) => set({ theme }),

      setGalleryLayout: (layout) => set({ galleryLayout: layout }),

      setGallerySize: (size) => set({ gallerySize: size }),

      addNotification: (type, message) => {
        const id = Math.random().toString(36).substring(7);
        const notification = {
          id,
          type,
          message,
          timestamp: Date.now(),
        };

        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 5), // Keep max 5 notifications
        }));

        // Auto-remove after 5 seconds for non-error notifications
        if (type !== 'error') {
          setTimeout(() => {
            get().removeNotification(id);
          }, 5000);
        }
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        theme: state.theme,
        galleryLayout: state.galleryLayout,
        gallerySize: state.gallerySize,
      }),
    }
  )
);