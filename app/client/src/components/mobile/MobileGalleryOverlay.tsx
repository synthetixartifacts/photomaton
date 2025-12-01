import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { api } from '../../services/api';
import { usePhotoStore, Photo } from '../../stores/photoStore';
import { useFeatures } from '../../contexts/ConfigContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePresets } from '../../hooks/usePresets';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

interface MobileGalleryOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoClick: (photo: Photo) => void;
  refreshTrigger?: number;
}

export const MobileGalleryOverlay: React.FC<MobileGalleryOverlayProps> = ({
  isOpen,
  onClose,
  onPhotoClick,
  refreshTrigger = 0,
}) => {
  const features = useFeatures();
  const { getPresetName } = usePresets();
  const { photos, loading, error, hasMore, fetchPhotos, removePhoto } = usePhotoStore();
  const { refreshPhotoLimitInfo } = useAuth();

  // Infinite scroll handler
  const handleLoadMore = useCallback(() => {
    fetchPhotos(false);
  }, [fetchPhotos]);

  const scrollContainerRef = useInfiniteScroll({
    hasMore,
    loading,
    onLoadMore: handleLoadMore,
    threshold: 150,
    enabled: isOpen && photos.length > 0,
  });

  useEffect(() => {
    if (isOpen) {
      fetchPhotos(true);
    }
  }, [isOpen, refreshTrigger]);

  // Auto-refresh for processing photos
  useEffect(() => {
    if (!isOpen) return;
    const hasProcessingPhotos = photos.some(p => p.status === 'processing');
    if (hasProcessingPhotos) {
      const interval = setInterval(() => {
        fetchPhotos(true);
      }, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isOpen, photos, fetchPhotos]);

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleDelete = async (photoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this photo?')) return;
    try {
      await api.deletePhoto(photoId);
      removePhoto(photoId);
      // Refresh photo limit info to update remaining count in UI
      refreshPhotoLimitInfo();
    } catch (err) {
      console.error('Failed to delete photo:', err);
    }
  };

  const handleRetry = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.transformPhoto(photo.id, photo.preset as any);
      setTimeout(() => fetchPhotos(true), 1000);
    } catch (err) {
      console.error('Failed to retry transformation:', err);
    }
  };

  const handlePhotoClick = (photo: Photo) => {
    if (photo.status !== 'processing' && photo.status !== 'pending' && photo.status !== 'failed') {
      onPhotoClick(photo);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col animate-slide-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <h2 className="text-lg font-semibold text-white">Gallery</h2>
        <button
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
          aria-label="Close gallery"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3">
        {loading && photos.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="text-zinc-500 mt-2 text-sm">Loading photos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={() => fetchPhotos(true)}
                className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-white"
              >
                Retry
              </button>
            </div>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-zinc-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-zinc-400 text-sm">No photos yet</p>
              <p className="text-zinc-600 text-xs mt-1">Take your first photo!</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo) => {
                const isProcessing = photo.status === 'processing' || photo.status === 'pending';
                const isFailed = photo.status === 'failed';

                return (
                  <div
                    key={photo.id}
                    onClick={() => handlePhotoClick(photo)}
                    className={`relative aspect-square rounded-xl overflow-hidden group transition-all duration-200 ${
                      isProcessing || isFailed ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
                    }`}
                  >
                    {/* Thumbnail */}
                    <img
                      src={photo.status === 'completed' && photo.transformedPath
                        ? api.getPhotoUrl(photo.id, photo.preset)
                        : api.getPhotoUrl(photo.id, 'thumbnail')
                      }
                      alt="Photo"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Overlay with status */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 text-[10px] text-white">
                        <span className="capitalize truncate block">{getPresetName(photo.preset)}</span>
                      </div>
                    </div>

                    {/* Delete button */}
                    {features.enableDeletePicture && (
                      <button
                        onClick={(e) => handleDelete(photo.id, e)}
                        className="absolute top-1.5 right-1.5 z-20 p-1 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}

                    {/* Processing indicator */}
                    {isProcessing && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-t-transparent border-white mx-auto"></div>
                          <p className="text-[10px] text-white mt-1">Processing</p>
                        </div>
                      </div>
                    )}

                    {/* Error indicator */}
                    {isFailed && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
                        <div className="text-center p-2">
                          <svg className="w-6 h-6 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <button
                            onClick={(e) => handleRetry(photo, e)}
                            className="mt-1 px-2 py-0.5 bg-zinc-700 text-white text-[10px] rounded-full"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Loading indicator for infinite scroll */}
            {hasMore && (
              <div className="mt-4 flex justify-center py-4">
                {loading ? (
                  <div className="flex items-center gap-2 text-zinc-500 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent border-zinc-500"></div>
                    <span>Loading more...</span>
                  </div>
                ) : (
                  <div className="h-4" />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
