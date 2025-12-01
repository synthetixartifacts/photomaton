import React, { useState, useEffect } from 'react';
import { useCamera as useCameraHook } from '../../hooks/useCamera';
import type { CameraTabProps } from './types';

interface CameraDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

export const CameraTab: React.FC<CameraTabProps> = ({ camera, onSave }) => {
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(camera.deviceId);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  // Load available camera devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        setIsLoadingDevices(true);
        setDeviceError(null);

        // First request camera permission to get device labels
        // Without permission, device labels will be empty
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          // Stop the stream immediately, we just needed permission
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.warn('Camera permission not granted:', err);
          setDeviceError('Camera permission required to list devices');
        }

        // Now enumerate devices
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices
          .filter(device => device.kind === 'videoinput')
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${index + 1}`,
            groupId: device.groupId
          }));

        setDevices(videoDevices);

        // If no device is selected and we have devices, select the first one
        if (!selectedDeviceId && videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
        setDeviceError('Failed to load camera devices');
      } finally {
        setIsLoadingDevices(false);
      }
    };

    loadDevices();
  }, []);

  const handleSave = () => {
    onSave({
      ...camera,
      deviceId: selectedDeviceId
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Camera Settings</h3>
        <p className="text-zinc-400 mb-6">
          Select which camera to use for photo capture. The preview below shows the currently selected camera feed.
        </p>
      </div>

      {/* Camera Device Selection */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Select Camera Device
        </label>

        {isLoadingDevices ? (
          <div className="bg-zinc-800 rounded-lg p-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500 mx-auto mb-2"></div>
            <p className="text-zinc-400 text-sm">Loading camera devices...</p>
          </div>
        ) : deviceError ? (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <p className="text-red-400 text-sm">{deviceError}</p>
            <p className="text-zinc-400 text-xs mt-2">
              Please allow camera access in your browser to see available cameras.
            </p>
          </div>
        ) : devices.length === 0 ? (
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-400 text-sm">No camera devices found</p>
            <p className="text-zinc-400 text-xs mt-2">
              Please connect a camera and refresh the page.
            </p>
          </div>
        ) : (
          <select
            value={selectedDeviceId || ''}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-500"
          >
            <option value="">Default Camera</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        )}

        <p className="text-zinc-500 text-xs mt-2">
          {devices.length} camera device(s) detected
        </p>
      </div>

      {/* Live Preview */}
      {selectedDeviceId && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Live Preview
          </label>
          <div className="bg-zinc-800 rounded-lg p-4">
            <CameraPreview key={selectedDeviceId} deviceId={selectedDeviceId} />
          </div>
          <p className="text-zinc-500 text-xs mt-2">
            This preview shows the feed from the currently selected camera device.
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-4 border-t border-zinc-700">
        <button
          onClick={handleSave}
          disabled={isLoadingDevices}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            isLoadingDevices
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-zinc-700 hover:bg-zinc-600 text-white'
          }`}
        >
          Save Camera Settings
        </button>

        {camera.deviceId && (
          <button
            onClick={() => {
              setSelectedDeviceId(undefined);
              onSave({ ...camera, deviceId: undefined });
            }}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            Reset to Default
          </button>
        )}
      </div>

      {/* Current Settings Info */}
      <div className="bg-zinc-800 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-zinc-300 mb-2">Current Settings</h4>
        <div className="text-xs text-zinc-400 space-y-1">
          <div>
            <span className="font-medium">Device ID:</span>{' '}
            {camera.deviceId || 'Default (not set)'}
          </div>
          <div>
            <span className="font-medium">Resolution:</span>{' '}
            {camera.width}x{camera.height}
          </div>
          <div>
            <span className="font-medium">Facing Mode:</span>{' '}
            {camera.facingMode}
          </div>
        </div>
      </div>
    </div>
  );
};

// Separate component for camera preview to isolate hook usage
const CameraPreview: React.FC<{ deviceId: string }> = ({ deviceId }) => {
  const { videoRef, isLoading, error, hasPermission } = useCameraHook({
    deviceId,
    width: 1280,
    height: 720
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-zinc-900 rounded-lg h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-500 mx-auto mb-2"></div>
          <p className="text-zinc-400 text-sm">Loading camera preview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center bg-zinc-900 rounded-lg h-64">
        <div className="text-center p-4">
          <div className="text-red-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 text-sm font-medium">Camera Preview Error</p>
          <p className="text-zinc-400 text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden h-64">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain transform scale-x-[-1]"
      />
      {!hasPermission && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
          <p className="text-zinc-400 text-sm">Waiting for camera permission...</p>
        </div>
      )}
    </div>
  );
};