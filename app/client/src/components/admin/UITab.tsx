import React, { useState } from 'react';
import type { UITabProps } from './types';

export const UITab: React.FC<UITabProps> = ({ ui, onSave }) => {
  const [values, setValues] = useState(ui);

  const handleNumberChange = (key: keyof typeof ui, value: number) => {
    setValues({ ...values, [key]: value });
  };

  const handleBooleanChange = (key: keyof typeof ui) => {
    setValues({ ...values, [key]: !values[key] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Display Settings</h3>
        <div className="space-y-4">
          {/* Countdown Background Opacity */}
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <label className="block text-white font-medium mb-2">
              Countdown Background Opacity
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={values.countdownBackgroundOpacity}
              onChange={(e) => handleNumberChange('countdownBackgroundOpacity', parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 text-white rounded border border-zinc-700 focus:border-zinc-500 focus:outline-none"
            />
            <p className="text-zinc-400 text-sm mt-1">
              Opacity of the countdown overlay (0-1)
            </p>
          </div>

          {/* Spinner Size */}
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <label className="block text-white font-medium mb-2">
              Spinner Size (Tailwind classes)
            </label>
            <input
              type="text"
              value={values.spinnerSize}
              onChange={(e) => setValues({ ...values, spinnerSize: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-800 text-white rounded border border-zinc-700 focus:border-zinc-500 focus:outline-none"
            />
            <p className="text-zinc-400 text-sm mt-1">
              Tailwind CSS classes for spinner size (e.g., "w-16 h-16")
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Gallery Settings</h3>
        <div className="space-y-4">
          {/* Enable Carousel Auto Refresh */}
          <div className="flex items-center justify-between bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div>
              <h4 className="text-white font-medium">Auto Refresh Gallery</h4>
              <p className="text-zinc-400 text-sm">
                Automatically refresh gallery to show new photos
              </p>
            </div>
            <button
              onClick={() => handleBooleanChange('enableCarouselAutoRefresh')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                values.enableCarouselAutoRefresh
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-400'
              }`}
            >
              {values.enableCarouselAutoRefresh ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          {/* Carousel Refresh Interval */}
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <label className="block text-white font-medium mb-2">
              Gallery Refresh Interval (ms)
            </label>
            <input
              type="number"
              min="1000"
              max="30000"
              step="1000"
              value={values.carouselRefreshIntervalMs}
              onChange={(e) => handleNumberChange('carouselRefreshIntervalMs', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 text-white rounded border border-zinc-700 focus:border-zinc-500 focus:outline-none"
            />
            <p className="text-zinc-400 text-sm mt-1">
              How often to refresh the gallery (1000-30000ms)
            </p>
          </div>

          {/* Max Photos in Carousel */}
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <label className="block text-white font-medium mb-2">
              Maximum Photos in Gallery
            </label>
            <input
              type="number"
              min="10"
              max="100"
              value={values.maxPhotosInCarousel}
              onChange={(e) => handleNumberChange('maxPhotosInCarousel', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 text-white rounded border border-zinc-700 focus:border-zinc-500 focus:outline-none"
            />
            <p className="text-zinc-400 text-sm mt-1">
              Maximum number of photos to keep in the carousel (10-100)
            </p>
          </div>

          {/* Gallery Page Size */}
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <label className="block text-white font-medium mb-2">
              Gallery Page Size
            </label>
            <input
              type="number"
              min="5"
              max="100"
              value={values.galleryPageSize}
              onChange={(e) => handleNumberChange('galleryPageSize', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 text-white rounded border border-zinc-700 focus:border-zinc-500 focus:outline-none"
            />
            <p className="text-zinc-400 text-sm mt-1">
              Number of photos to load per page in the gallery (5-100)
            </p>
          </div>

          {/* Before/After Slider Initial Position */}
          <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <label className="block text-white font-medium mb-2">
              Before/After Slider Initial Position (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={values.beforeAfterSliderPosition}
              onChange={(e) => handleNumberChange('beforeAfterSliderPosition', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-800 text-white rounded border border-zinc-700 focus:border-zinc-500 focus:outline-none"
            />
            <p className="text-zinc-400 text-sm mt-1">
              Initial position of comparison slider (0=left/original, 100=right/transformed)
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={() => onSave(values)}
        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-lg hover:shadow-red-600/20"
      >
        Save UI Settings
      </button>
    </div>
  );
};