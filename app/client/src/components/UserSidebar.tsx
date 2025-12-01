import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTimings, useUI, useCameraConfig } from '../contexts/ConfigContext';
import { useUIStore } from '../stores/uiStore';
import { useIsMobile } from '../hooks/useIsMobile';
import { X, Download, Camera, LogOut, User, Video, RefreshCw, Images, Shield } from 'lucide-react';

interface UserSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

export const UserSidebar: React.FC<UserSidebarProps> = ({ isOpen, onClose }) => {
  const { account, logout, isAdmin, refreshAccount, photoLimitInfo } = useAuth();
  const timings = useTimings();
  const ui = useUI();
  const cameraConfig = useCameraConfig();
  const { toggleMobileGallery } = useUIStore();
  const isMobile = useIsMobile();
  const [downloading, setDownloading] = useState(false);
  const [downloadingOriginals, setDownloadingOriginals] = useState(false);

  // Camera device selection state
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Get user's saved preferences from account metadata
  const userPreferences = (account?.metadata as any)?.preferences || {};
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
    userPreferences.cameraDeviceId ?? cameraConfig.deviceId
  );

  // Load camera devices when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadCameraDevices();
    }
  }, [isOpen]);

  // Sync selected device with user preference or config
  useEffect(() => {
    setSelectedDeviceId(userPreferences.cameraDeviceId ?? cameraConfig.deviceId);
  }, [userPreferences.cameraDeviceId, cameraConfig.deviceId]);

  const loadCameraDevices = async () => {
    try {
      setIsLoadingDevices(true);
      setDeviceError(null);

      // Request camera permission to get device labels
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn('Camera permission not granted:', err);
        setDeviceError('Camera permission required');
        setIsLoadingDevices(false);
        return;
      }

      // Enumerate devices
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
        }));

      setDevices(videoDevices);
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      setDeviceError('Failed to load cameras');
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleCameraChange = async (deviceId: string | undefined) => {
    setSelectedDeviceId(deviceId);
    try {
      const response = await fetch('/auth/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          preferences: {
            cameraDeviceId: deviceId || null,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preference');
      }

      await refreshAccount();
    } catch (error) {
      console.error('Failed to save camera setting:', error);
    }
  };

  // Generic handler for saving any user preference
  const handlePreferenceChange = async (key: string, value: any) => {
    try {
      const response = await fetch('/auth/me/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          preferences: {
            [key]: value,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preference');
      }

      await refreshAccount();
    } catch (error) {
      console.error(`Failed to save ${key} setting:`, error);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setDownloading(true);

      const response = await fetch('/api/photos/export/all', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photomaton-export-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download photos. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadOriginals = async () => {
    try {
      setDownloadingOriginals(true);

      const response = await fetch('/api/photos/export/originals', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photomaton-originals-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download originals failed:', error);
      alert('Failed to download original photos. Please try again.');
    } finally {
      setDownloadingOriginals(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-80 bg-zinc-900 z-50 shadow-xl transform transition-transform">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-zinc-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-white font-medium text-sm truncate">{account?.name || 'User'}</h2>
              <p className="text-xs text-zinc-500 truncate">{account?.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors flex-shrink-0 p-1"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100vh-80px)]">
          {/* Role Badge - NO emoji, NO rounded-full, NO blue */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Shield className="w-3.5 h-3.5" />
            <span>{isAdmin ? 'Admin' : 'User'}</span>
          </div>

          {/* Photo Quota Display */}
          {photoLimitInfo && (
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  Photos
                </span>
                {photoLimitInfo.limit === null ? (
                  <span className="text-zinc-300 text-sm font-medium">Unlimited</span>
                ) : (
                  <span className={`text-sm font-medium ${
                    photoLimitInfo.remaining !== null && photoLimitInfo.remaining <= 10
                      ? 'text-amber-400'
                      : 'text-zinc-300'
                  }`}>
                    {photoLimitInfo.remaining} / {photoLimitInfo.limit} left
                  </span>
                )}
              </div>
              {photoLimitInfo.isLimitReached && (
                <p className="text-red-400 text-xs mt-1">
                  Limit reached - delete photos to continue
                </p>
              )}
            </div>
          )}

          {/* Gallery Button - Mobile Only - NOT purple */}
          {isMobile && (
            <button
              onClick={() => {
                toggleMobileGallery(true);
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              <Images className="w-4 h-4" />
              <span>View Gallery</span>
            </button>
          )}

          {/* Download Buttons - NOT green/blue, use zinc */}
          <div className="space-y-2">
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:text-zinc-600 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Downloading...' : 'Transformed Photos'}</span>
            </button>
            <button
              onClick={handleDownloadOriginals}
              disabled={downloadingOriginals}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800/50 disabled:text-zinc-600 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingOriginals ? 'Downloading...' : 'Original Photos'}</span>
            </button>
          </div>

          {/* Camera Configuration */}
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <h3 className="text-zinc-300 text-sm font-medium flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>Camera Settings</span>
            </h3>

            {/* Camera Device Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  <span>Camera Device</span>
                </label>
                <button
                  onClick={loadCameraDevices}
                  disabled={isLoadingDevices}
                  className="text-zinc-500 hover:text-white transition-colors p-1"
                  title="Refresh camera list"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDevices ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isLoadingDevices ? (
                <div className="bg-zinc-800 rounded-lg px-3 py-2 text-center">
                  <span className="text-zinc-500 text-xs">Loading cameras...</span>
                </div>
              ) : deviceError ? (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2">
                  <p className="text-red-400 text-xs">{deviceError}</p>
                  <button
                    onClick={loadCameraDevices}
                    className="text-xs text-zinc-500 hover:text-white mt-1"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <select
                  value={selectedDeviceId || ''}
                  onChange={(e) => handleCameraChange(e.target.value || undefined)}
                  className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
                >
                  <option value="">Default Camera</option>
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              )}

              {devices.length > 0 && !deviceError && (
                <p className="text-zinc-600 text-xs">
                  {devices.length} camera{devices.length !== 1 ? 's' : ''} detected
                </p>
              )}
            </div>

            {/* Countdown Duration */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Countdown Duration</label>
              <select
                value={userPreferences.countdownSeconds ?? timings.countdownSeconds ?? 5}
                onChange={(e) => handlePreferenceChange('countdownSeconds', parseInt(e.target.value))}
                className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
              >
                <option value="3">3 seconds</option>
                <option value="5">5 seconds</option>
                <option value="7">7 seconds</option>
                <option value="10">10 seconds</option>
              </select>
            </div>

            {/* Display Duration */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Result Display Duration</label>
              <select
                value={userPreferences.displayTransformedSeconds ?? timings.displayTransformedSeconds ?? 15}
                onChange={(e) => handlePreferenceChange('displayTransformedSeconds', parseInt(e.target.value))}
                className="w-full bg-zinc-800 text-white text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:border-zinc-500 focus:outline-none"
              >
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
                <option value="15">15 seconds</option>
                <option value="20">20 seconds</option>
                <option value="30">30 seconds</option>
              </select>
            </div>

            {/* Countdown Overlay Opacity */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">
                Countdown Overlay: {Math.round((userPreferences.countdownBackgroundOpacity ?? ui.countdownBackgroundOpacity ?? 0.8) * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={userPreferences.countdownBackgroundOpacity ?? ui.countdownBackgroundOpacity ?? 0.8}
                onChange={(e) => handlePreferenceChange('countdownBackgroundOpacity', parseFloat(e.target.value))}
                className="w-full accent-zinc-400"
              />
            </div>
          </div>

          {/* Logout - red is ok for destructive action */}
          <div className="pt-2 border-t border-zinc-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/30 py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
