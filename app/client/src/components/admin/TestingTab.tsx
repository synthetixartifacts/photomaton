import React, { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import type { TestingTabProps } from './types';

export const TestingTab: React.FC<TestingTabProps> = ({ config }) => {
  const { addNotification } = useUIStore();
  const [selectedProvider, setSelectedProvider] = useState<string>(config.providers.activeProvider || 'mock');
  const [selectedPreset, setSelectedPreset] = useState<string>('toon-yellow');
  const [inputMethod, setInputMethod] = useState<'upload' | 'camera'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{
    original: string;
    transformed: string;
    provider: string;
    preset: string;
    duration: number;
  } | null>(null);

  // Available providers
  const availableProviders = [
    { id: 'mock', name: 'Mock (Local)', description: 'Fast local transformations using Sharp filters' },
    { id: 'gemini-imagen', name: 'Google Gemini', description: 'Google\'s advanced AI for image generation' }
  ];

  // Get available presets from config
  const availablePresets = config.presets.availablePresets.filter(preset => preset.enabled);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setResults(null);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            setSelectedFile(file);
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            setResults(null);
          }
        }, 'image/jpeg', 0.9);
      }

      // Stop camera
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Camera capture failed:', error);
      addNotification('error', 'Failed to access camera');
    }
  };

  const handleTest = async () => {
    if (!selectedFile) {
      addNotification('error', 'Please select an image first');
      return;
    }

    setIsProcessing(true);
    const startTime = Date.now();

    try {
      // First, upload the image
      const formData = new FormData();
      formData.append('image', selectedFile);
      if (selectedPreset) {
        formData.append('preset', selectedPreset);
      }

      const captureResponse = await fetch('/api/capture', {
        method: 'POST',
        body: formData,
      });

      if (!captureResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const captureResult = await captureResponse.json();
      const photoId = captureResult.id;

      // Then, request transformation with selected provider
      const transformResponse = await fetch('/api/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoId,
          preset: selectedPreset,
          options: {
            provider: selectedProvider
          }
        }),
      });

      if (!transformResponse.ok) {
        throw new Error('Failed to start transformation');
      }

      const transformResult = await transformResponse.json();
      const jobId = transformResult.jobId;

      // Poll for completion
      let completed = false;
      let attempts = 0;
      const maxAttempts = 60; // 1 minute max

      while (!completed && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`/api/transform/job/${jobId}`);
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          
          if (status.status === 'completed') {
            completed = true;
            const duration = Date.now() - startTime;
            
            // Set results
            setResults({
              original: `/api/photos/${photoId}/original`,
              transformed: `/api/photos/${photoId}/transformed/${selectedPreset}`,
              provider: selectedProvider,
              preset: selectedPreset,
              duration: Math.round(duration / 1000)
            });
            
            addNotification('success', `Transformation completed in ${Math.round(duration / 1000)}s`);
          } else if (status.status === 'failed') {
            throw new Error(status.error || 'Transformation failed');
          }
        }
        attempts++;
      }

      if (!completed) {
        throw new Error('Transformation timed out');
      }

    } catch (error) {
      console.error('Test failed:', error);
      addNotification('error', `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">API Testing Interface</h3>
        <p className="text-zinc-400 mb-6">
          Test image generation with different providers, presets, and input methods.
        </p>
      </div>

      {/* Provider Selection */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Select Provider
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-500"
        >
          {availableProviders.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name} - {provider.description}
            </option>
          ))}
        </select>
      </div>

      {/* Preset Selection */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Select Effect/Preset
        </label>
        <select
          value={selectedPreset}
          onChange={(e) => setSelectedPreset(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-zinc-500"
        >
          {availablePresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.icon} {preset.name} - {preset.description}
            </option>
          ))}
        </select>
      </div>

      {/* Input Method Selection */}
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Input Method
        </label>
        <div className="flex space-x-4">
          <button
            onClick={() => setInputMethod('upload')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              inputMethod === 'upload'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
          >
            📁 File Upload
          </button>
          <button
            onClick={() => setInputMethod('camera')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              inputMethod === 'camera'
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
          >
            Camera Capture
          </button>
        </div>
      </div>

      {/* File Input */}
      {inputMethod === 'upload' && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Select Image File
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-700 file:text-white hover:file:bg-zinc-600"
          />
        </div>
      )}

      {/* Camera Capture */}
      {inputMethod === 'camera' && (
        <div>
          <button
            onClick={handleCameraCapture}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Capture from Camera
          </button>
        </div>
      )}

      {/* Image Preview */}
      {previewUrl && (
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Selected Image
          </label>
          <div className="bg-zinc-800 rounded-lg p-4">
            <img
              src={previewUrl}
              alt="Preview"
              className="max-w-full max-h-64 rounded-lg mx-auto"
            />
          </div>
        </div>
      )}

      {/* Test Button */}
      <div className="flex space-x-4">
        <button
          onClick={handleTest}
          disabled={!selectedFile || isProcessing}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            !selectedFile || isProcessing
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            '🚀 Test Transformation'
          )}
        </button>

        {(selectedFile || results) && (
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            🗑️ Clear
          </button>
        )}
      </div>

      {/* Results */}
      {results && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Transformation Results</h4>
          <div className="bg-zinc-800 rounded-lg p-4 space-y-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-zinc-400">Provider</div>
                <div className="text-white font-medium">{results.provider}</div>
              </div>
              <div>
                <div className="text-zinc-400">Preset</div>
                <div className="text-white font-medium">{results.preset}</div>
              </div>
              <div>
                <div className="text-zinc-400">Duration</div>
                <div className="text-white font-medium">{results.duration}s</div>
              </div>
              <div>
                <div className="text-zinc-400">Status</div>
                <div className="text-green-400 font-medium">✅ Success</div>
              </div>
            </div>

            {/* Before/After Images */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-zinc-400 text-sm mb-2">Original</div>
                <img
                  src={results.original}
                  alt="Original"
                  className="w-full rounded-lg bg-zinc-700"
                  onError={(e) => {
                    console.error('Failed to load original image');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <div className="text-zinc-400 text-sm mb-2">Transformed</div>
                <img
                  src={results.transformed}
                  alt="Transformed"
                  className="w-full rounded-lg bg-zinc-700"
                  onError={(e) => {
                    console.error('Failed to load transformed image');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
