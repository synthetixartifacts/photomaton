import { useEffect, useCallback } from 'react';
import { usePhotoStore } from '../stores/photoStore';
import { useUIStore } from '../stores/uiStore';

export const usePhotoGallery = () => {
  const {
    photos,
    loading,
    error,
    hasMore,
    selectedPhotoId,
    fetchPhotos,
    selectPhoto,
    clearError,
  } = usePhotoStore();

  const {
    showBeforeAfterViewer,
    toggleBeforeAfterViewer,
    addNotification,
  } = useUIStore();

  // Load initial photos
  useEffect(() => {
    if (photos.length === 0 && !loading) {
      fetchPhotos();
    }
  }, []);

  // Handle photo selection
  const handlePhotoClick = useCallback((photo: any) => {
    if (!photo.transformedPath) {
      addNotification('info', 'This photo is still processing...');
      return;
    }
    selectPhoto(photo.id);
    toggleBeforeAfterViewer(true);
  }, [selectPhoto, toggleBeforeAfterViewer, addNotification]);

  // Handle viewer close
  const handleViewerClose = useCallback(() => {
    toggleBeforeAfterViewer(false);
    selectPhoto(null);
  }, [toggleBeforeAfterViewer, selectPhoto]);

  // Load more photos
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPhotos();
    }
  }, [loading, hasMore, fetchPhotos]);

  // Handle errors
  useEffect(() => {
    if (error) {
      addNotification('error', error);
      clearError();
    }
  }, [error, addNotification, clearError]);

  return {
    // State
    photos,
    loading,
    selectedPhotoId,
    showViewer: showBeforeAfterViewer,

    // Actions
    onPhotoClick: handlePhotoClick,
    onViewerClose: handleViewerClose,
    loadMore,
    refresh: () => fetchPhotos(true),
  };
};