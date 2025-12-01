import { useState, useEffect } from 'react';
import { AppLayout } from './components/AppLayout';
import { AdminButton } from './components/AdminButton';
import { UserMenuButton } from './components/UserMenuButton';
import { CameraFeed } from './components/CameraFeed';
import { CountdownOverlay } from './components/CountdownOverlay';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { CaptureButton } from './components/CaptureButton';
import { EffectsSidebar } from './components/EffectsSidebar';
import { PhotoCarousel } from './components/PhotoCarousel';
import { BeforeAfterViewer } from './components/BeforeAfterViewer';
import { AdminPanel } from './components/AdminPanel';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MobileLayout } from './components/mobile';
import { RemainingPhotosDisplay } from './components/RemainingPhotosDisplay';
import { useCaptureWorkflow } from './hooks/useCaptureWorkflow';
import { usePhotoGallery } from './hooks/usePhotoGallery';
import { useIsMobile } from './hooks/useIsMobile';
import { useConfig } from './contexts/ConfigContext';
import { usePhotoStore } from './stores/photoStore';
import { presetService } from './services/PresetService';
import { PresetType } from '@photomaton/shared';

function App() {
  const { loading: configLoading, error: configError } = useConfig();
  const isMobile = useIsMobile();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [displayCountdown, setDisplayCountdown] = useState<number | null>(null);

  const {
    selectedPreset,
    countdownValue,
    capturedImageUrl,
    transformedImageUrl,
    startCapture,
    captureImage,
    setPreset,
    complete,
    isIdle,
    isCountingDown,
    isCapturing,
    isProcessing,
    isDisplaying,
  } = useCaptureWorkflow();

  const {
    selectedPhotoId,
    showViewer,
    onPhotoClick,
    onViewerClose,
  } = usePhotoGallery();

  // Load first enabled preset on mount
  useEffect(() => {
    const loadFirstPreset = async () => {
      try {
        const enabledPresets = await presetService.getEnabledPresets();
        if (enabledPresets.length > 0) {
          const firstPreset = enabledPresets[0].presetId as PresetType;
          setPreset(firstPreset);
        }
      } catch (error) {
        console.error('Failed to load initial preset:', error);
      }
    };
    loadFirstPreset();
  }, [setPreset]);

  // Trigger gallery refresh when photo starts processing
  useEffect(() => {
    if (isProcessing) {
      // Small delay to ensure the photo is created in the backend
      const timeout = setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [isProcessing]);

  // Reset display countdown when not processing or displaying
  useEffect(() => {
    if (!isProcessing && !isDisplaying) {
      setDisplayCountdown(null);
    }
  }, [isProcessing, isDisplaying]);

  // Spacebar to capture photo when ready
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only trigger if spacebar, system is idle, not showing viewer, and not typing in an input
      if (
        event.code === 'Space' &&
        isIdle &&
        !showViewer &&
        !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        startCapture();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isIdle, showViewer, startCapture]);

  // Loading state
  if (configLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading configuration...</div>
      </div>
    );
  }

  // Error state
  if (configError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-500 text-xl">Error loading configuration: {configError}</div>
      </div>
    );
  }

  // Hide sidebars during capture workflow (countdown, capturing, processing, displaying result)
  // But keep right sidebar visible when viewing a photo
  const showLeftSidebar = isIdle && !(selectedPhotoId && showViewer);
  const showRightSidebar = isIdle; // Always show when idle, even in viewer mode

  // Show remaining photos display only when idle (hide during countdown, processing, and displaying)
  const showRemainingPhotos = isIdle && !(selectedPhotoId && showViewer);

  // Shared camera content (used by both mobile and desktop)
  const cameraContent = (
    <>
      <CameraFeed
        onCapture={captureImage}
        frozen={isCapturing}
        className="w-full h-full"
      />

      {(isProcessing || isDisplaying) && (
        <ProcessingOverlay
          capturedImageUrl={capturedImageUrl}
          transformedImageUrl={transformedImageUrl}
          isProcessing={isProcessing}
          selectedPreset={selectedPreset}
          onComplete={() => {
            complete();
            setDisplayCountdown(null);
            // Trigger gallery refresh when processing is complete
            setRefreshTrigger(prev => prev + 1);
          }}
          onCountdownUpdate={setDisplayCountdown}
          isMobile={isMobile}
        />
      )}

      <CountdownOverlay
        seconds={countdownValue}
        active={isCountingDown}
        onComplete={() => {
          // Countdown complete, camera will auto-capture when frozen
        }}
        isMobile={isMobile}
      />
    </>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <ProtectedRoute>
        <MobileLayout
          userMenuButton={<UserMenuButton />}
          adminButton={<AdminButton />}
          camera={cameraContent}
          captureButton={
            <CaptureButton
              onClick={startCapture}
              disabled={!isIdle}
              isCapturing={!isIdle}
              displayCountdown={displayCountdown}
              isMobile={true}
            />
          }
          selectedPreset={selectedPreset}
          onPresetChange={setPreset}
          presetDisabled={!isIdle}
          isIdle={isIdle}
          selectedPhotoId={selectedPhotoId}
          showViewer={showViewer}
          onPhotoClick={onPhotoClick}
          onViewerClose={onViewerClose}
          refreshTrigger={refreshTrigger}
          modals={<AdminPanel />}
        />
      </ProtectedRoute>
    );
  }

  // Desktop layout
  return (
    <ProtectedRoute>
      <AppLayout
      userMenuButton={<UserMenuButton />}
      adminButton={<AdminButton />}
      leftSidebar={
        showLeftSidebar ? (
          <EffectsSidebar
            selectedPreset={selectedPreset}
            onPresetChange={setPreset}
            disabled={!isIdle}
          />
        ) : null
      }
      camera={
        selectedPhotoId && showViewer ? (
          <BeforeAfterViewer
            photoId={selectedPhotoId}
            isOpen={showViewer}
            onClose={onViewerClose}
            photos={usePhotoStore.getState().photos}
            onNavigate={(photoId) => {
              usePhotoStore.getState().selectPhoto(photoId);
            }}
          />
        ) : cameraContent
      }
      captureButton={
        selectedPhotoId && showViewer ? null : (
          <CaptureButton
            onClick={startCapture}
            disabled={!isIdle}
            isCapturing={!isIdle}
            displayCountdown={displayCountdown}
          />
        )
      }
      rightSidebar={
        showRightSidebar ? (
          <PhotoCarousel
            onPhotoClick={onPhotoClick}
            refreshTrigger={refreshTrigger}
            highlightedPhotoId={selectedPhotoId}
          />
        ) : null
      }
      topCenterDisplay={showRemainingPhotos ? <RemainingPhotosDisplay /> : null}
      modals={<AdminPanel />}
    />
    </ProtectedRoute>
  );
}

export default App;