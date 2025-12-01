import { useState, useEffect, useRef, useCallback } from 'react';
import { apiService } from '../services/api';
import { useFeatures, useUI } from '../contexts/ConfigContext';
import { Photo } from '../stores/photoStore';
import { usePresets } from '../hooks/usePresets';
import { useAdminMode } from '../hooks/useAdminMode';

interface BeforeAfterViewerProps {
  photoId: string;
  isOpen: boolean;
  onClose: () => void;
  photos?: Photo[];
  onNavigate?: (photoId: string) => void;
}

export function BeforeAfterViewer({ photoId, isOpen, onClose, photos = [], onNavigate }: BeforeAfterViewerProps) {
  const features = useFeatures();
  const uiConfig = useUI();
  const { getPresetName } = usePresets();
  const isAdminMode = useAdminMode();
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sliderPosition, setSliderPosition] = useState(uiConfig.beforeAfterSliderPosition);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset slider position when opening or changing photo
  useEffect(() => {
    if (isOpen) {
      setSliderPosition(uiConfig.beforeAfterSliderPosition);
    }
  }, [isOpen, photoId, uiConfig.beforeAfterSliderPosition]);

  // Find current photo index and determine if navigation is possible
  const currentPhotoIndex = photos.findIndex(p => p.id === photoId);
  const canNavigatePrev = currentPhotoIndex > 0;
  const canNavigateNext = currentPhotoIndex < photos.length - 1;

  // Navigation handlers
  const navigateToPrevious = useCallback(() => {
    if (canNavigatePrev && onNavigate) {
      const prevPhoto = photos[currentPhotoIndex - 1];
      if (prevPhoto.status === 'completed' || prevPhoto.status === 'failed') {
        onNavigate(prevPhoto.id);
      }
    }
  }, [currentPhotoIndex, canNavigatePrev, photos, onNavigate]);

  const navigateToNext = useCallback(() => {
    if (canNavigateNext && onNavigate) {
      const nextPhoto = photos[currentPhotoIndex + 1];
      if (nextPhoto.status === 'completed' || nextPhoto.status === 'failed') {
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

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    updatePosition(touch.clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    updatePosition(touch.clientX);
  };

  const updatePosition = (clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    // Clamp between 0 and 100
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    setSliderPosition(clampedPercentage);
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

  const handleDownloadOriginal = () => {
    apiService.downloadPhoto(photoId);
  };

  const handleDownloadTransformed = () => {
    if (photo?.preset) {
      apiService.downloadPhoto(photoId, photo.preset);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 relative z-40">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <svg
              className="w-5 h-5 text-zinc-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Before & After Comparison
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {photos.length > 0 && `Photo ${currentPhotoIndex + 1} of ${photos.length}`}
            </p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={navigateToPrevious}
            disabled={!canNavigatePrev}
            className={`p-2 rounded-lg transition-colors ${
              canNavigatePrev
                ? 'hover:bg-zinc-800 text-white'
                : 'text-zinc-600 cursor-not-allowed'
            }`}
            title="Previous photo (←)"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={navigateToNext}
            disabled={!canNavigateNext}
            className={`p-2 rounded-lg transition-colors ${
              canNavigateNext
                ? 'hover:bg-zinc-800 text-white'
                : 'text-zinc-600 cursor-not-allowed'
            }`}
            title="Next photo (→)"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
          </div>
        ) : photo ? (
          <div className={`flex flex-col h-full ${
            (isAdminMode && (features.showBeforeAfterInfo || features.showDownloadButtons)) ? 'p-6' : 'p-4'
          }`}>
            {/* Comparison Viewer */}
            <div
              ref={containerRef}
              className={`relative overflow-hidden rounded-xl cursor-ew-resize bg-black flex-1 ${
                (isAdminMode && (features.showBeforeAfterInfo || features.showDownloadButtons)) ? 'mb-6' : ''
              }`}
              style={{
                minHeight: (isAdminMode && (features.showBeforeAfterInfo || features.showDownloadButtons)) ? '400px' : '600px',
                height: (isAdminMode && (features.showBeforeAfterInfo || features.showDownloadButtons)) ? '500px' : 'auto'
              }}
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
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl pointer-events-none"
                  style={{
                    left: `${sliderPosition}%`,
                    boxShadow: '0 0 20px rgba(255,255,255,0.5)'
                  }}
                >
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-3 shadow-lg">
                    <svg
                      className="w-5 h-5 text-black"
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
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <span className="text-white text-sm font-medium">Original</span>
              </div>
              {photo.status === 'completed' && (
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <span className="text-white text-sm font-medium">
                    {getPresetName(photo.preset)}
                  </span>
                </div>
              )}

              {/* Drag instruction (shows briefly) */}
              {photo.status === 'completed' && !isDragging && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg pointer-events-none">
                  <span className="text-white/80 text-xs">Drag to compare</span>
                </div>
              )}
            </div>

            {/* Photo Info */}
            {isAdminMode && features.showBeforeAfterInfo && (
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                  <div className="text-zinc-500 mb-1">Status</div>
                  <div className="text-white font-medium capitalize">{photo.status}</div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                  <div className="text-zinc-500 mb-1">Style</div>
                  <div className="text-white font-medium">
                    {getPresetName(photo.preset)}
                  </div>
                </div>
                {photo.processingTime && (
                  <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="text-zinc-500 mb-1">Processing Time</div>
                    <div className="text-white font-medium">
                      {(photo.processingTime / 1000).toFixed(2)}s
                    </div>
                  </div>
                )}
                {photo.provider && (
                  <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                    <div className="text-zinc-500 mb-1">Provider</div>
                    <div className="text-white font-medium capitalize">
                      {photo.provider.replace('-', ' ')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {isAdminMode && features.showDownloadButtons && (
              <div className="flex gap-4">
                <button
                  onClick={handleDownloadOriginal}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-zinc-700"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Original
                </button>
                {photo.status === 'completed' && (
                  <button
                    onClick={handleDownloadTransformed}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-red-600/20"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Transformed
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-zinc-400">Failed to load photo details</p>
          </div>
        )}
      </div>
    </div>
  );
}