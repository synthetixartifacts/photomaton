import React from 'react';
import { MobileEffectsBar } from './MobileEffectsBar';
import { MobileGalleryOverlay } from './MobileGalleryOverlay';
import { MobileBeforeAfterViewer } from './MobileBeforeAfterViewer';
import { RemainingPhotosDisplay } from '../RemainingPhotosDisplay';
import { useUIStore } from '../../stores/uiStore';
import { usePhotoStore, Photo } from '../../stores/photoStore';
import { PresetType } from '@photomaton/shared';

interface MobileLayoutProps {
  userMenuButton?: React.ReactNode;
  adminButton?: React.ReactNode;
  camera: React.ReactNode;
  captureButton: React.ReactNode;
  selectedPreset: PresetType;
  onPresetChange: (preset: PresetType) => void;
  presetDisabled?: boolean;
  isIdle?: boolean;
  selectedPhotoId: string | null;
  showViewer: boolean;
  onPhotoClick: (photo: Photo) => void;
  onViewerClose: () => void;
  refreshTrigger: number;
  modals?: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  userMenuButton,
  adminButton,
  camera,
  captureButton,
  selectedPreset,
  onPresetChange,
  presetDisabled = false,
  isIdle = true,
  selectedPhotoId,
  showViewer,
  onPhotoClick,
  onViewerClose,
  refreshTrigger,
  modals,
}) => {
  const { showMobileGallery, toggleMobileGallery } = useUIStore();
  const photos = usePhotoStore((state) => state.photos);

  // When viewing a photo, show fullscreen viewer
  const showPhotoViewer = selectedPhotoId && showViewer;

  return (
    <div className="h-screen w-screen bg-black flex flex-col overflow-hidden">
      {/* Fixed position buttons (rendered but use fixed positioning) */}
      {userMenuButton}
      {adminButton}

      {/* Camera area - fills available space with top padding for buttons */}
      <div className="flex-1 relative overflow-hidden pt-12">
        {camera}

        {/* Top center display - remaining photos (only when idle) */}
        {isIdle && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20">
            <RemainingPhotosDisplay />
          </div>
        )}

        {/* Capture button - positioned at bottom center of camera area */}
        {captureButton && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            {captureButton}
          </div>
        )}
      </div>

      {/* Bottom effects bar - hidden during capture workflow */}
      {isIdle && (
        <MobileEffectsBar
          selectedPreset={selectedPreset}
          onPresetChange={onPresetChange}
          disabled={presetDisabled}
        />
      )}

      {/* Fullscreen photo viewer overlay */}
      {showPhotoViewer && (
        <MobileBeforeAfterViewer
          photoId={selectedPhotoId}
          isOpen={showViewer}
          onClose={onViewerClose}
          photos={photos}
          onNavigate={(photoId) => {
            usePhotoStore.getState().selectPhoto(photoId);
          }}
        />
      )}

      {/* Fullscreen gallery overlay */}
      <MobileGalleryOverlay
        isOpen={showMobileGallery}
        onClose={() => toggleMobileGallery(false)}
        onPhotoClick={onPhotoClick}
        refreshTrigger={refreshTrigger}
      />

      {/* Modals */}
      {modals}
    </div>
  );
};
