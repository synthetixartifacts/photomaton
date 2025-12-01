import React from 'react';

interface AppLayoutProps {
  userMenuButton?: React.ReactNode;
  adminButton: React.ReactNode;
  leftSidebar: React.ReactNode;
  camera: React.ReactNode;
  captureButton: React.ReactNode;
  rightSidebar: React.ReactNode;
  modals?: React.ReactNode;
  topCenterDisplay?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  userMenuButton,
  adminButton,
  leftSidebar,
  camera,
  captureButton,
  rightSidebar,
  modals,
  topCenterDisplay,
}) => {
  return (
    <div className="h-screen w-screen bg-black flex overflow-hidden">
      {/* User menu button - fixed top left */}
      {userMenuButton}

      {/* Admin button - fixed top right */}
      {adminButton}

      {/* Left sidebar - Effects/Presets - conditionally rendered with transition */}
      {leftSidebar && (
        <div className="w-[354px] bg-zinc-950 border-r border-zinc-800 flex flex-col h-full transition-all duration-300 ease-in-out">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {leftSidebar}
          </div>
        </div>
      )}

      {/* Main camera section - full width between sidebars */}
      <div className="flex-1 flex flex-col relative h-full transition-all duration-300 ease-in-out">
        {/* Camera view - full height */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {camera}

          {/* Top center display - photo limit info */}
          {topCenterDisplay && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
              {topCenterDisplay}
            </div>
          )}

          {/* Capture button - positioned at bottom center of video */}
          {captureButton && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
              {captureButton}
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar - Gallery - conditionally rendered with transition */}
      {rightSidebar && (
        <div className="w-[354px] bg-zinc-950 border-l border-zinc-800 flex flex-col h-full transition-all duration-300 ease-in-out">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {rightSidebar}
          </div>
        </div>
      )}

      {/* Modals */}
      {modals}
    </div>
  );
};