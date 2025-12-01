import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService, api } from '../../services/api';
import { useUI } from '../../contexts/ConfigContext';
import { Photo, usePhotoStore } from '../../stores/photoStore';
import { usePresets } from '../../hooks/usePresets';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

interface MobileBeforeAfterViewerProps {
  photoId: string;
  isOpen: boolean;
  onClose: () => void;
  photos?: Photo[];
  onNavigate?: (photoId: string) => void;
}

export function MobileBeforeAfterViewer({
  photoId,
  isOpen,
  onClose,
  photos = [],
  onNavigate
}: MobileBeforeAfterViewerProps) {
  const uiConfig = useUI();
  const { getPresetName } = usePresets();
  const { hasMore, loading: storeLoading, fetchPhotos } = usePhotoStore();
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sliderPosition, setSliderPosition] = useState(uiConfig.beforeAfterSliderPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll for thumbnail strip
  const handleLoadMore = useCallback(() => {
    fetchPhotos(false);
  }, [fetchPhotos]);

  const thumbnailStripRef = useInfiniteScroll({
    hasMore,
    loading: storeLoading,
    onLoadMore: handleLoadMore,
    threshold: 100,
    enabled: isOpen && photos.length > 0,
    direction: 'horizontal',
  });

  // Swipe navigation state
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [isSwipeNavigating, setIsSwipeNavigating] = useState(false);

  // Reset slider position when opening or changing photo
  useEffect(() => {
    if (isOpen) {
      setSliderPosition(uiConfig.beforeAfterSliderPosition);
    }
  }, [isOpen, photoId, uiConfig.beforeAfterSliderPosition]);

  // Navigation
  const currentPhotoIndex = photos.findIndex(p => p.id === photoId);
  const canNavigatePrev = currentPhotoIndex > 0;
  const canNavigateNext = currentPhotoIndex < photos.length - 1;

  const navigateToPrevious = useCallback(() => {
    if (canNavigatePrev && onNavigate) {
      const prevPhoto = photos[currentPhotoIndex - 1];
      if (prevPhoto.status === 'completed') {
        onNavigate(prevPhoto.id);
      }
    }
  }, [currentPhotoIndex, canNavigatePrev, photos, onNavigate]);

  const navigateToNext = useCallback(() => {
    if (canNavigateNext && onNavigate) {
      const nextPhoto = photos[currentPhotoIndex + 1];
      if (nextPhoto.status === 'completed') {
        onNavigate(nextPhoto.id);
      }
    }
  }, [currentPhotoIndex, canNavigateNext, photos, onNavigate]);

  useEffect(() => {
    if (isOpen && photoId) {
      fetchPhoto();
    }
  }, [isOpen, photoId]);

  const fetchPhoto = async () => {
    try {
      setLoading(true);
      const data = await apiService.getPhoto(photoId);
      setPhoto(data);
    } catch (error) {
      console.error('Failed to fetch photo details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Swipe navigation handlers
  const handleSwipeStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwipeStartX(touch.clientX);
    setSwipeStartY(touch.clientY);
    setIsSwipeNavigating(false);
  };

  const handleSwipeMove = (e: React.TouchEvent) => {
    if (swipeStartX === null || swipeStartY === null) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;

    // Determine if this is a horizontal swipe (for navigation) or vertical
    if (!isSwipeNavigating && Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      setIsSwipeNavigating(true);
    }
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (swipeStartX === null) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeStartX;
    const threshold = 80; // Minimum swipe distance

    if (isSwipeNavigating) {
      if (deltaX > threshold && canNavigatePrev) {
        navigateToPrevious();
      } else if (deltaX < -threshold && canNavigateNext) {
        navigateToNext();
      }
    }

    setSwipeStartX(null);
    setSwipeStartY(null);
    setIsSwipeNavigating(false);
  };

  // Slider touch handlers (for before/after comparison)
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only start slider drag if not swiping for navigation
    if (!isSwipeNavigating) {
      setIsDragging(true);
      const touch = e.touches[0];
      updatePosition(touch.clientX);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || isSwipeNavigating) return;
    const touch = e.touches[0];
    updatePosition(touch.clientX);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updatePosition = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateToPrevious();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateToNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, navigateToPrevious, navigateToNext, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col animate-slide-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
          <div>
            <h3 className="text-base font-semibold text-white">Before & After</h3>
            <span className="text-xs text-zinc-500">
              {photos.length > 0 && `Photo ${currentPhotoIndex + 1} of ${photos.length}`}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={navigateToPrevious}
            disabled={!canNavigatePrev}
            className={`p-2 rounded-lg transition-colors ${
              canNavigatePrev ? 'hover:bg-zinc-800 text-white' : 'text-zinc-600 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={navigateToNext}
            disabled={!canNavigateNext}
            className={`p-2 rounded-lg transition-colors ${
              canNavigateNext ? 'hover:bg-zinc-800 text-white' : 'text-zinc-600 cursor-not-allowed'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content - with swipe navigation */}
      <div
        className="flex-1 min-h-0 overflow-hidden p-4"
        onTouchStart={handleSwipeStart}
        onTouchMove={handleSwipeMove}
        onTouchEnd={handleSwipeEnd}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : photo ? (
          <div
            ref={containerRef}
            className="relative h-full overflow-hidden rounded-lg cursor-ew-resize bg-black"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* Original Image */}
            <img
              src={`/api/photos/${photoId}/original`}
              alt="Original"
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
              style={{ userSelect: 'none' }}
            />

            {/* Transformed Image with Clipping */}
            {photo.status === 'completed' && (
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={`/api/photos/${photoId}/transformed/${photo.preset}`}
                  alt="Transformed"
                  className="absolute inset-0 w-full h-full object-contain"
                  draggable={false}
                  style={{ userSelect: 'none' }}
                />
              </div>
            )}

            {/* Slider Handle */}
            {photo.status === 'completed' && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
                style={{
                  left: `${sliderPosition}%`,
                  boxShadow: '0 0 10px rgba(255,255,255,0.5)'
                }}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-1.5 shadow-lg">
                  <svg
                    className="w-3 h-3 text-black"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M8 12L4 8m0 0l4-4m-4 4h16m-4 4l4 4m0 0l-4 4" />
                  </svg>
                </div>
              </div>
            )}

            {/* Labels */}
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
              <span className="text-white text-[10px] font-medium">Original</span>
            </div>
            {photo.status === 'completed' && (
              <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
                <span className="text-white text-[10px] font-medium">
                  {getPresetName(photo.preset)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-400 text-sm">Failed to load photo</p>
          </div>
        )}
      </div>

      {/* Thumbnail Gallery Strip */}
      {photos.length > 0 && (
        <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-900 px-2 py-3">
          <div
            ref={thumbnailStripRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide"
          >
            {photos.filter(p => p.status === 'completed').map((p) => (
              <button
                key={p.id}
                onClick={() => onNavigate?.(p.id)}
                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  p.id === photoId
                    ? 'border-white ring-1 ring-white/50'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={api.getPhotoUrl(p.id, p.preset)}
                  alt="Thumbnail"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
            {/* Loading indicator for infinite scroll */}
            {hasMore && storeLoading && (
              <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-t-transparent border-zinc-500"></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
