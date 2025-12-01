import React, { useState } from 'react';
import type { ConfigTabProps } from './types';

export const ConfigTab: React.FC<ConfigTabProps> = ({ features, onSave }) => {
  const [values, setValues] = useState(features);

  const toggleFeature = (key: keyof typeof features) => {
    setValues({ ...values, [key]: !values[key] });
  };

  const getFeatureDescription = (key: string) => {
    switch (key) {
      case 'enableWebSockets':
        return 'Enable real-time updates via WebSockets';
      case 'enableDebugMode':
        return 'Show debug information in console';
      case 'enableMetrics':
        return 'Collect usage metrics';
      case 'enablePhotoExport':
        return 'Allow users to export photos';
      case 'enableBulkDelete':
        return 'Enable bulk photo deletion';
      case 'enableDeletePicture':
        return 'Show delete buttons on photos in gallery and detail view';
      case 'showBeforeAfterInfo':
        return 'Display photo information in Before & After comparison panel';
      case 'showDownloadButtons':
        return 'Show download buttons in Before & After comparison panel';
      default:
        return '';
    }
  };

  const getFeatureTitle = (key: string) => {
    switch (key) {
      case 'enableWebSockets':
        return 'WebSockets';
      case 'enableDebugMode':
        return 'Debug Mode';
      case 'enableMetrics':
        return 'Metrics';
      case 'enablePhotoExport':
        return 'Photo Export';
      case 'enableBulkDelete':
        return 'Bulk Delete';
      case 'enableDeletePicture':
        return 'Delete Picture';
      case 'showBeforeAfterInfo':
        return 'Before & After Info';
      case 'showDownloadButtons':
        return 'Download Buttons';
      default:
        return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {Object.entries(values).map(([key, enabled]) => (
          <div key={key} className="flex items-center justify-between bg-zinc-900 rounded-lg p-4 border border-zinc-800">
            <div>
              <h4 className="text-white font-medium">
                {getFeatureTitle(key)}
              </h4>
              <p className="text-zinc-400 text-sm">
                {getFeatureDescription(key)}
              </p>
            </div>
            <button
              onClick={() => toggleFeature(key as keyof typeof features)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                enabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-400'
              }`}
            >
              {enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSave(values)}
        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-lg hover:shadow-red-600/20"
      >
        Save Configuration
      </button>
    </div>
  );
};