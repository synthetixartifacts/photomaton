import { useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { usePhotoStore, Photo } from '../stores/photoStore';
import { useFeatures, useUI } from '../contexts/ConfigContext';
import { useAuth } from '../contexts/AuthContext';
import { usePresets } from '../hooks/usePresets';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { ImageIcon, Trash2, AlertCircle, RotateCcw, Download } from 'lucide-react';

interface PhotoCarouselProps {
  onPhotoClick?: (photo: Photo) => void;
  refreshTrigger?: number;
  highlightedPhotoId?: string | null;
}

export function PhotoCarousel({ onPhotoClick, refreshTrigger = 0, highlightedPhotoId }: PhotoCarouselProps) {
  const features = useFeatures();
  const ui = useUI();
  const { getPresetName } = usePresets();
  const { photos, loading, error, hasMore, fetchPhotos, setPageSize, removePhoto } = usePhotoStore();
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
    enabled: photos.length > 0,
  });

  // Update page size when config changes
  useEffect(() => {
    setPageSize(ui.galleryPageSize);
  }, [ui.galleryPageSize, setPageSize]);

  useEffect(() => {
    fetchPhotos(true);
  }, [refreshTrigger]);

  // Auto-refresh every 5 seconds if there are processing photos
  useEffect(() => {
    const hasProcessingPhotos = photos.some(p => p.status === 'processing');
    if (hasProcessingPhotos) {
      const interval = setInterval(() => {
        fetchPhotos(true);
      }, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [photos, fetchPhotos]);

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

  const handleDownload = (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    api.downloadPhoto(photo.id, photo.preset);
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

  if (loading && photos.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-base font-medium text-zinc-100">Gallery</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-5 h-5 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin mx-auto" />
            <p className="text-zinc-500 text-sm mt-2">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-base font-medium text-zinc-100">Gallery</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => fetchPhotos(true)}
              className="mt-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-white text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-base font-medium text-zinc-100">Gallery</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <ImageIcon className="w-10 h-10 text-zinc-700 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-zinc-500 text-sm">No photos yet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-base font-medium text-zinc-100">Gallery</h2>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          {photos.map((photo) => {
            const isProcessing = photo.status === 'processing' || photo.status === 'pending';
            const isFailed = photo.status === 'failed';
            const isHighlighted = highlightedPhotoId === photo.id;

            return (
              <div
                key={photo.id}
                onClick={() => !isProcessing && !isFailed && onPhotoClick?.(photo)}
                className={`
                  relative aspect-square rounded-lg overflow-hidden group
                  transition-all duration-150
                  border-2
                  ${isHighlighted ? 'border-white' : 'border-transparent'}
                  ${isProcessing || isFailed ? 'cursor-not-allowed' : 'cursor-pointer hover:border-zinc-700'}
                `}
              >
                {/* Thumbnail image */}
                <img
                  src={photo.status === 'completed' && photo.transformedPath
                    ? api.getPhotoUrl(photo.id, photo.preset)
                    : api.getPhotoUrl(photo.id, 'thumbnail')
                  }
                  alt="Photo"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Overlay with status - subtle, no gradient on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between text-[10px] text-white">
                      <span className="truncate">{getPresetName(photo.preset)}</span>
                      <div className={`
                        w-1.5 h-1.5 rounded-full flex-shrink-0 ml-1
                        ${photo.status === 'completed' ? 'bg-green-500' : ''}
                        ${photo.status === 'processing' ? 'bg-amber-500' : ''}
                        ${photo.status === 'failed' ? 'bg-red-500' : ''}
                        ${photo.status === 'pending' ? 'bg-zinc-500' : ''}
                      `} />
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="absolute top-1.5 right-1.5 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {features.showDownloadButtons && photo.status === 'completed' && (
                    <button
                      onClick={(e) => handleDownload(photo, e)}
                      className="p-1 bg-zinc-900/80 rounded hover:bg-zinc-700"
                    >
                      <Download className="w-3 h-3 text-white" />
                    </button>
                  )}
                  {features.enableDeletePicture && (
                    <button
                      onClick={(e) => handleDelete(photo.id, e)}
                      className="p-1 bg-zinc-900/80 rounded hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>

                {/* Processing indicator */}
                {isProcessing && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                    <div className="text-center">
                      <div className="w-6 h-6 border-2 border-zinc-400 border-t-white rounded-full animate-spin mx-auto mb-1" />
                      <p className="text-[10px] text-white">Processing</p>
                    </div>
                  </div>
                )}

                {/* Error indicator with retry */}
                {isFailed && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
                    <div className="text-center p-2">
                      <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                      <p className="text-[10px] text-white mb-1.5">Failed</p>
                      <button
                        onClick={(e) => handleRetry(photo, e)}
                        className="px-2 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-white text-[10px] rounded transition-colors flex items-center gap-1 mx-auto"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
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
                <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                <span>Loading more...</span>
              </div>
            ) : (
              <div className="h-4" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
